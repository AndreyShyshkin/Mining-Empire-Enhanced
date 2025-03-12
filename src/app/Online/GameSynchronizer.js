import {
	getDatabase,
	ref,
	set,
	get,
	update,
	onValue,
	off,
	onDisconnect,
	remove,
	serverTimestamp,
} from 'firebase/database'
import { Player } from '../Entities/Player'
import { Vector2 } from '../Math/Vector2'
import { SaveManager } from '../Logic/SaveManager'
import { CreateImageByPath } from '../Logic/RenderImage'
import { Canvas } from '../Graphics/Canvas/Canvas'

export class GameSynchronizer {
	constructor(user, worldId, player, sceneManager) {
		this.user = user
		this.worldId = worldId
		this.player = player
		this.sceneManager = sceneManager
		this.db = getDatabase()

		// References
		this.worldRef = ref(this.db, `worlds/${worldId}`)
		this.playersRef = ref(this.db, `worlds/${worldId}/players`)
		this.userPlayerRef = ref(this.db, `worlds/${worldId}/players/${user.uid}`)

		// Map to track other players
		this.otherPlayers = new Map()

		// Status tracking
		this.isActive = false
		this.lastSync = 0
		this.syncInterval = 100 // milliseconds between position updates

		// Bind methods to keep 'this' context
		this.updatePlayerPosition = this.updatePlayerPosition.bind(this)
		this.setupPlayerListeners = this.setupPlayerListeners.bind(this)
		this.handlePlayerJoined = this.handlePlayerJoined.bind(this)
		this.handlePlayerLeft = this.handlePlayerLeft.bind(this)
		this.handlePlayerMoved = this.handlePlayerMoved.bind(this)
		this.cleanup = this.cleanup.bind(this)
	}

	// Start the synchronization
	async start() {
		if (this.isActive) return

		try {
			console.log('Starting game synchronization for world:', this.worldId)

			// Register the player with the world
			await this.registerPlayer()

			// Setup presence detection
			await this.setupPresence()

			// Listen for changes to other players
			this.setupPlayerListeners()

			// Start position update loop
			this.isActive = true
			this.updateLoop()

			// Show notification
			SaveManager.showNotification('Connected to online world')
		} catch (error) {
			console.error('Error starting game sync:', error)
			SaveManager.showNotification('Failed to connect to online world')
		}
	}

	// Register the player with their initial data
	async registerPlayer() {
		const playerData = {
			displayName: this.user.displayName || this.user.email || 'Player',
			position: {
				x: this.player.Position.X,
				y: this.player.Position.Y,
			},
			lastActive: serverTimestamp(),
			online: true,
		}

		await set(this.userPlayerRef, playerData)
	}

	// Setup Firebase presence system
	async setupPresence() {
		// Set up disconnect handlers
		const onDisconnectRef = onDisconnect(this.userPlayerRef)

		// Update online status on disconnect
		await onDisconnectRef.update({
			online: false,
			lastActive: serverTimestamp(),
		})
	}

	// Set up listeners for other players
	setupPlayerListeners() {
		onValue(this.playersRef, snapshot => {
			if (!snapshot.exists()) return

			const players = snapshot.val()

			// Check for new or updated players
			for (const [playerId, playerData] of Object.entries(players)) {
				// Skip self
				if (playerId === this.user.uid) continue

				// If player is online and we're not tracking them yet
				if (playerData.online && !this.otherPlayers.has(playerId)) {
					this.handlePlayerJoined(playerId, playerData)
				}
				// If player is already being tracked
				else if (this.otherPlayers.has(playerId)) {
					// If player went offline, remove them
					if (!playerData.online) {
						this.handlePlayerLeft(playerId)
					}
					// Otherwise update their position
					else {
						this.handlePlayerMoved(playerId, playerData)
					}
				}
			}

			// Check for players who left (no longer in the data)
			for (const playerId of this.otherPlayers.keys()) {
				if (!players[playerId]) {
					this.handlePlayerLeft(playerId)
				}
			}
		})
	}

