// filepath: /Users/andrewshyshkin/Documents/work/Mining-Empire-Enhanced/src/app/Online/GameSynchronizer.js
import { io } from 'socket.io-client'
import { Player } from '../Entities/Player'
import { CreateImageByPath } from '../Logic/RenderImage'
import { SaveManager } from '../Logic/SaveManager'
import { Vector2 } from '../Math/Vector2'

export class GameSynchronizer {
	constructor(
		user,
		worldId,
		player,
		sceneManager,
		seed = null,
		initialState = null
	) {
		this.user = user
		this.worldId = worldId
		this.player = player
		this.sceneManager = sceneManager
		this.seed = seed
		this.initialState = initialState

		// Socket.io connection
		this.socket = null

		// Current player location (village or cave)
		this.currentLocation = 'village' // Default location

		// Map to track other players
		this.otherPlayers = new Map()

		// Status tracking
		this.isActive = false
		this.lastSync = 0
		this.syncInterval = 100 // milliseconds between position updates

		// Initialize position tracking variables
		this.lastX = 0
		this.lastY = 0

		// Track world state changes (broken blocks, etc.)
		this.worldChanges = new Set()

		// Bind methods to keep 'this' context
		this.updatePlayerPosition = this.updatePlayerPosition.bind(this)
		this.handlePlayerJoined = this.handlePlayerJoined.bind(this)
		this.handlePlayerLeft = this.handlePlayerLeft.bind(this)
		this.handlePlayerMoved = this.handlePlayerMoved.bind(this)
		this.handleWorldState = this.handleWorldState.bind(this)
		this.handlePlayerChangedLocation =
			this.handlePlayerChangedLocation.bind(this)
		this.handleLocationChange = this.handleLocationChange.bind(this)
		this.cleanup = this.cleanup.bind(this)
		this.handleWorldStateUpdated = this.handleWorldStateUpdated.bind(this)

		// Listen for location changes from SceneManager
		document.addEventListener('locationChange', this.handleLocationChange)
	}

	// Start the synchronization
	async start() {
		if (this.isActive) return

		try {
			console.log('Starting game synchronization for world:', this.worldId)

			// Verify player reference is valid
			if (!this.player) {
				console.error('Invalid player reference')
				SaveManager.showNotification(
					'Failed to start online game: player reference is invalid'
				)
				return
			}

			// Initialize default position values
			this.lastX = 0
			this.lastY = 0

			// Connect to Socket.io server
			const serverUrl = 'http://localhost:3000' // Change to your server URL in production
			this.socket = io(serverUrl)

			// Setup socket event handlers
			this.setupSocketHandlers()

			// Wait for connection before proceeding
			await new Promise(resolve => {
				if (this.socket.connected) {
					resolve()
				} else {
					this.socket.on('connect', resolve)
				}
			})

			// Join the world
			this.joinWorld()

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

	// Setup socket event handlers
	setupSocketHandlers() {
		// Connection events
		this.socket.on('connect', () => {
			console.log('Connected to server with ID:', this.socket.id)
		})

		this.socket.on('disconnect', () => {
			console.log('Disconnected from server')
			SaveManager.showNotification('Disconnected from online world')
			this.isActive = false
		})

		this.socket.on('connect_error', error => {
			console.error('Connection error:', error)
			SaveManager.showNotification('Failed to connect to game server')
		})

		// Game events
		this.socket.on('world_state', this.handleWorldState)
		this.socket.on('player_joined', ({ playerId, playerInfo }) => {
			this.handlePlayerJoined(playerId, playerInfo)
		})

		this.socket.on('player_left', ({ playerId }) => {
			this.handlePlayerLeft(playerId)
		})

		this.socket.on('player_moved', ({ playerId, position, location }) => {
			this.handlePlayerMoved(playerId, { position, location })
		})

		this.socket.on('player_changed_location', ({ playerId, location }) => {
			this.handlePlayerChangedLocation(playerId, location)
		})

		this.socket.on('world_state_updated', ({ updates, sourcePlayerId }) => {
			this.handleWorldStateUpdated({ updates, sourcePlayerId })
		})
	}

	// Join the world
	joinWorld() {
		console.log('Joining world:', this.worldId)
		this.socket.emit('join_world', {
			worldId: this.worldId,
			user: this.user,
			seed: this.seed,
			initialState: this.initialState,
		})
	}

	// Handle initial world state received from server
	handleWorldState({ seed, players, worldState }) {
		console.log('Received world state:', { seed, players })

		// Set the seed if we don't have it (joining another player's world)
		if (!this.seed && seed) {
			this.seed = seed
			// Update seed display in UI
			const seedDisplay = document.getElementById('seed-value')
			if (seedDisplay) {
				seedDisplay.textContent = seed
			}
		}

		// Process and spawn other players
		players.forEach(playerInfo => {
			if (
				playerInfo.id !== this.user.uid &&
				!this.otherPlayers.has(playerInfo.id)
			) {
				this.handlePlayerJoined(playerInfo.id, playerInfo)
			}
		})

		// Apply world state (resource depletion, etc.)
		if (worldState) {
			// Apply world state to your game
			// Implementation depends on your game's state management
			console.log('Applying world state:', worldState)
		}
	}

	// Handle a new player joining
	handlePlayerJoined(playerId, playerInfo) {
		console.log('Player joined:', playerInfo.displayName)

		// If player is already tracked, update their info
		if (this.otherPlayers.has(playerId)) {
			const existingPlayer = this.otherPlayers.get(playerId)
			// Update existing player info
			existingPlayer.displayName = playerInfo.displayName
			return
		}

		try {
			// Create a visual representation for this player
			const otherPlayerImg = CreateImageByPath(
				'./assets/img/Player/player2.png'
			) // Use a different sprite

			// Position from data or default
			const position = playerInfo.position
				? new Vector2(playerInfo.position.x, playerInfo.position.y)
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
				displayName: playerInfo.displayName,
				lastUpdated: Date.now(),
				location: playerInfo.location || 'village', // Default to village
			})

			// Only add to scene if they're in the same location
			if (
				!playerInfo.location ||
				playerInfo.location === this.currentLocation
			) {
				this.sceneManager.currentScene.Entities.push(otherPlayer)
			}

			// Show notification
			SaveManager.showNotification(`${playerInfo.displayName} joined the game`)
		} catch (error) {
			console.error('Error creating other player entity:', error)
		}
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

		try {
			// Update the player's position
			if (
				playerInfo.entity &&
				playerInfo.entity.transform &&
				playerInfo.entity.transform.Position
			) {
				playerInfo.entity.transform.Position.X = playerData.position.x
				playerInfo.entity.transform.Position.Y = playerData.position.y
			} else if (playerInfo.entity) {
				// If the entity doesn't have transform.Position set up correctly, set it up
				if (!playerInfo.entity.transform) {
					playerInfo.entity.transform = {
						Position: {
							X: playerData.position.x,
							Y: playerData.position.y,
						},
					}
				} else if (!playerInfo.entity.transform.Position) {
					playerInfo.entity.transform.Position = {
						X: playerData.position.x,
						Y: playerData.position.y,
					}
				}
			}

			// Update location if provided
			if (playerData.location) {
				playerInfo.location = playerData.location
			}

			// Update last updated timestamp
			playerInfo.lastUpdated = Date.now()
		} catch (error) {
			console.error('Error updating player position:', error, playerInfo)
		}
	}

