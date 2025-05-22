// Multiplayer system for Terraria clone game
// Uses Firebase Realtime Database for synchronization

class MultiplayerSystem {
	constructor() {
		// Firebase references - initialize these later to ensure availability
		this.database = null
		this.gamesRef = null

		// Initialize when DOM is loaded
		this.initializeWhenReady()

		// Local state
		this.isHost = false
		this.isConnected = false
		this.currentGameId = null
		this.localPlayerId = null
		this.players = {}
		this.playerListener = null
		this.blockUpdateListener = null
		this.gameInfoListener = null

		// Configuration
		this.syncInterval = 100 // ms
		this.lastSync = 0

		// Set up window unload handlers to save and cleanup when page closes
		this.setupUnloadHandlers()

		// Set up presence system to detect disconnections
		this.setupPresenceSystem()

		// Check authentication
		window.onAuthStateChanged(window.firebaseAuth, user => {
			if (user) {
				this.localPlayerId = user.uid
			} else {
				this.localPlayerId = null
				this.disconnect()
			}
		})
	}

	// Setup handlers for page unload/close events
	setupUnloadHandlers() {
		// beforeunload event - fires before the page is unloaded
		window.addEventListener('beforeunload', async event => {
			// Only trigger special behavior if we're hosting a game
			if (this.isHost && this.isConnected) {
				// Save the world before leaving
				if (this.sourceWorldId) {
					this.saveWorldToLocalStorage()
					console.log('Saving world before page close')
				}

				// Do synchronous cleanup for Firebase
				this.cleanupGameDataSync()
			}
		})

		// unload event - fires when the page is actually unloaded
		window.addEventListener('unload', () => {
			// Need to do final cleanup synchronously since async won't complete
			if (this.isHost && this.isConnected) {
				this.cleanupGameDataSync()
			}
		})
	}

	// Synchronous cleanup function for handling page unloads
	cleanupGameDataSync() {
		try {
			if (
				!this.isHost ||
				!this.isConnected ||
				!this.currentGameId ||
				!window.firebaseConfig
			) {
				return
			}

			// First, let's save the world if needed
			if (this.sourceWorldId && window.worldManager && window.world) {
				try {
					// Quick synchronous save attempt
					const worldData = window.world.saveData()
					window.worldManager.saveWorld(window.world, this.sourceWorldId)
					console.log('Saved world data before unload')
				} catch (saveError) {
					console.error('Error saving world on unload:', saveError)
				}
			}

			// Use synchronous XMLHttpRequest to ensure it completes before page unload
			const xhr = new XMLHttpRequest()
			const url = `${window.firebaseConfig.databaseURL}/games/${this.currentGameId}.json`
			xhr.open('DELETE', url, false) // false = synchronous
			xhr.setRequestHeader('Content-Type', 'application/json')
			xhr.setRequestHeader(
				'Authorization',
				`Bearer ${window.firebaseAuth?.currentUser?.uid || ''}`
			)
			xhr.send()

			console.log('Game data deleted from Firebase synchronously')
		} catch (error) {
			console.error('Error in synchronous cleanup:', error)
		}
	}

	// Set up presence system using Firebase's .info/connected special location
	setupPresenceSystem() {
		// Only initialize if we have Firebase
		if (!window.firebaseDatabase) {
			return
		}

		// Wait for Firebase to be initialized
		const setupTimer = setInterval(() => {
			if (this.database) {
				clearInterval(setupTimer)

				// Use Firebase's special location to detect connection status
				const connectedRef = window.dbRef(this.database, '.info/connected')
				window.dbOnValue(connectedRef, snapshot => {
					// When we're connected to Firebase
					if (snapshot.val() === true) {
						console.log('Connected to Firebase, setting up presence system')

						// Set up cleanup handlers for both players and hosts
						if (this.localPlayerId && this.currentGameId) {
							// Always remove player data on disconnect
							const playerRef = window.dbRef(
								this.database,
								`games/${this.currentGameId}/players/${this.localPlayerId}`
							)

							if (typeof window.dbOnDisconnect === 'function') {
								// Set up player data cleanup
								window.dbOnDisconnect(playerRef).remove()
								console.log(
									'Set up automatic player data cleanup on disconnect'
								)

								// For hosts, also remove the entire game
								if (this.isHost) {
									// Remove game data if host disconnects unexpectedly
									const gameRef = window.dbRef(
										this.database,
										`games/${this.currentGameId}`
									)

									window.dbOnDisconnect(gameRef).remove()
									console.log(
										'Set up automatic game cleanup if host disconnects'
									)
								}
							} else {
								console.warn('onDisconnect functionality not available')
							}
						}
					}
				})
			}
		}, 1000)
	}