	// Handle a new player joining
	handlePlayerJoined(playerId, playerData) {
		console.log('Player joined:', playerData.displayName)

		// Create a visual representation for this player
		const otherPlayerImg = CreateImageByPath('./assets/img/player2.png') // Use a different sprite

		// Position from data or default
		const position = playerData.position
			? new Vector2(playerData.position.x, playerData.position.y)
			: new Vector2(920, 500)

		// Create a player entity
		const otherPlayer = new Player(
			position,
			new Vector2(80, 80), // Same size as main player
			otherPlayerImg,
			3, // Same layer
			Vector2.Zero, // No initial velocity
			this.sceneManager,
			playerId // Use their ID as name
		)

		// Add the player entity to our tracking Map
		this.otherPlayers.set(playerId, {
			id: playerId,
			entity: otherPlayer,
			displayName: playerData.displayName,
			lastUpdated: Date.now(),
		})

		// Add to the scene so they get rendered
		this.sceneManager.currentScene.Entities.push(otherPlayer)

		// Show notification
		SaveManager.showNotification(`${playerData.displayName} joined the game`)
	}

	// Handle a player leaving
	handlePlayerLeft(playerId) {
		const playerInfo = this.otherPlayers.get(playerId)
		if (!playerInfo) return

		console.log('Player left:', playerInfo.displayName)

		// Remove from scene
		const entityIndex = this.sceneManager.currentScene.Entities.findIndex(
			e => e === playerInfo.entity
		)

		if (entityIndex !== -1) {
			this.sceneManager.currentScene.Entities.splice(entityIndex, 1)
		}

		// Remove from our tracking
		this.otherPlayers.delete(playerId)

		// Show notification
		SaveManager.showNotification(`${playerInfo.displayName} left the game`)
	}

	// Handle a player's position update
	handlePlayerMoved(playerId, playerData) {
		const playerInfo = this.otherPlayers.get(playerId)
		if (!playerInfo || !playerData.position) return

		// Update the player's position
		playerInfo.entity.Position.X = playerData.position.x
		playerInfo.entity.Position.Y = playerData.position.y

		// Update last updated timestamp
		playerInfo.lastUpdated = Date.now()
	}

	// Update player position in Firebase
	updatePlayerPosition() {
		const now = Date.now()
		// Check if we need to sync (based on time elapsed)
		if (now - this.lastSync < this.syncInterval) return

		// Update timestamp
		this.lastSync = now

		// Only update if position has changed
		if (
			this.lastX === this.player.Position.X &&
			this.lastY === this.player.Position.Y
		) {
			return
		}

		// Save current position
		this.lastX = this.player.Position.X
		this.lastY = this.player.Position.Y

		// Update in Firebase
		update(this.userPlayerRef, {
			position: {
				x: this.player.Position.X,
				y: this.player.Position.Y,
			},
			lastActive: serverTimestamp(),
		}).catch(error => {
			console.error('Error updating player position:', error)
		})
	}

	// The update loop
	updateLoop() {
		if (!this.isActive) return

		// Update player position in Firebase
		this.updatePlayerPosition()

		// Schedule next update
		requestAnimationFrame(() => this.updateLoop())
	}

	// Draw player names above other players
	drawPlayerNames(context) {
		if (!this.isActive) return

		for (const [_, playerInfo] of this.otherPlayers) {
			const entity = playerInfo.entity
			const displayName = playerInfo.displayName

			// Draw name above player
			context.font = '14px Arial'
			context.fillStyle = 'white'
			context.textAlign = 'center'
			context.strokeStyle = 'black'
			context.lineWidth = 3

			const x = entity.Position.X - Player.Camera.X + entity.Size.X / 2
			const y = entity.Position.Y - Player.Camera.Y - 10

			// Draw text stroke for better visibility
			context.strokeText(displayName, x, y)
			context.fillText(displayName, x, y)
		}
	}

	// Clean up listeners when no longer needed
	cleanup() {
		if (!this.isActive) return

		console.log('Cleaning up game sync')

		// Set player offline
		update(this.userPlayerRef, {
			online: false,
			lastActive: serverTimestamp(),
		}).catch(console.error)

		// Remove all listeners
		off(this.playersRef)

		// Clear tracking
		for (const [playerId, playerInfo] of this.otherPlayers) {
			this.handlePlayerLeft(playerId)
		}

		this.otherPlayers.clear()
		this.isActive = false

		console.log('Game sync cleaned up')
	}
}