	// Handle a player changing location (village/cave)
	handlePlayerChangedLocation(playerId, location) {
		const playerInfo = this.otherPlayers.get(playerId)
		if (!playerInfo) return

		console.log(
			`Player ${playerInfo.displayName} changed location to ${location}`
		)
		playerInfo.location = location

		// Remove player from current scene if locations don't match
		if (location !== this.currentLocation) {
			const entityIndex = this.sceneManager.currentScene.Entities.findIndex(
				e => e === playerInfo.entity
			)
			if (entityIndex !== -1) {
				this.sceneManager.currentScene.Entities.splice(entityIndex, 1)
			}
		}
		// Add player to current scene if they just moved to our location
		else if (location === this.currentLocation) {
			const entityIndex = this.sceneManager.currentScene.Entities.findIndex(
				e => e === playerInfo.entity
			)
			if (entityIndex === -1) {
				this.sceneManager.currentScene.Entities.push(playerInfo.entity)
			}
		}
	}

	// Handle location change event from SceneManager
	handleLocationChange(event) {
		if (!this.isActive || !this.socket) return

		const newLocation = event.detail.location
		if (newLocation === this.currentLocation) return

		console.log(
			`Changing location from ${this.currentLocation} to ${newLocation}`
		)
		this.currentLocation = newLocation

		// Notify server about location change
		this.socket.emit('change_location', { location: newLocation })

		// Update visible players based on new location
		this.updateVisiblePlayers()
	}

	// Set the player's current location and notify others
	setLocation(location) {
		if (this.currentLocation === location) return

		this.currentLocation = location
		console.log('Changed location to:', location)

		if (this.isActive && this.socket) {
			this.socket.emit('change_location', { location })

			// Update visible players based on location
			this.updateVisiblePlayers()
		}
	}

	// Update which players should be visible based on current location
	updateVisiblePlayers() {
		for (const [playerId, playerInfo] of this.otherPlayers.entries()) {
			const isInSameLocation = playerInfo.location === this.currentLocation
			const isInScene = this.sceneManager.currentScene.Entities.includes(
				playerInfo.entity
			)

			if (isInSameLocation && !isInScene) {
				// Add to scene if in same location but not in scene
				this.sceneManager.currentScene.Entities.push(playerInfo.entity)
			} else if (!isInSameLocation && isInScene) {
				// Remove from scene if in different location but in scene
				const entityIndex = this.sceneManager.currentScene.Entities.findIndex(
					e => e === playerInfo.entity
				)
				if (entityIndex !== -1) {
					this.sceneManager.currentScene.Entities.splice(entityIndex, 1)
				}
			}
		}
	}