	// Initialize Firebase references when everything is ready
	initializeWhenReady() {
		// Wait for DOM content to be loaded
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () =>
				this.initializeFirebase()
			)
		} else {
			// DOM already loaded, initialize now
			this.initializeFirebase()
		}
	}

	// Initialize Firebase references
	initializeFirebase() {
		// Give Firebase time to initialize
		setTimeout(() => {
			if (window.firebaseDatabase) {
				this.database = window.firebaseDatabase
				this.gamesRef = window.dbRef(this.database, 'games')
				console.log('Multiplayer Firebase references initialized')
			} else {
				// Retry after a delay if not ready
				console.log('Firebase not ready, retrying in 500ms')
				setTimeout(() => this.initializeFirebase(), 500)
			}
		}, 500)
	}

	// Create a new multiplayer game
	async createGame(worldData, sourceWorldId = null) {
		if (!this.localPlayerId) {
			throw new Error(
				'Необходимо войти в игру, чтобы создать многопользовательский режим'
			)
		}

		// Store the source world ID if provided (for saving back to local storage)
		this.sourceWorldId = sourceWorldId

		// Ensure Firebase references are initialized
		if (!this.database || !this.gamesRef) {
			await new Promise(resolve => {
				const checkInterval = setInterval(() => {
					if (this.database && this.gamesRef) {
						clearInterval(checkInterval)
						resolve()
					}
				}, 100)
			})
		}

		try {
			// Generate a unique game ID
			const gameId = 'game_' + Date.now()
			this.currentGameId = gameId

			// Create game entry
			const gameRef = window.dbRef(this.database, `games/${gameId}`)

			// Initialize game data
			await window.dbSet(gameRef, {
				hostId: this.localPlayerId,
				created: Date.now(),
				status: 'active',
				playerCount: 1,
				worldMeta: {
					width: worldData.width,
					height: worldData.height,
					name: worldData.name || 'Multiplayer World',
				},
			})

			// Add host player to the game
			const hostPlayerData = {
				id: this.localPlayerId,
				name: window.firebaseAuth.currentUser.displayName || 'Host',
				x: Math.floor((worldData.width * BLOCK_SIZE) / 2),
				y: Math.floor(worldData.height * 0.35 * BLOCK_SIZE),
				health: 100,
				isHost: true,
				lastUpdated: Date.now(),
			}

			const hostPlayerRef = window.dbRef(
				this.database,
				`games/${gameId}/players/${this.localPlayerId}`
			)
			await window.dbSet(hostPlayerRef, hostPlayerData)

			// Add player to the local cache immediately
			this.players = {}
			this.players[this.localPlayerId] = hostPlayerData

			// Upload initial world state (we'll only upload a compressed representation)
			const worldStateRef = window.dbRef(
				this.database,
				`games/${gameId}/worldState`
			)
			await window.dbSet(worldStateRef, this.compressWorldData(worldData))

			// Setup change tracking for blocks
			const blocksChangesRef = window.dbRef(
				this.database,
				`games/${gameId}/blockChanges`
			)
			await window.dbSet(blocksChangesRef, {})

			// Set local state
			this.isHost = true
			this.isConnected = true

			// Set up automatic cleanup if host disconnects unexpectedly
			if (typeof window.dbOnDisconnect === 'function') {
				// Set up player data cleanup first
				const playerRef = window.dbRef(
					this.database,
					`games/${gameId}/players/${this.localPlayerId}`
				)
				window.dbOnDisconnect(playerRef).remove()

				// Then set up game data cleanup
				const gameDisconnectRef = window.dbRef(this.database, `games/${gameId}`)
				window.dbOnDisconnect(gameDisconnectRef).remove()
				console.log('Set up automatic player and game cleanup on disconnection')
			} else {
				console.warn(
					'onDisconnect functionality not available - automatic cleanup will not work'
				)
			}

			// Start listening for player updates
			this.startListeningForPlayers()
			this.startListeningForBlockUpdates()

			console.log('Multiplayer game created:', gameId)

			return gameId
		} catch (error) {
			console.error('Error creating multiplayer game:', error)
			throw error
		}
	}

	// Join an existing multiplayer game
	async joinGame(gameId) {
		console.log('Joining multiplayer game:', gameId)
		if (!this.localPlayerId) {
			console.error('Cannot join multiplayer: no local player ID')
			throw new Error(
				'Необходимо войти в игру, чтобы присоединиться к многопользовательскому режиму'
			)
		}

		// Ensure Firebase references are initialized
		if (!this.database || !this.gamesRef) {
			await new Promise(resolve => {
				const checkInterval = setInterval(() => {
					if (this.database && this.gamesRef) {
						clearInterval(checkInterval)
						resolve()
					}
				}, 100)
			})
		}

		try {
			// Verify the game exists
			const gameRef = window.dbRef(this.database, `games/${gameId}`)
			const gameSnapshot = await window.dbGet(gameRef)

			if (!gameSnapshot.exists()) {
				throw new Error('Игра не найдена')
			}

			const gameData = gameSnapshot.val()

			if (gameData.status !== 'active') {
				throw new Error('Игра больше не активна')
			}

			// Get the world data
			const worldStateRef = window.dbRef(
				this.database,
				`games/${gameId}/worldState`
			)
			const worldStateSnapshot = await window.dbGet(worldStateRef)
			const worldData = this.decompressWorldData(
				worldStateSnapshot.val(),
				gameData.worldMeta
			)

			// Set our game ID
			this.currentGameId = gameId

			// Add ourselves to the player list
			const playerData = {
				id: this.localPlayerId,
				name: window.firebaseAuth.currentUser.displayName || 'Player',
				x: Math.floor((worldData.width * BLOCK_SIZE) / 2),
				y: Math.floor(worldData.height * 0.35 * BLOCK_SIZE),
				health: 100,
				isHost: false,
				lastUpdated: Date.now(),
			}

			const playerRef = window.dbRef(
				this.database,
				`games/${gameId}/players/${this.localPlayerId}`
			)
			await window.dbSet(playerRef, playerData)

			// Add player to the local cache immediately
			this.players = {}
			this.players[this.localPlayerId] = playerData

			// Update player count
			const countRef = window.dbRef(
				this.database,
				`games/${gameId}/playerCount`
			)
			const countSnapshot = await window.dbGet(countRef)
			await window.dbSet(countRef, (countSnapshot.val() || 0) + 1)

			// Set local state
			this.isHost = gameData.hostId === this.localPlayerId
			this.isConnected = true

			// Set up automatic cleanup for player data if we disconnect
			if (typeof window.dbOnDisconnect === 'function') {
				const playerDisconnectRef = window.dbRef(
					this.database,
					`games/${gameId}/players/${this.localPlayerId}`
				)
				window.dbOnDisconnect(playerDisconnectRef).remove()
				console.log('Set up automatic player cleanup on disconnection')
			}

			// Start listening for player updates
			this.startListeningForPlayers()
			this.startListeningForBlockUpdates()

			console.log('Joined multiplayer game:', gameId)

			return worldData
		} catch (error) {
			console.error('Error joining game:', error)
			throw error
		}
	}

	// Leave the current multiplayer game
	async disconnect() {
		if (!this.isConnected || !this.currentGameId) {
			return
		}

		// Save world before disconnecting if we are the host
		if (this.isHost && this.sourceWorldId) {
			this.saveWorldToLocalStorage()
			console.log('Saved world before disconnecting')
		}

		// Stop periodic saving if it's running
		this.stopPeriodicSaving()

		try {
			// Important: Cancel any previously set onDisconnect handlers
			// to avoid unintended deletions after we've already handled cleanup
			if (this.isHost && this.database && this.currentGameId) {
				try {
					const gameRef = window.dbRef(
						this.database,
						`games/${this.currentGameId}`
					)

					// Cancel the onDisconnect handler
					if (window.dbOnDisconnect) {
						window.dbOnDisconnect(gameRef).cancel()
						console.log('Cancelled automatic disconnection handlers')
					}
				} catch (cancelError) {
					console.error('Failed to cancel onDisconnect handler:', cancelError)
				}
			}

			// If we're the host, remove the entire game data first
			if (this.isHost) {
				console.log('Host is disconnecting - removing entire game data')

				try {
					// First explicitly remove the player data to ensure it's gone
					if (this.localPlayerId) {
						const hostPlayerRef = window.dbRef(
							this.database,
							`games/${this.currentGameId}/players/${this.localPlayerId}`
						)
						await window.dbRemove(hostPlayerRef)
						console.log('Removed host player data')
					}

					// Then remove the entire game
					const fullGameRef = window.dbRef(
						this.database,
						`games/${this.currentGameId}`
					)
					await window.dbRemove(fullGameRef)
					console.log('Removed game data from server as host')
				} catch (error) {
					console.error('Error removing game data:', error)

					// Try one more time with a different approach
					try {
						// Use direct REST API if Firebase methods failed
						if (window.firebaseConfig && this.currentGameId) {
							const xhr = new XMLHttpRequest()
							const url = `${window.firebaseConfig.databaseURL}/games/${this.currentGameId}.json`
							xhr.open('DELETE', url, true) // true = async
							xhr.setRequestHeader('Content-Type', 'application/json')
							xhr.send()
							console.log('Fallback: Sent direct delete request to Firebase')
						}
					} catch (fallbackError) {
						console.error('Fallback cleanup also failed:', fallbackError)
					}
				}
			}
			// If not host, just remove ourselves from the player list
			else if (this.localPlayerId) {
				const playerRef = window.dbRef(
					this.database,
					`games/${this.currentGameId}/players/${this.localPlayerId}`
				)
				await window.dbRemove(playerRef)
				console.log('Removed player data from server')

				// Update player count
				const countRef = window.dbRef(
					this.database,
					`games/${this.currentGameId}/playerCount`
				)
				const countSnapshot = await window.dbGet(countRef)
				const newCount = Math.max(0, (countSnapshot.val() || 1) - 1)
				await window.dbSet(countRef, newCount)
			}

			// Clean up listeners
			this.stopListening()

			// Also stop inventory sync listeners
			if (window.inventorySyncSystem) {
				window.inventorySyncSystem.stopListening()
			}

			// Reset local state
			this.isHost = false
			this.isConnected = false
			this.currentGameId = null
			this.players = {}

			console.log('Disconnected from multiplayer game')
		} catch (error) {
			console.error('Error disconnecting from game:', error)
		}
	}

	// Get list of active games
	async getActiveGames() {
		if (!this.database || !this.gamesRef) {
			return []
		}

		try {
			const gamesQuery = this.gamesRef
			const gamesSnapshot = await window.dbGet(gamesQuery)

			const games = []

			if (gamesSnapshot.exists()) {
				const allGames = gamesSnapshot.val()

				// Filter for active games only and convert to array
				for (const [id, game] of Object.entries(allGames)) {
					if (game.status === 'active') {
						games.push({
							id,
							hostId: game.hostId,
							hostName: game.players?.[game.hostId]?.name || 'Unknown Host',
							playerCount: game.playerCount || 0,
							created: new Date(game.created).toLocaleString(),
							worldName: game.worldMeta?.name || 'Multiplayer World',
						})
					}
				}
			}

			return games
		} catch (error) {
			console.error('Error getting active games:', error)
			return []
		}
	}

	// Update player position and state
	updatePlayerState(player) {
		if (!this.isConnected || !this.currentGameId || !this.localPlayerId) {
			return
		}

		const now = Date.now()

		// Rate limit updates
		if (now - this.lastSync < this.syncInterval) {
			return
		}

		this.lastSync = now

		// Important: store the player data locally as well, so it's available immediately
		// This is crucial for proper distance checking
		if (!this.players[this.localPlayerId]) {
			// Create local player data if missing
			this.players[this.localPlayerId] = {
				id: this.localPlayerId,
				x: player.x,
				y: player.y,
			}
		} else {
			// Update our local cache of player data
			this.players[this.localPlayerId].x = player.x
			this.players[this.localPlayerId].y = player.y
		}

		const playerRef = window.dbRef(
			this.database,
			`games/${this.currentGameId}/players/${this.localPlayerId}`
		)

		const playerData = {
			x: player.x,
			y: player.y,
			health: player.health,
			direction: player.direction,
			lastUpdated: now,
			// Add mining state to sync
			isMining: player.isMining,
			miningTargetX: player.miningTarget ? player.miningTarget.x : null,
			miningTargetY: player.miningTarget ? player.miningTarget.y : null,
			miningProgress: player.miningProgress,
		}

		window
			.dbUpdate(playerRef, playerData)
			.catch(error => console.error('Error updating player state:', error))
	}

	// Update a block in the shared world
	updateBlock(x, y, blockType, wallType = null) {
		if (!this.isConnected || !this.currentGameId || !this.localPlayerId) {
			return false
		}

		// We already check distance in player.js so no need to duplicate it here
		const localPlayer = this.players[this.localPlayerId]
		if (!localPlayer && window.player) {
			// Force-add the player to the players object if missing
			this.players[this.localPlayerId] = {
				id: this.localPlayerId,
				x: window.player.x,
				y: window.player.y,
				lastUpdated: Date.now(),
			}
		}

		try {
			const changeId = `${x}_${y}_${Date.now()}`
			const changeRef = window.dbRef(
				this.database,
				`games/${this.currentGameId}/blockChanges/${changeId}`
			)

			const changeData = {
				x,
				y,
				blockType,
				playerId: this.localPlayerId,
				timestamp: Date.now(),
				wallType: wallType, // Always include wall type for proper synchronization
			}

			// Use Promise to handle block updates more reliably
			window.dbSet(changeRef, changeData).catch(error => {
				console.error('Error updating block:', error)
			})

			return true
		} catch (error) {
			console.error('Exception during block update:', error)
			return false
		}
	}

	// Get other connected players
	getOtherPlayers() {
		return Object.values(this.players).filter(
			player => player.id !== this.localPlayerId
		)
	}

	// Start listening for player updates
	startListeningForPlayers() {
		if (!this.currentGameId || !this.database) return

		const playersRef = window.dbRef(
			this.database,
			`games/${this.currentGameId}/players`
		)

		this.playerListener = window.dbOnValue(playersRef, snapshot => {
			if (snapshot.exists()) {
				const players = snapshot.val()
				this.players = players

				// Check if host has left or changed
				if (this.isConnected && !this.isHost) {
					const hostPlayer = Object.values(players).find(p => p.isHost)

					if (!hostPlayer && Object.keys(players).length > 0) {
						// Host is gone but game has players - select new host
						const oldestPlayer = Object.values(players).sort(
							(a, b) => (a.lastUpdated || 0) - (b.lastUpdated || 0)
						)[0]

						if (oldestPlayer && oldestPlayer.id === this.localPlayerId) {
							// We're now the host
							console.log('Becoming new host')
							this.isHost = true

							const playerRef = window.dbRef(
								this.database,
								`games/${this.currentGameId}/players/${this.localPlayerId}`
							)
							window.dbUpdate(playerRef, {
								isHost: true,
							})

							const gameRef = window.dbRef(
								this.database,
								`games/${this.currentGameId}`
							)
							window.dbUpdate(gameRef, {
								hostId: this.localPlayerId,
							})
						}
					}
				}
			}
		})
	}

	// Start listening for block updates
	startListeningForBlockUpdates() {
		if (!this.currentGameId || !this.database) {
			return
		}

		const changesRef = window.dbRef(
			this.database,
			`games/${this.currentGameId}/blockChanges`
		)

		// We're interested in child_added events - new block changes
		this.blockUpdateListener = window.dbOnChildAdded(changesRef, snapshot => {
			if (snapshot.exists()) {
				const change = snapshot.val()

				// For our own updates, ничего не делаем
				if (change.playerId === this.localPlayerId) {
					// Наш блок подтверждён сервером
				}
				// Only apply changes from other players
				else if (window.world) {
					try {
						// Get the current wall type before making changes
						const currentWallType = window.world.getWall(change.x, change.y)

						// Apply the block change
						window.world.setTile(change.x, change.y, change.blockType)

						// Handle the wall data:
						// If explicitly provided in the change, use that value
						if (change.wallType !== undefined) {
							window.world.setWall(change.x, change.y, change.wallType)
						}
						// Preserve the current wall value if block is being broken and wallType wasn't provided
						else if (change.blockType === BLOCK_TYPES.AIR) {
							// Explicitly preserve the wall when breaking blocks
							window.world.setWall(change.x, change.y, currentWallType)
						}

						// Set diggedAreas flag for render purposes if the block was broken
						if (change.blockType === BLOCK_TYPES.AIR && window.renderer) {
							const key = `${change.x},${change.y}`
							window.renderer.playerDiggedAreas[key] = true
							window.renderer.lightingCache = {} // Refresh lighting calculation
						}
					} catch (error) {
						console.error('Error processing block update:', error)
					}
				}

				// Remove old changes periodically if we're the host
				if (this.isHost && Date.now() - change.timestamp > 60000) {
					window.dbRemove(
						window.dbRef(
							this.database,
							`games/${this.currentGameId}/blockChanges/${snapshot.key}`
						)
					)
				}
			}
		})
	}

	// Stop listening for updates
	stopListening() {
		if (!this.database || !this.currentGameId) return

		if (this.playerListener) {
			window.dbOff(
				window.dbRef(this.database, `games/${this.currentGameId}/players`),
				'value',
				this.playerListener
			)
			this.playerListener = null
		}

		if (this.blockUpdateListener) {
			window.dbOff(
				window.dbRef(this.database, `games/${this.currentGameId}/blockChanges`),
				'child_added',
				this.blockUpdateListener
			)
			this.blockUpdateListener = null
		}
	}

	// Compress world data for storage
	compressWorldData(worldData) {
		// For large worlds, we don't want to store the entire tilemap
		// Instead, we'll store a compressed representation with just the non-air blocks
		const nonDefaultTiles = []
		const nonDefaultWalls = []

		// Validate world data before processing
		if (
			!worldData ||
			!worldData.height ||
			!worldData.width ||
			!worldData.tiles ||
			!worldData.walls
		) {
			console.error('Invalid world data provided for compression:', worldData)
			return { version: 1, nonDefaultTiles: [], nonDefaultWalls: [] }
		}

		for (let y = 0; y < worldData.height; y++) {
			for (let x = 0; x < worldData.width; x++) {
				const tileIndex = y * worldData.width + x
				const blockType = worldData.tiles[tileIndex]
				const wallType = worldData.walls[tileIndex]

				// Store non-air blocks
				if (blockType !== BLOCK_TYPES.AIR) {
					nonDefaultTiles.push({
						x,
						y,
						type: blockType,
					})
				}

				// Store non-default walls (important for multi-player)
				if (wallType !== WALL_TYPES.NONE) {
					nonDefaultWalls.push({
						x,
						y,
						type: wallType,
					})
				}
			}
		}

		// Include inventory data if available
		const result = {
			version: 1,
			nonDefaultTiles,
			nonDefaultWalls, // Include walls in the compressed data
		}

		// Save inventory data with the world if available
		if (worldData && worldData.inventory) {
			result.inventory = worldData.inventory
		}

		return result
	}

	// Decompress world data from storage
	decompressWorldData(compressedData, worldMeta) {
		// Validate inputs
		if (!worldMeta || !worldMeta.width || !worldMeta.height) {
			console.error('Invalid world metadata for decompression:', worldMeta)
			return {
				width: 100, // Default size
				height: 100,
				tiles: new Array(100 * 100).fill(BLOCK_TYPES.AIR),
				walls: new Array(100 * 100).fill(WALL_TYPES.NONE),
				name: 'Error World',
			}
		}

		// Create a default world filled with air
		const tiles = new Array(worldMeta.width * worldMeta.height).fill(
			BLOCK_TYPES.AIR
		)
		const walls = new Array(worldMeta.width * worldMeta.height).fill(
			WALL_TYPES.NONE
		)

		// Apply the non-default tiles
		if (compressedData && compressedData.nonDefaultTiles) {
			for (const tile of compressedData.nonDefaultTiles) {
				const tileIndex = tile.y * worldMeta.width + tile.x
				if (tileIndex >= 0 && tileIndex < tiles.length) {
					tiles[tileIndex] = tile.type
				}
			}
		}

		// Apply the non-default walls
		if (compressedData && compressedData.nonDefaultWalls) {
			for (const wall of compressedData.nonDefaultWalls) {
				const tileIndex = wall.y * worldMeta.width + wall.x
				if (tileIndex >= 0 && tileIndex < walls.length) {
					walls[tileIndex] = wall.type
				}
			}
		}

		// For backward compatibility with older worlds
		// If a tile has no wall but is not air, set a default wall
		if (!compressedData.nonDefaultWalls) {
			// Add some basic walls beneath the surface
			const groundLevel = Math.floor(worldMeta.height * 0.4)

			for (let y = 0; y < worldMeta.height; y++) {
				for (let x = 0; x < worldMeta.width; x++) {
					const tileIndex = y * worldMeta.width + x

					// For solid blocks below ground level that don't have a wall
					if (tiles[tileIndex] !== BLOCK_TYPES.AIR && y >= groundLevel) {
						if (
							tiles[tileIndex] === BLOCK_TYPES.DIRT ||
							tiles[tileIndex] === BLOCK_TYPES.GRASS
						) {
							walls[tileIndex] = WALL_TYPES.DIRT
						} else if (tiles[tileIndex] === BLOCK_TYPES.STONE) {
							walls[tileIndex] = WALL_TYPES.STONE
						} else {
							walls[tileIndex] = WALL_TYPES.DIRT
						}
					}
				}
			}
		}

		// Include inventory data if available in the compressed data
		const result = {
			width: worldMeta.width,
			height: worldMeta.height,
			tiles,
			walls,
			name: worldMeta.name,
		}

		// Include inventory data if it was part of the compressed world data
		if (compressedData && compressedData.inventory) {
			result.inventory = compressedData.inventory
		}

		return result
	}

	// Check if player is currently in a multiplayer game
	isInMultiplayerGame() {
		const result = this.isConnected && this.currentGameId !== null

		// Add a simple connection test if we're supposedly connected
		if (result && this.database) {
			// Try a simple Firebase operation to verify connectivity
			const pingRef = window.dbRef(this.database, `.info/connected`)
			window.dbOnValue(pingRef, snapshot => {
				const connected = snapshot.val() === true

				// If disconnected but we think we're in multiplayer, try to reconnect
				if (!connected && this.isConnected) {
					console.log('Firebase connection lost, trying to reconnect...')
					// Could add reconnection logic here
				}
			})
		}

		return result
	}

	// Get the current game ID
	getCurrentGameId() {
		return this.currentGameId
	}

	// Is this player the host?
	isGameHost() {
		return this.isHost
	}

	// Save the world back to local storage (only for host)
	saveWorldToLocalStorage() {
		if (
			!this.isHost ||
			!this.sourceWorldId ||
			!window.worldManager ||
			!window.world
		) {
			return false
		}

		try {
			// Get current world data
			const worldData = window.world.saveData()

			// Save to local storage
			const success = window.worldManager.saveWorld(
				window.world,
				this.sourceWorldId
			)

			if (success) {
				console.log(
					`Autosaved multiplayer world to local storage (ID: ${this.sourceWorldId})`
				)
				// Show a small notification to the user
				if (typeof showGameMessage === 'function') {
					showGameMessage('Мир автоматически сохранен', 'info', 2000)
				}
			}
			return success
		} catch (error) {
			console.error('Error saving multiplayer world to local storage:', error)
			return false
		}
	}

	// Start periodic saving (only for host)
	startPeriodicSaving(intervalMs = 60000) {
		// Clear any existing save interval
		if (this.saveInterval) {
			clearInterval(this.saveInterval)
		}

		// Only set up saving for the host
		if (this.isHost && this.sourceWorldId) {
			this.saveInterval = setInterval(() => {
				this.saveWorldToLocalStorage()
			}, intervalMs)
			console.log(
				`Periodic saving started (every ${intervalMs / 1000} seconds)`
			)
		}
	}

	// Stop periodic saving
	stopPeriodicSaving() {
		if (this.saveInterval) {
			clearInterval(this.saveInterval)
			this.saveInterval = null
			console.log('Periodic saving stopped')
		}
	}
}

// Export globally
window.addEventListener('DOMContentLoaded', () => {
	window.multiplayerSystem = new MultiplayerSystem()
})
