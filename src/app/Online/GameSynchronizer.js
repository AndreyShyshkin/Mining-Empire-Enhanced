// filepath: /Users/andrewshyshkin/Documents/work/Mining-Empire-Enhanced/src/app/Online/GameSynchronizer.js
import { io } from 'socket.io-client'
import { Player } from '../Entities/Player'
import { CreateImageByPath } from '../Logic/RenderImage'
import { SaveManager } from '../Logic/SaveManager'
import { Vector2 } from '../Math/Vector2'
// Import the new SeedSynchronizer utility
import {
	fixSeedInconsistencies,
	verifySeedConsistency,
} from '../Logic/SeedSynchronizer'

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

		// Initialize seed with fallback values to prevent nulls
		if (seed && typeof seed === 'number') {
			this.seed = seed
		} else {
			// Try to retrieve from existing sources in order of preference
			if (
				typeof window !== 'undefined' &&
				window.globalGameSeed &&
				typeof window.globalGameSeed === 'number'
			) {
				this.seed = window.globalGameSeed
				console.log(
					`GameSynchronizer initialized with global seed: ${this.seed}`
				)
			} else if (typeof localStorage !== 'undefined') {
				try {
					const storedSeed = localStorage.getItem('mining-empire-seed')
					if (storedSeed && !isNaN(Number(storedSeed))) {
						this.seed = Number(storedSeed)
						console.log(
							`GameSynchronizer initialized with localStorage seed: ${this.seed}`
						)
					}
				} catch (err) {
					// Ignore localStorage errors
				}
			}

			// If still no seed, generate one
			if (!this.seed || typeof this.seed !== 'number') {
				this.seed = Math.floor(Math.random() * 2147483647)
				console.log(
					`GameSynchronizer initialized with new generated seed: ${this.seed}`
				)
			}

			// Ensure the seed is globally available
			if (typeof window !== 'undefined') {
				window.globalGameSeed = this.seed
			}
		}

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

		// Add retries counter for seed synchronization
		this.seedSyncRetries = 0
		this.maxSeedSyncRetries = 5

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
		this.updateSeedDisplay = this.updateSeedDisplay.bind(this)
		this.requestWorldStateSync = this.requestWorldStateSync.bind(this)
		this.scheduleWorldStateVerification =
			this.scheduleWorldStateVerification.bind(this)

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

			// Check if player's position is initialized
			if (!this.ensurePlayerPosition()) {
				console.log('Player position not initialized')
				// We'll continue and wait for it to be initialized later
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

			// Schedule periodic world state verification
			this.scheduleWorldStateVerification()

			// Start periodic world state verification
			this.scheduleWorldStateVerification()

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

		// New handler for seed confirmation
		this.socket.on('seed_confirmation', ({ seed }) => {
			console.log('Received seed confirmation:', seed)
			if (seed && typeof seed === 'number') {
				console.log(`Updating seed from confirmation: ${seed}`)
				this.seed = seed
				window.globalGameSeed = seed
				this.updateSeedDisplay(seed)

				// Update WorldManager's seed if it exists
				if (this.sceneManager && this.sceneManager.WorldManager) {
					this.sceneManager.WorldManager.setSeed(seed)
					console.log(
						`Updated WorldManager seed from server confirmation: ${seed}`
					)

					// Also ensure WorldMap has correct seed
					if (this.sceneManager.WorldManager.worldMap) {
						this.sceneManager.WorldManager.worldMap.initializeMap(seed)
						console.log(`Reinitialized WorldMap with confirmed seed: ${seed}`)
					}
				}

				// Store seed in localStorage as additional backup
				try {
					localStorage.setItem('mining-empire-seed', seed.toString())
					console.log('Stored seed in localStorage for redundancy')
				} catch (err) {
					console.warn('Failed to store seed in localStorage:', err)
				}
			}
		})

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
	handleWorldState({ seed, players, worldState, fullSync }) {
		console.log('Received world state:', {
			seed,
			players,
			worldState,
			fullSync,
		})

		// Validate and handle seed synchronization
		this.handleSeedSynchronization(seed)

		// CRITICAL FIX: Explicitly set the WorldManager seed now to prevent desync
		if (this.sceneManager && this.sceneManager.WorldManager) {
			const worldManager = this.sceneManager.WorldManager

			// Ensure WorldManager seed is synchronized
			if (worldManager.worldSeed !== this.seed) {
				console.log(
					`Explicitly setting WorldManager seed to ${this.seed} (was ${worldManager.worldSeed})`
				)
				worldManager.setSeed(this.seed)

				// Also update global seed reference
				window.globalGameSeed = this.seed

				// Force WorldMap to use the correct seed too
				if (worldManager.worldMap) {
					worldManager.worldMap.initializeMap(this.seed)
					console.log(`Re-initialized WorldMap with correct seed: ${this.seed}`)
				}
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

		// Apply world state with enhanced validation and reliability
		if (worldState) {
			console.log('Applying world state from host:', worldState)

			// Count changes before applying for logging
			const initialCounts = {
				brokenBlocks: 0,
				openedChests: 0,
				placedLadders: 0,
			}

			if (this.sceneManager && this.sceneManager.WorldManager) {
				const worldManager = this.sceneManager.WorldManager

				// Get initial counts for comparison
				if (worldManager.worldChanges) {
					initialCounts.brokenBlocks = Object.keys(
						worldManager.worldChanges.brokenBlocks || {}
					).length
					initialCounts.openedChests = Object.keys(
						worldManager.worldChanges.openedChests || {}
					).length
					initialCounts.placedLadders = Object.keys(
						worldManager.worldChanges.placedLadders || {}
					).length
				}

				// Import world changes with validation
				if (
					worldState.brokenBlocks &&
					typeof worldState.brokenBlocks === 'object'
				) {
					// Create a fresh object to ensure clean state
					const validatedBrokenBlocks = {}

					// Validate each broken block entry
					for (const key in worldState.brokenBlocks) {
						// Ensure we have valid keys in x,y format
						const keyParts = key.split(',')
						if (keyParts.length === 2) {
							const x = parseInt(keyParts[0])
							const y = parseInt(keyParts[1])

							if (!isNaN(x) && !isNaN(y)) {
								validatedBrokenBlocks[`${x},${y}`] = true
							}
						}
					}

					console.log(
						`Applying ${
							Object.keys(validatedBrokenBlocks).length
						} broken blocks from server`
					)
					worldManager.worldChanges.brokenBlocks = validatedBrokenBlocks
				}

				if (
					worldState.openedChests &&
					typeof worldState.openedChests === 'object'
				) {
					// Create a fresh object to ensure clean state
					const validatedOpenedChests = {}

					// Validate each chest entry
					for (const key in worldState.openedChests) {
						// Ensure we have valid keys in x,y format
						const keyParts = key.split(',')
						if (keyParts.length === 2) {
							const x = parseInt(keyParts[0])
							const y = parseInt(keyParts[1])

							if (!isNaN(x) && !isNaN(y)) {
								validatedOpenedChests[`${x},${y}`] = true
							}
						}
					}

					console.log(
						`Applying ${
							Object.keys(validatedOpenedChests).length
						} opened chests from server`
					)
					worldManager.worldChanges.openedChests = validatedOpenedChests
				}

				if (
					worldState.placedLadders &&
					typeof worldState.placedLadders === 'object'
				) {
					// Create a fresh object to ensure clean state
					const validatedPlacedLadders = {}

					// Validate each ladder entry
					for (const key in worldState.placedLadders) {
						// Ensure we have valid keys in x,y format
						const keyParts = key.split(',')
						if (keyParts.length === 2) {
							const x = parseInt(keyParts[0])
							const y = parseInt(keyParts[1])

							if (!isNaN(x) && !isNaN(y)) {
								validatedPlacedLadders[`${x},${y}`] = true
							}
						}
					}

					console.log(
						`Applying ${
							Object.keys(validatedPlacedLadders).length
						} placed ladders from server`
					)
					worldManager.worldChanges.placedLadders = validatedPlacedLadders
				}

				// Log the changes applied
				const finalCounts = {
					brokenBlocks: Object.keys(
						worldManager.worldChanges.brokenBlocks || {}
					).length,
					openedChests: Object.keys(
						worldManager.worldChanges.openedChests || {}
					).length,
					placedLadders: Object.keys(
						worldManager.worldChanges.placedLadders || {}
					).length,
				}

				console.log(
					'World state change summary:',
					`Broken blocks: ${initialCounts.brokenBlocks} → ${finalCounts.brokenBlocks}`,
					`Opened chests: ${initialCounts.openedChests} → ${finalCounts.openedChests}`,
					`Placed ladders: ${initialCounts.placedLadders} → ${finalCounts.placedLadders}`
				)

				// Force scene redraw to show synchronized world
				if (this.sceneManager.RequestRedraw) {
					this.sceneManager.RequestRedraw()
					console.log('Requested scene redraw to show updated world state')
				}
			}

			// Regenerate the current scene to show all synchronized changes
			this.regenerateCurrentScene()
		}
	}

	// Helper method to regenerate the current scene with synchronized data
	regenerateCurrentScene() {
		if (!this.sceneManager) return

		console.log('Regenerating current scene with synchronized world data')

		// Debug the current world state before regeneration
		if (this.sceneManager.WorldManager) {
			this.sceneManager.WorldManager.debugWorldState()
		}

		// Before regenerating, make sure we're on the latest world changes
		const worldManager = this.sceneManager.WorldManager
		if (worldManager) {
			// Make sure the correct seed is set
			if (this.seed && worldManager.worldSeed !== this.seed) {
				console.log(
					`Fixing mismatched seed (${worldManager.worldSeed} vs ${this.seed})`
				)
				worldManager.setSeed(this.seed)

				// Update global seed reference
				window.globalGameSeed = this.seed

				// Update UI seed display with retry mechanism
				const seedUpdated = this.updateSeedDisplay(this.seed)
				if (!seedUpdated) {
					// If update failed, schedule another attempt
					setTimeout(() => this.updateSeedDisplay(this.seed), 500)
				}

				// Ensure the seed is always correct in the WorldMap too
				if (worldManager.worldMap) {
					worldManager.worldMap.initializeMap(this.seed)
					console.log(
						'Reinitialized WorldMap with correct seed during scene regeneration'
					)
				}
			}
		}

		// Reload current scene to reflect synced world changes
		if (this.currentLocation === 'cave' && this.sceneManager.mine) {
			// Reset scene if needed
			this.sceneManager.mineInitialized = false
			console.log('Forcing cave regeneration with synchronized data')
			// Force cave regeneration
			this.sceneManager.SetScene(this.sceneManager.mine)
		} else if (this.currentLocation === 'village' && this.sceneManager.town) {
			console.log('Forcing village regeneration with synchronized data')
			// Force village regeneration
			this.sceneManager.SetScene(this.sceneManager.town)
		}

		// After regeneration, verify changes were applied
		setTimeout(() => {
			if (this.sceneManager.WorldManager) {
				console.log('Verifying world state after regeneration:')
				this.sceneManager.WorldManager.debugWorldState()
			}
		}, 100)
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

		// CRITICAL FIX: Perform comprehensive seed verification and fix before scene change
		// This is especially important when entering the cave (where world generation happens)
		if (newLocation === 'cave') {
			console.log(
				'🔍 CRITICAL: Performing comprehensive seed verification before cave entry'
			)

			// Use our new utility for thorough verification
			const verificationResult = verifySeedConsistency()

			// If any inconsistencies, fix them
			if (!verificationResult.allMatch) {
				console.warn(
					'⚠️ Seed inconsistencies detected before cave entry. Fixing...'
				)
				fixSeedInconsistencies(verificationResult)

				// Double-check to make sure our fix worked
				const recheck = verifySeedConsistency()
				if (!recheck.allMatch) {
					console.error(
						'❌ Failed to fix seed inconsistencies! This may cause world generation issues.'
					)
				} else {
					console.log(
						'✅ Successfully fixed seed inconsistencies before cave entry'
					)
				}
			} else {
				console.log('✅ Seed verification passed - all seeds are consistent')
			}
		}

		// Verify seed is properly set before changing location
		this.verifySeedIntegrity()

		// Notify server about location change
		this.socket.emit('change_location', { location: newLocation })

		// Update visible players based on new location
		this.updateVisiblePlayers()
	}

	// Verify seed integrity and sync if needed
	verifySeedIntegrity() {
		try {
			console.log('Verifying seed integrity during scene change...')
			let seedRecovered = false

			// Log the current seed status before verification
			console.log(`Current seed status before verification:
				- GameSynchronizer.seed: ${this.seed} (${typeof this.seed})
				- window.globalGameSeed: ${
					window.globalGameSeed
				} (${typeof window.globalGameSeed})
				- WorldManager.worldSeed: ${
					this.sceneManager?.WorldManager?.worldSeed
				} (${typeof this.sceneManager?.WorldManager?.worldSeed})
				- localStorage seed: ${localStorage.getItem('mining-empire-seed') || 'not set'}
			`)

			// Make sure we have a valid seed
			if (!this.seed || typeof this.seed !== 'number' || isNaN(this.seed)) {
				console.warn(`Invalid seed detected during scene change: ${this.seed}`)

				// Recovery strategy 1: Try to recover from global seed if available
				if (
					window.globalGameSeed &&
					typeof window.globalGameSeed === 'number'
				) {
					console.log(
						`Recovering seed from global context: ${window.globalGameSeed}`
					)
					this.seed = window.globalGameSeed
					seedRecovered = true
				}

				// Recovery strategy 2: Try to recover from WorldManager
				else if (
					this.sceneManager &&
					this.sceneManager.WorldManager &&
					typeof this.sceneManager.WorldManager.worldSeed === 'number'
				) {
					console.log(
						`Recovering seed from WorldManager: ${this.sceneManager.WorldManager.worldSeed}`
					)
					this.seed = this.sceneManager.WorldManager.worldSeed
					window.globalGameSeed = this.seed // Update global seed
					seedRecovered = true
				}

				// Recovery strategy 3: Try to recover from localStorage
				else if (typeof localStorage !== 'undefined') {
					try {
						const storedSeed = localStorage.getItem('mining-empire-seed')
						if (storedSeed && !isNaN(Number(storedSeed))) {
							const seedFromStorage = Number(storedSeed)
							console.log(
								`Recovering seed from localStorage: ${seedFromStorage}`
							)
							this.seed = seedFromStorage
							window.globalGameSeed = seedFromStorage
							seedRecovered = true
						}
					} catch (err) {
						console.warn(
							'Failed to access localStorage for seed recovery:',
							err
						)
					}
				}

				// Recovery strategy 4: Use seed from HTML display as fallback
				if (!seedRecovered) {
					const seedElement = document.getElementById('seed-value')
					if (
						seedElement &&
						seedElement.textContent &&
						!isNaN(Number(seedElement.textContent))
					) {
						const seedFromUI = Number(seedElement.textContent)
						console.log(`Recovering seed from UI element: ${seedFromUI}`)
						this.seed = seedFromUI
						window.globalGameSeed = seedFromUI
						seedRecovered = true
					}
				}

				// If all recovery attempts fail, generate an emergency seed
				if (!seedRecovered) {
					const emergencySeed = Math.floor(Math.random() * 2147483647)
					console.warn(
						`Could not recover seed from any source. Generating emergency seed: ${emergencySeed}`
					)
					this.seed = emergencySeed
					window.globalGameSeed = emergencySeed

					// Store the emergency seed in localStorage for future recovery
					try {
						localStorage.setItem('mining-empire-seed', emergencySeed.toString())
						console.log('Stored emergency seed in localStorage')
					} catch (err) {
						console.warn('Failed to store emergency seed in localStorage:', err)
					}
				}
			}

			// Perform comprehensive seed verification and synchronization
			if (this.sceneManager && this.sceneManager.WorldManager) {
				const worldManager = this.sceneManager.WorldManager

				// First run seed consistency verification to detect any issues
				console.log('Performing comprehensive seed verification...')

				// If we have the new verification method, use it for thorough checking
				if (typeof worldManager.verifySeedConsistency === 'function') {
					const verifyResult = worldManager.verifySeedConsistency()
					if (!verifyResult.allMatch) {
						console.log('Seed inconsistencies were detected and fixed')

						// Update our local seed if it's invalid but WorldManager now has a valid one
						if (!this.seed || typeof this.seed !== 'number') {
							if (typeof worldManager.worldSeed === 'number') {
								console.log(
									`Updating GameSynchronizer seed from WorldManager: ${worldManager.worldSeed}`
								)
								this.seed = worldManager.worldSeed
							}
						}
					}
				}
				// Otherwise use the standard approach
				else if (this.seed && worldManager.worldSeed !== this.seed) {
					console.warn(
						`Seed mismatch detected! GameSynchronizer: ${this.seed}, WorldManager: ${worldManager.worldSeed}`
					)
					worldManager.setSeed(this.seed)
					console.log(`Fixed WorldManager seed to: ${this.seed}`)

					// Also ensure WorldMap has correct seed
					if (worldManager.worldMap) {
						worldManager.worldMap.initializeMap(this.seed)
						console.log(`Reinitialized WorldMap with seed: ${this.seed}`)
					}
				}

				// Ensure seed is displayed properly in UI
				this.updateSeedDisplay(this.seed)

				// Double check WorldManager seed one more time
				if (this.seed && worldManager.worldSeed !== this.seed) {
					console.error(
						`Critical seed mismatch still exists after fix attempt!`
					)
					// Force fix as last resort
					worldManager.setSeed(this.seed)
				}
			}

			// Request seed confirmation from server
			if (this.socket && this.isActive) {
				this.socket.emit('request_seed_confirmation', {
					currentSeed: this.seed, // Send our current seed to help server reconcile
				})
				console.log(
					`Requested seed confirmation from server with current seed: ${this.seed}`
				)
			}
		} catch (error) {
			console.error('Error verifying seed integrity:', error)
		}
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

	// Process incoming world state updates from other players with enhanced reliability
	handleWorldStateUpdated(data) {
		if (!this.isActive) return

		const { updates, sourcePlayerId, timestamp, seed } = data
		console.log(`Received world update from player ${sourcePlayerId}:`, updates)

		// Verify the seed in the update and sync if needed
		this.verifySeedInWorldUpdate(data)

		let worldChanged = false

		// Check if server included a seed in the update for verification
		if (seed && typeof seed === 'number') {
			// If our seed doesn't match the server's seed, update it
			if (this.seed !== seed) {
				console.warn(
					`Seed mismatch detected in world update. Local: ${this.seed}, Server: ${seed}`
				)
				this.seed = seed
				window.globalGameSeed = seed

				// Update WorldManager
				if (this.sceneManager && this.sceneManager.WorldManager) {
					this.sceneManager.WorldManager.setSeed(seed)
				}

				// Update UI
				this.updateSeedDisplay(seed)
				console.log(`Synchronized seed to server value: ${seed}`)
			}
		}

		// Verify seed in world update
		this.verifySeedInWorldUpdate(data)

		// Safe access to WorldManager
		if (!this.sceneManager || !this.sceneManager.WorldManager) {
			console.error(
				'Cannot process world state update: WorldManager not available'
			)
			return
		}

		const worldManager = this.sceneManager.WorldManager

		// Apply world changes using our enhanced consistent method
		try {
			// Apply changes with enhanced consistency checks
			worldChanged = this.applyWorldChangesConsistently(updates)

			if (worldChanged) {
				console.log(
					'Successfully applied world changes with consistency checks'
				)
			}
		} catch (error) {
			console.error('Error processing world state update:', error)
		}

		// Verify the world state after updates
		if (worldChanged && this.sceneManager.WorldManager) {
			this.sceneManager.WorldManager.debugWorldState()
		}

		// If world has changed, force regeneration of the scene to apply changes
		if (worldChanged) {
			console.log('World state changed, applying changes immediately')

			// Request scene redraw first to show immediate updates
			if (this.sceneManager && this.sceneManager.RequestRedraw) {
				try {
					this.sceneManager.RequestRedraw()
					console.log('Scene redraw requested')
				} catch (err) {
					console.error('Failed to request scene redraw:', err)
				}
			}

			// For blocks in current view, apply immediate visual changes
			try {
				this.applyImmediateVisualUpdates(updates)
				console.log('Applied immediate visual updates')
			} catch (err) {
				console.error('Error applying immediate visual updates:', err)
			}

			// Force immediate UI update if needed
			if (document.dispatchEvent) {
				try {
					// Create a custom event that can be used to trigger UI updates
					const worldChangeEvent = new CustomEvent('worldStateChanged', {
						detail: { changes: updates, sourcePlayerId },
					})
					document.dispatchEvent(worldChangeEvent)
					console.log('Dispatched worldStateChanged event')
				} catch (err) {
					console.error('Error dispatching world state change event:', err)
				}
			}

			// Use a progressive approach to scene regeneration
			// First attempt a light refresh
			if (this.sceneManager && this.sceneManager.refreshCurrentScene) {
				try {
					this.sceneManager.refreshCurrentScene()
					console.log('Initial scene refresh completed')
				} catch (err) {
					console.error('Error refreshing scene:', err)
				}
			}

			// Then do a full regeneration with a delay
			setTimeout(() => {
				try {
					console.log('Performing full scene regeneration')
					this.regenerateCurrentScene()
				} catch (err) {
					console.error('Error during scene regeneration:', err)
				}
			}, 300)
		}
	}

	// Apply immediate visual updates to the scene for blocks that are currently visible
	applyImmediateVisualUpdates(updates) {
		if (!this.sceneManager || !this.sceneManager.currentScene) {
			console.warn('Cannot apply visual updates: No current scene available')
			return
		}

		try {
			// If we're in the cave scene, handle blocks and ladders immediately
			if (this.currentLocation === 'cave') {
				const currentScene = this.sceneManager.currentScene

				// Handle immediate block removal
				if (updates.blockBroken && Array.isArray(currentScene.Blocks)) {
					console.log('Attempting to immediately update visible blocks')

					let removedBlockCount = 0

					for (const key in updates.blockBroken) {
						try {
							const blockData = updates.blockBroken[key]
							if (!blockData || !blockData.position) {
								console.warn(`Invalid block data for key ${key}`)
								continue
							}

							const { position } = blockData
							const targetX = Math.floor(position.x)
							const targetY = Math.floor(position.y)

							// Try to find any blocks at this position and mark them for removal
							const blocksToRemove = currentScene.Blocks.filter(block => {
								try {
									if (block && block.transform && block.transform.Position) {
										const blockX = Math.floor(block.transform.Position.X)
										const blockY = Math.floor(block.transform.Position.Y)
										return blockX === targetX && blockY === targetY
									}
									return false
								} catch (err) {
									console.warn('Error checking block position:', err)
									return false
								}
							})

							if (blocksToRemove.length > 0) {
								console.log(
									`Found ${blocksToRemove.length} visible blocks to immediately remove at ${targetX},${targetY}`
								)

								// Remove blocks from the scene's Blocks array
								blocksToRemove.forEach(block => {
									const index = currentScene.Blocks.indexOf(block)
									if (index !== -1) {
										currentScene.Blocks.splice(index, 1)
										removedBlockCount++
									}
								})
							}
						} catch (err) {
							console.error(
								`Error processing block update for key ${key}:`,
								err
							)
						}
					}

					console.log(
						`Immediately removed ${removedBlockCount} blocks from scene`
					)
				}

				// Handle immediate ladder addition
				if (updates.ladderPlaced && Array.isArray(currentScene.Objects)) {
					console.log('Attempting to immediately update visible ladders')
					let ladderUpdates = 0

					// For each ladder placement, check if we need to add it to the scene
					for (const key in updates.ladderPlaced) {
						try {
							const ladderData = updates.ladderPlaced[key]
							if (!ladderData || !ladderData.position) {
								console.warn(`Invalid ladder data for key ${key}`)
								continue
							}

							const { position } = ladderData
							const targetX = Math.floor(position.x)
							const targetY = Math.floor(position.y)

							// Check if this ladder is already in the scene
							const existingLadder = currentScene.Objects.find(obj => {
								try {
									if (
										obj &&
										obj.isLadder &&
										obj.transform &&
										obj.transform.Position
									) {
										const ladderX = Math.floor(obj.transform.Position.X)
										const ladderY = Math.floor(obj.transform.Position.Y)
										return ladderX === targetX && ladderY === targetY
									}
									return false
								} catch (err) {
									console.warn('Error checking ladder position:', err)
									return false
								}
							})

							if (!existingLadder) {
								console.log(
									`Need to add ladder at ${targetX},${targetY} - will be added during regeneration`
								)
								ladderUpdates++
							}
						} catch (err) {
							console.error(
								`Error processing ladder update for key ${key}:`,
								err
							)
						}
					}

					if (ladderUpdates > 0) {
						console.log(`Processed ${ladderUpdates} ladder updates`)
					}
				}
			}

			// If we're in village, handle chest opening
			if (this.currentLocation === 'village' && updates.chestOpened) {
				console.log('Attempting to immediately update visible chests')

				const currentScene = this.sceneManager.currentScene
				let chestUpdates = 0

				// Try to find and update any visible chests in the scene's Objects array
				if (Array.isArray(currentScene.Objects)) {
					for (const key in updates.chestOpened) {
						try {
							const chestData = updates.chestOpened[key]
							if (!chestData || !chestData.position) {
								console.warn(`Invalid chest data for key ${key}`)
								continue
							}

							const { position } = chestData
							const targetX = Math.floor(position.x)
							const targetY = Math.floor(position.y)

							// Find chests by position and update their state
							currentScene.Objects.forEach(obj => {
								try {
									// Check if this object is a chest at the target position
									if (
										obj &&
										obj.isChest &&
										obj.transform &&
										obj.transform.Position
									) {
										const objX = Math.floor(obj.transform.Position.X)
										const objY = Math.floor(obj.transform.Position.Y)

										if (objX === targetX && objY === targetY) {
											// Mark the chest as opened
											obj.isOpened = true

											// Update the chest's visual state if it has an updateVisuals method
											if (typeof obj.updateVisuals === 'function') {
												obj.updateVisuals()
											}

											chestUpdates++
											console.log(`Updated chest at ${targetX},${targetY}`)
										}
									}
								} catch (err) {
									console.warn('Error updating chest object:', err)
								}
							})
						} catch (err) {
							console.error(
								`Error processing chest update for key ${key}:`,
								err
							)
						}
					}

					if (chestUpdates > 0) {
						console.log(`Updated ${chestUpdates} chests in the scene`)
					}
				}
			}
		} catch (error) {
			console.error('Error applying immediate visual updates:', error)
		}
	}

	// Enhanced method for ensuring consistent application of world state changes across clients
	applyWorldChangesConsistently(updates) {
		if (!this.sceneManager || !this.sceneManager.WorldManager) {
			console.warn('Cannot apply world changes: WorldManager not available')
			return false
		}

		const worldManager = this.sceneManager.WorldManager
		let changesApplied = false

		try {
			console.log('Applying world changes with enhanced consistency checks')

			// Process broken blocks with data normalization
			if (updates.blockBroken) {
				for (const key in updates.blockBroken) {
					try {
						const blockData = updates.blockBroken[key]
						if (!blockData || !blockData.position) continue

						// Ensure coordinates are normalized to whole numbers
						const x = Math.floor(blockData.position.x)
						const y = Math.floor(blockData.position.y)
						const normalizedKey = `${x},${y}`

						// Only mark block as broken if not already broken
						if (!worldManager.isBlockBroken(x, y)) {
							worldManager.worldChanges.brokenBlocks[normalizedKey] = true
							console.log(`Applied block break at ${x},${y}`)
							changesApplied = true
						}
					} catch (err) {
						console.error(`Error applying block break:`, err)
					}
				}
			}

			// Process opened chests with data normalization
			if (updates.chestOpened) {
				for (const key in updates.chestOpened) {
					try {
						const chestData = updates.chestOpened[key]
						if (!chestData || !chestData.position) continue

						// Ensure coordinates are normalized to whole numbers
						const x = Math.floor(chestData.position.x)
						const y = Math.floor(chestData.position.y)
						const normalizedKey = `${x},${y}`

						// Only mark chest as opened if not already opened
						if (!worldManager.isChestOpened(x, y)) {
							worldManager.worldChanges.openedChests[normalizedKey] = true
							console.log(`Applied chest open at ${x},${y}`)
							changesApplied = true
						}
					} catch (err) {
						console.error(`Error applying chest open:`, err)
					}
				}
			}

			// Process ladder placements with data normalization
			if (updates.ladderPlaced) {
				for (const key in updates.ladderPlaced) {
					try {
						const ladderData = updates.ladderPlaced[key]
						if (!ladderData || !ladderData.position) continue

						// Ensure coordinates are normalized to whole numbers
						const x = Math.floor(ladderData.position.x)
						const y = Math.floor(ladderData.position.y)
						const normalizedKey = `${x},${y}`

						// Only add ladder if not already placed
						if (!worldManager.hasLadder(x, y)) {
							worldManager.worldChanges.placedLadders[normalizedKey] = true
							console.log(`Applied ladder placement at ${x},${y}`)
							changesApplied = true
						}
					} catch (err) {
						console.error(`Error applying ladder placement:`, err)
					}
				}
			}

			// If we applied changes, periodically verify our state with the server
			if (changesApplied) {
				// Schedule a verification in the near future to ensure we're in sync
				setTimeout(() => {
					// Request seed confirmation to verify our world seed is correct
					if (this.socket && this.isActive) {
						this.socket.emit('request_seed_confirmation', {
							currentSeed: this.seed,
						})

						// Also request a full sync occasionally
						if (Math.random() < 0.3) {
							// 30% chance to do a full sync
							this.requestWorldStateSync()
						}
					}
				}, 5000) // Check after 5 seconds
			}

			return changesApplied
		} catch (err) {
			console.error('Error in applyWorldChangesConsistently:', err)
			return false
		}
	}

	// Initialize or update the player's position values with safe defaults if needed
	ensurePlayerPosition() {
		if (!this.player) {
			console.warn(
				'Player reference is not available for position initialization'
			)
			return false
		}

		// Create transform if it doesn't exist
		if (!this.player.transform) {
			console.log('Creating transform object for player')
			this.player.transform = {}
		}

		// Create Position object if it doesn't exist
		if (!this.player.transform.Position) {
			console.log('Creating Position object for player')
			this.player.transform.Position = {
				X: 920, // Default X position
				Y: 500, // Default Y position
			}
		}

		// Ensure X and Y values exist
		if (typeof this.player.transform.Position.X === 'undefined') {
			console.log('Setting default X position for player')
			this.player.transform.Position.X = 920
		}

		if (typeof this.player.transform.Position.Y === 'undefined') {
			console.log('Setting default Y position for player')
			this.player.transform.Position.Y = 500
		}

		return true
	}

	// Update player position in server
	updatePlayerPosition() {
		const now = Date.now()
		// Check if we need to sync (based on time elapsed)
		if (now - this.lastSync < this.syncInterval) return

		// Update timestamp
		this.lastSync = now

		try {
			// Validate player object exists
			if (!this.player) {
				console.warn('Player reference is not available')
				return
			}

			// Validate transform exists
			if (!this.player.transform) {
				console.warn('Player transform is not available')
				return
			}

			// Validate Position property exists
			if (!this.player.transform.Position) {
				console.warn('Player position is not available')
				return
			}

			// Check that Position.X and Position.Y are valid numbers
			if (
				typeof this.player.transform.Position.X === 'undefined' ||
				typeof this.player.transform.Position.Y === 'undefined'
			) {
				console.log(
					'Player position coordinates not initialized yet:',
					this.player.transform.Position
				)
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

		// Clear world state verification timer
		if (this.worldStateVerificationTimer) {
			clearInterval(this.worldStateVerificationTimer)
			this.worldStateVerificationTimer = null
		}

		console.log('Game sync cleaned up')
	}

	// New method to ensure seed is properly displayed in UI
	updateSeedDisplay(seed) {
		if (!seed) {
			console.error('Attempted to update seed display with invalid seed:', seed)
			return false
		}

		console.log(`Attempting to update seed display with seed: ${seed}`)
		let updated = false

		// Update global seed variable for consistency
		if (window.globalGameSeed !== seed) {
			window.globalGameSeed = seed
			console.log('Updated window.globalGameSeed to:', seed)
		}

		// Try multiple approaches to update the UI

		// Approach 1: Using getElementById
		const seedDisplayById = document.getElementById('seed-value')
		if (seedDisplayById) {
			seedDisplayById.textContent = seed.toString()
			console.log('Updated seed display via getElementById:', seed)
			updated = true
		}

		// Approach 2: Using querySelector as fallback
		const seedDisplayByQuery = document.querySelector('#seed-value')
		if (seedDisplayByQuery && seedDisplayByQuery !== seedDisplayById) {
			seedDisplayByQuery.textContent = seed.toString()
			console.log('Updated seed display via querySelector:', seed)
			updated = true
		}

		// Approach 3: Direct manipulation of HTML if the element exists
		if (!updated) {
			const seedDisplayParent = document.querySelector('.seed-display')
			if (seedDisplayParent) {
				// Create a new span if the target element doesn't exist
				const existingSpan = seedDisplayParent.querySelector('#seed-value')
				if (existingSpan) {
					existingSpan.textContent = seed.toString()
					updated = true
				} else {
					seedDisplayParent.innerHTML = `Seed: <span id="seed-value">${seed}</span>`
					updated = true
				}
				console.log('Updated seed display via parent element:', seed)
			}
		}

		// Approach 4: Using global function if available
		if (
			window.updateSeedDisplay &&
			typeof window.updateSeedDisplay === 'function'
		) {
			window.updateSeedDisplay(seed)
			console.log('Called global updateSeedDisplay function')
			updated = true
		}

		// Log success or failure
		if (updated) {
			console.log('Successfully updated seed display in UI')
			return true
		} else {
			console.warn('Failed to update seed display in UI, will retry later')
			return false
		}
	}

	// Check if the incoming world update includes a seed to verify
	verifySeedInWorldUpdate(data) {
		const { seed } = data
		if (seed && typeof seed === 'number') {
			// If our seed doesn't match the seed in the update, we should sync
			if (this.seed !== seed) {
				console.warn(
					`Seed mismatch detected in world update. Local: ${this.seed}, Update: ${seed}`
				)
				this.seed = seed
				window.globalGameSeed = seed

				// Update WorldManager
				if (this.sceneManager && this.sceneManager.WorldManager) {
					this.sceneManager.WorldManager.setSeed(seed)
				}

				// Update UI
				this.updateSeedDisplay(seed)
				console.log(`Synchronized seed to value from world update: ${seed}`)

				// Request another seed confirmation from server to ensure consistency
				if (this.socket && this.isActive) {
					this.socket.emit('request_seed_confirmation', { currentSeed: seed })
				}

				return true
			}
		}
		return false
	}

	// Request a full world state sync from the server
	requestWorldStateSync() {
		if (!this.isActive || !this.socket) return

		console.log('Requesting full world state synchronization from server')
		this.socket.emit('request_full_sync', {
			worldId: this.worldId,
			currentLocation: this.currentLocation,
		})
	}

	// Schedule periodic world state verification with enhanced reliability
	scheduleWorldStateVerification() {
		// Clear any existing verification timer
		if (this.worldStateVerificationTimer) {
			clearInterval(this.worldStateVerificationTimer)
		}

		// Set up a new verification timer with staggered checks
		this.worldStateVerificationTimer = setInterval(() => {
			if (!this.isActive || !this.socket) return

			console.log('Performing periodic world state verification')

			// STEP 1: Verify seed consistency first
			if (this.sceneManager && this.sceneManager.WorldManager) {
				const worldManager = this.sceneManager.WorldManager

				if (typeof worldManager.verifySeedConsistency === 'function') {
					const result = worldManager.verifySeedConsistency()
					console.log('Seed consistency check result:', result)

					// If seeds are inconsistent, fix them
					if (!result.allMatch) {
						console.warn('Seed inconsistency detected - fixing...')

						if (typeof worldManager.fixSeedInconsistencies === 'function') {
							worldManager.fixSeedInconsistencies(result)
							console.log('Applied seed consistency fixes')
						}

						// Always request seed confirmation after a fix
						this.socket.emit('request_seed_confirmation', {
							currentSeed: this.seed,
						})
					}
				}
			}

			// STEP 2: Verify overall world state - use a varying interval
			// This helps avoid all clients hitting the server simultaneously
			const syncDelay = 2000 + Math.floor(Math.random() * 5000)
			setTimeout(() => {
				if (this.isActive && this.socket) {
					// Request full sync at varying intervals to ensure game state consistency
					this.requestWorldStateSync()

					// Also verify current location is correctly synchronized
					this.socket.emit('change_location', {
						location: this.currentLocation,
					})

					console.log('Requested full world state sync with delay:', syncDelay)
				}
			}, syncDelay)
		}, 45000) // Check every 45 seconds instead of 30 - reduce server load

		console.log('Enhanced world state verification scheduled')
	}

	// Enhanced method to handle seed synchronization with comprehensive error recovery and validation
	handleSeedSynchronization(serverSeed) {
		let finalSeed = null

		// Log current seed state for debugging
		console.log(`Comprehensive seed synchronization check:
		- Server provided seed: ${serverSeed} (${typeof serverSeed})
		- Current GameSynchronizer seed: ${this.seed} (${typeof this.seed})
		- Global seed: ${window.globalGameSeed} (${typeof window.globalGameSeed})
		- WorldManager seed: ${
			this.sceneManager?.WorldManager?.worldSeed
		} (${typeof this.sceneManager?.WorldManager?.worldSeed})
		- localStorage seed: ${
			localStorage.getItem('mining-empire-seed') || 'not set'
		}`)

		// Step 1: Collect all potential seeds from various sources
		const candidateSeeds = []

		// Add candidate seeds in order of priority
		if (serverSeed && typeof serverSeed === 'number' && !isNaN(serverSeed)) {
			candidateSeeds.push({
				source: 'server',
				value: serverSeed,
				priority: 1,
			})
		}

		if (this.seed && typeof this.seed === 'number' && !isNaN(this.seed)) {
			candidateSeeds.push({
				source: 'gameSync',
				value: this.seed,
				priority: 2,
			})
		}

		// Add other candidate seeds
		if (
			window.globalGameSeed &&
			typeof window.globalGameSeed === 'number' &&
			!isNaN(window.globalGameSeed)
		) {
			candidateSeeds.push({
				source: 'global',
				value: window.globalGameSeed,
				priority: 3,
			})
		}

		if (
			this.sceneManager &&
			this.sceneManager.WorldManager &&
			typeof this.sceneManager.WorldManager.worldSeed === 'number' &&
			!isNaN(this.sceneManager.WorldManager.worldSeed)
		) {
			candidateSeeds.push({
				source: 'worldManager',
				value: this.sceneManager.WorldManager.worldSeed,
				priority: 4,
			})
		}

		try {
			const storedSeed = localStorage.getItem('mining-empire-seed')
			if (storedSeed && !isNaN(Number(storedSeed))) {
				candidateSeeds.push({
					source: 'localStorage',
					value: Number(storedSeed),
					priority: 5,
				})
			}
		} catch (err) {
			console.warn('Failed to access localStorage for seed recovery:', err)
		}

		// Step 2: Sort candidates by priority and select the best one
		if (candidateSeeds.length > 0) {
			// Sort by priority (lowest number = highest priority)
			candidateSeeds.sort((a, b) => a.priority - b.priority)

			// Use the highest priority seed
			const bestCandidate = candidateSeeds[0]
			finalSeed = bestCandidate.value
			console.log(
				`Selected seed ${finalSeed} from source: ${bestCandidate.source} (priority ${bestCandidate.priority})`
			)

			// Log if we found multiple different seeds for diagnostics
			if (candidateSeeds.length > 1) {
				const uniqueValues = new Set(candidateSeeds.map(c => c.value))
				if (uniqueValues.size > 1) {
					console.warn(`Found ${uniqueValues.size} different seed values:`)
					candidateSeeds.forEach(c =>
						console.warn(`- Source: ${c.source}, Value: ${c.value}`)
					)
				}
			}
		}
		// Step 3: If no valid seed found, generate a new one
		else {
			finalSeed = Math.floor(Math.random() * 2147483647)
			console.warn(
				`No valid seeds found from any source! Generated new emergency seed: ${finalSeed}`
			)
			this.seedSyncRetries++

			if (this.seedSyncRetries > this.maxSeedSyncRetries) {
				console.error(
					`Failed to sync seed after ${this.seedSyncRetries} attempts. This may indicate a serious issue.`
				)
			}
		}

		// Step 4: Apply the final seed consistently everywhere
		this.seed = finalSeed
		window.globalGameSeed = finalSeed

		// CRITICAL FIX: Also update the SeedGenerator directly if we can access it
		// This ensures the SeedGenerator always has the correct seed before world generation
		if (this.sceneManager?.WorldManager?.seedGenerator) {
			this.sceneManager.WorldManager.seedGenerator.setSeed(finalSeed)
			console.log(`Directly updated SeedGenerator seed to: ${finalSeed}`)
		}

		// Store in localStorage for recovery
		try {
			localStorage.setItem('mining-empire-seed', finalSeed.toString())
			console.log(
				`Stored seed ${finalSeed} in localStorage for future recovery`
			)
		} catch (err) {
			console.warn('Failed to store seed in localStorage:', err)
		}

		// Step 5: Update WorldManager and related components
		if (this.sceneManager && this.sceneManager.WorldManager) {
			// Update WorldManager seed with force flag to ensure it takes effect
			this.sceneManager.WorldManager.setSeed(finalSeed)
			console.log(`Set WorldManager seed to: ${finalSeed}`)

			// CRITICAL FIX: Make sure we initialize the worldMap with the correct seed
			// This is crucial because world generation uses this map
			if (this.sceneManager.WorldManager.worldMap) {
				this.sceneManager.WorldManager.worldMap.initializeMap(finalSeed)
				console.log(`Reinitialized WorldMap with seed: ${finalSeed}`)
			}

			// If we have consistency verification, run a verification
			if (
				typeof this.sceneManager.WorldManager.verifySeedConsistency ===
				'function'
			) {
				const result = this.sceneManager.WorldManager.verifySeedConsistency()
				if (!result.allMatch) {
					console.warn(
						'Seed consistency check failed after synchronization - attempting fix'
					)
					if (
						typeof this.sceneManager.WorldManager.fixSeedInconsistencies ===
						'function'
					) {
						this.sceneManager.WorldManager.fixSeedInconsistencies(result)
						console.log('Applied seed consistency fixes')
					}
				} else {
					console.log('Seed consistency verified across all game components')
				}
			}
		}

		// Step 6: Update UI display
		this.updateSeedDisplay(finalSeed)

		// Step 7: Propagate seed to server if needed
		if (this.socket && this.isActive) {
			// If server sent an invalid/different seed or didn't send one at all
			if (
				!serverSeed ||
				typeof serverSeed !== 'number' ||
				serverSeed !== finalSeed
			) {
				console.log(`Sending seed ${finalSeed} to server for synchronization`)
				this.socket.emit('update_seed', { seed: finalSeed })
			}
		}

		return finalSeed
	}

	// Diagnostic method to test multiplayer synchronization
	verifyMultiplayerSynchronization() {
		console.log(
			'🔍 Running comprehensive multiplayer synchronization verification...'
		)

		// Step 1: Log all current states for debugging
		console.log(`Current system state:
		- GameSynchronizer seed: ${this.seed}
		- Global seed: ${window.globalGameSeed}
		- WorldManager seed: ${this.sceneManager?.WorldManager?.worldSeed}
		- Active status: ${this.isActive}
		- Socket connected: ${this.socket?.connected}
		- Current location: ${this.currentLocation}
		- Other players: ${this.otherPlayers.size}`)

		// Step 2: Verify seed consistency
		if (this.sceneManager?.WorldManager?.verifySeedConsistency) {
			const seedResult = this.sceneManager.WorldManager.verifySeedConsistency()
			console.log(
				`Seed consistency check: ${
					seedResult.allMatch ? 'PASSED ✅' : 'FAILED ❌'
				}`
			)
			if (!seedResult.allMatch) {
				console.warn('Seed inconsistencies detected:', seedResult)
				// Try to fix the inconsistencies
				if (this.sceneManager.WorldManager.fixSeedInconsistencies) {
					this.sceneManager.WorldManager.fixSeedInconsistencies(seedResult)
					console.log('Applied automatic fixes for seed inconsistencies')
				}
			}
		}

		// Step 3: Verify world state (counts of broken blocks, chests, ladders)
		if (this.sceneManager?.WorldManager?.worldChanges) {
			const worldChanges = this.sceneManager.WorldManager.worldChanges
			console.log(`World state summary:
			- Broken blocks: ${Object.keys(worldChanges.brokenBlocks || {}).length}
			- Opened chests: ${Object.keys(worldChanges.openedChests || {}).length}
			- Placed ladders: ${Object.keys(worldChanges.placedLadders || {}).length}`)

			// Print some example entries if they exist
			if (Object.keys(worldChanges.brokenBlocks || {}).length > 0) {
				const sampleKeys = Object.keys(worldChanges.brokenBlocks).slice(0, 5)
				console.log(`Sample broken blocks: ${sampleKeys.join(', ')}`)
			}
		}

		// Step 4: Test the connection by sending a ping
		if (this.socket && this.isActive) {
			const pingStart = Date.now()
			this.socket.emit('request_seed_confirmation', { currentSeed: this.seed })
			console.log(
				`Sent ping to server (seed confirmation request) at ${new Date().toISOString()}`
			)

			// Request full sync as well
			setTimeout(() => {
				if (this.socket && this.isActive) {
					this.requestWorldStateSync()
					console.log('Requested full world state sync for verification')
				}
			}, 1000) // Wait 1 second before requesting full sync
		}

		return true // Return success
	}

	/**
	 * Handle synchronization issues that were detected during verification
	 * @param {Object} verificationResult - The result from synchronization verification
	 */
	handleSyncIssues(verificationResult) {
		if (
			!verificationResult ||
			!verificationResult.issues ||
			verificationResult.isValid
		) {
			return // No issues to handle
		}

		console.log(
			'Attempting to address synchronization issues:',
			verificationResult.issues
		)

		// Fix seed issues first
		if (!verificationResult.seedMatches && this.seed) {
			this.handleSeedSynchronization(this.seed)
		}

		// Request a full sync from the server to correct any inconsistencies
		this.requestWorldStateSync()

		// Show notification to the user if we have serious consistency issues
		if (verificationResult.issues.length > 2) {
			const SaveManager =
				window.gameContainer?.SaveManager || window.SaveManager
			if (SaveManager && SaveManager.showNotification) {
				SaveManager.showNotification('Synchronizing world data...')
			}
		}
	}
}