	// Send world state updates to server
	updateWorldState(updates) {
		if (!this.isActive || !this.socket) return

		console.log('Sending world state updates:', updates)
		this.socket.emit('update_world_state', { updates })
	}

	// Process incoming world state updates from other players
	handleWorldStateUpdated(data) {
		if (!this.isActive) return

		const { updates, sourcePlayerId } = data
		console.log(`Received world update from player ${sourcePlayerId}:`, updates)

		// Handle broken blocks from other players
		if (updates.blockBroken) {
			for (const key in updates.blockBroken) {
				const blockData = updates.blockBroken[key]
				const { position } = blockData
				console.log(`Processing block broken at ${position.x}, ${position.y}`)
				// Mark the block as broken in world manager without notifying others again
				if (this.sceneManager.WorldManager) {
					// Add to world changes directly without emitting another update
					this.sceneManager.WorldManager.worldChanges.brokenBlocks[key] = true
				}
			}
		}

		// Handle opened chests from other players
		if (updates.chestOpened) {
			for (const key in updates.chestOpened) {
				const chestData = updates.chestOpened[key]
				const { position } = chestData
				console.log(`Processing chest opened at ${position.x}, ${position.y}`)
				if (this.sceneManager.WorldManager) {
					// Add to world changes directly without emitting another update
					this.sceneManager.WorldManager.worldChanges.openedChests[key] = true
				}
			}
		}

		// Handle ladder placements from other players
		if (updates.ladderPlaced) {
			for (const key in updates.ladderPlaced) {
				const ladderData = updates.ladderPlaced[key]
				const { position } = ladderData
				console.log(`Processing ladder placed at ${position.x}, ${position.y}`)
				if (this.sceneManager.WorldManager) {
					// Add to world changes directly without emitting another update
					this.sceneManager.WorldManager.worldChanges.placedLadders[key] = true
				}
			}
		}

		// Request scene redraw to show updated world state
		if (this.sceneManager && this.sceneManager.RequestRedraw) {
			this.sceneManager.RequestRedraw()
		}
	}

	// Update player position in server
	updatePlayerPosition() {
		const now = Date.now()
		// Check if we need to sync (based on time elapsed)
		if (now - this.lastSync < this.syncInterval) return

		// Update timestamp
		this.lastSync = now

		try {
			// Validate player object and transform.Position property exist
			if (
				!this.player ||
				!this.player.transform ||
				!this.player.transform.Position
			) {
				console.warn('Player or player position is not available')
				return
			}

			// Only update if position has changed
			if (
				this.lastX === this.player.transform.Position.X &&
				this.lastY === this.player.transform.Position.Y
			) {
				return
			}

			// Save current position
			this.lastX = this.player.transform.Position.X
			this.lastY = this.player.transform.Position.Y

			// Send to server
			if (this.socket) {
				this.socket.emit('update_position', {
					position: {
						x: this.player.transform.Position.X,
						y: this.player.transform.Position.Y,
					},
					location: this.currentLocation,
				})
			}
		} catch (error) {
			console.error('Error in updatePlayerPosition:', error)
		}
	}

	// The update loop
	updateLoop() {
		if (!this.isActive) return

		try {
			// Update player position in server
			this.updatePlayerPosition()
		} catch (error) {
			console.error('Error in update loop:', error)
		}

		// Schedule next update
		requestAnimationFrame(() => this.updateLoop())
	}

	// Draw player names above other players
	drawPlayerNames(context) {
		if (!this.isActive) return

		for (const [_, playerInfo] of this.otherPlayers.entries()) {
			// Only draw names for players in current scene
			if (playerInfo.location !== this.currentLocation) continue

			try {
				const entity = playerInfo.entity
				const displayName = playerInfo.displayName

				if (
					entity &&
					entity.transform &&
					entity.transform.Position &&
					entity.Size
				) {
					// Draw name above player
					context.font = '14px Arial'
					context.fillStyle = 'white'
					context.textAlign = 'center'
					context.strokeStyle = 'black'
					context.lineWidth = 3

					// Calculate position (this will need to match your camera system)
					let x, y

					if (Player.Camera) {
						x =
							entity.transform.Position.X + Player.Camera.X + entity.Size.X / 2
						y = entity.transform.Position.Y - Player.Camera.Y - 10
					} else {
						// Fallback if camera is not available
						x = entity.transform.Position.X + entity.Size.X / 2
						y = entity.transform.Position.Y - 10
					}

					// Draw text stroke for better visibility
					context.strokeText(displayName, x, y)
					context.fillText(displayName, x, y)
				}
			} catch (error) {
				console.error('Error drawing player name:', error, playerInfo)
			}
		}
	}

	// Clean up when no longer needed
	cleanup() {
		if (!this.isActive) return

		console.log('Cleaning up game sync')

		// Leave the world
		if (this.socket) {
			this.socket.emit('leave_world')
			this.socket.disconnect()
		}

		// Clear tracking
		for (const [playerId, playerInfo] of this.otherPlayers) {
			this.handlePlayerLeft(playerId)
		}

		this.otherPlayers.clear()
		this.isActive = false

		console.log('Game sync cleaned up')
	}
}
