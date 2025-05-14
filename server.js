// Socket.io server for Mining Empire Enhanced
import cors from 'cors'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
app.use(cors())

const httpServer = createServer(app)
const io = new Server(httpServer, {
	cors: {
		origin: '*', // During development
		methods: ['GET', 'POST'],
	},
})

// Store active worlds and their players
const activeWorlds = new Map()

// Socket.io connection handler
io.on('connection', socket => {
	console.log(`Player connected: ${socket.id}`)
	let currentWorldId = null
	let userId = null

	// Player joins a world
	socket.on('join_world', ({ worldId, user, seed, initialState }) => {
		userId = user.uid
		currentWorldId = worldId
		console.log(`Player ${userId} joining world: ${worldId}`)

		// Join socket room for this world
		socket.join(worldId)

		// Initialize world data if it doesn't exist
		if (!activeWorlds.has(worldId)) {
			activeWorlds.set(worldId, {
				seed: seed,
				host: userId,
				players: new Map(),
				worldState: initialState || {
					brokenBlocks: {},
					openedChests: {},
					placedLadders: {},
				},
			})
			console.log(`Created new world: ${worldId} with seed: ${seed}`)
		}

		const world = activeWorlds.get(worldId)

		// Add player to the world with seed tracking
		world.players.set(userId, {
			id: userId,
			displayName: user.displayName || 'Player',
			position: { x: 920, y: 500 }, // Default position
			location: 'village', // Default location
			online: true,
			lastActive: Date.now(),
			lastKnownSeed: typeof seed === 'number' ? seed : null, // Track this player's seed
		})

		// Send current world state to the player with improved debugging
		console.log(`Sending world state to player ${userId}:`, {
			worldId,
			seed: world.seed,
			playerCount: world.players.size,
			worldStateSize: {
				brokenBlocks: Object.keys(world.worldState.brokenBlocks || {}).length,
				openedChests: Object.keys(world.worldState.openedChests || {}).length,
				placedLadders: Object.keys(world.worldState.placedLadders || {}).length,
			},
		})

		// Validate the seed is a number and not undefined or null before sending
		const validSeed =
			typeof world.seed === 'number'
				? world.seed
				: seed
				? Number(seed)
				: Math.floor(Math.random() * 2147483647)

		// Log the seed validation step
		if (world.seed !== validSeed) {
			console.log(
				`Fixed invalid seed value. Original: ${world.seed}, New: ${validSeed}`
			)
			world.seed = validSeed
		}

		// Send the world state with the validated seed
		socket.emit('world_state', {
			worldId,
			seed: validSeed, // Send the validated seed
			players: Array.from(world.players.values()),
			worldState: world.worldState,
		})

		// Send an additional seed confirmation event after a delay to ensure clients receive it
		setTimeout(() => {
			socket.emit('seed_confirmation', {
				seed: validSeed,
			})
			console.log(`Sent seed confirmation to player ${userId}: ${validSeed}`)
		}, 1000)

		// Notify other players that someone joined
		socket.to(worldId).emit('player_joined', {
			playerId: userId,
			playerInfo: world.players.get(userId),
		})
	})

	// Player position update
	socket.on('update_position', ({ position, location }) => {
		if (!currentWorldId || !userId) return

		const world = activeWorlds.get(currentWorldId)
		if (!world) return

		const player = world.players.get(userId)
		if (!player) return

		// Update player position and location
		player.position = position
		if (location) {
			player.location = location // 'village' or 'cave'
		}
		player.lastActive = Date.now()

		// Send updated position to all other players in the world
		socket.to(currentWorldId).emit('player_moved', {
			playerId: userId,
			position: position,
			location: player.location,
		})
	})

	// World state updates (resource collection, etc.)
	socket.on('update_world_state', ({ updates }) => {
		if (!currentWorldId || !userId) {
			console.warn(`Ignoring world state update: Invalid world ID or user ID`)
			return
		}

		const world = activeWorlds.get(currentWorldId)
		if (!world) {
			console.warn(`World not found for ID: ${currentWorldId}`)
			return
		}

		// Enhanced logging and validation for world changes
		console.log(
			`World state update from player ${userId} in world ${currentWorldId}:`,
			JSON.stringify(updates)
		)

		// Track any changes that will need to be broadcast
		const validatedUpdates = {}
		let hasValidUpdates = false

		try {
			// Validate and handle different types of updates more specifically
			if (updates.blockBroken) {
				// Validate block breaks (check if keys have proper format)
				const validBlockBreaks = {}
				let blockUpdateCount = 0

				for (const key in updates.blockBroken) {
					// Only add properly formatted updates with position data
					if (updates.blockBroken[key] && updates.blockBroken[key].position) {
						// Normalize coordinates to ensure consistency
						const pos = updates.blockBroken[key].position
						const normalizedKey = `${Math.floor(pos.x)},${Math.floor(pos.y)}`

						// Use normalized key in the validated updates
						validBlockBreaks[normalizedKey] = {
							position: {
								x: Math.floor(pos.x),
								y: Math.floor(pos.y),
							},
						}

						blockUpdateCount++
					}
				}

				if (blockUpdateCount > 0) {
					// Merge validated block breaks into world state
					world.worldState.brokenBlocks = {
						...world.worldState.brokenBlocks,
						...validBlockBreaks,
					}
					validatedUpdates.blockBroken = validBlockBreaks
					hasValidUpdates = true
					console.log(`Added ${blockUpdateCount} broken blocks to world state`)
				}
			}

			if (updates.chestOpened) {
				// Validate chest opens
				const validChestOpens = {}
				let chestUpdateCount = 0

				for (const key in updates.chestOpened) {
					if (updates.chestOpened[key] && updates.chestOpened[key].position) {
						// Normalize coordinates to ensure consistency
						const pos = updates.chestOpened[key].position
						const normalizedKey = `${Math.floor(pos.x)},${Math.floor(pos.y)}`

						// Use normalized key in the validated updates
						validChestOpens[normalizedKey] = {
							position: {
								x: Math.floor(pos.x),
								y: Math.floor(pos.y),
							},
						}

						chestUpdateCount++
					}
				}

				if (chestUpdateCount > 0) {
					// Merge validated opened chests into world state
					world.worldState.openedChests = {
						...world.worldState.openedChests,
						...validChestOpens,
					}
					validatedUpdates.chestOpened = validChestOpens
					hasValidUpdates = true

					console.log(`Added ${chestUpdateCount} opened chests to world state`)
				}
			}

			if (updates.ladderPlaced) {
				// Validate ladder placements
				const validLadders = {}
				let ladderUpdateCount = 0

				for (const key in updates.ladderPlaced) {
					if (updates.ladderPlaced[key] && updates.ladderPlaced[key].position) {
						// Normalize coordinates to ensure consistency
						const pos = updates.ladderPlaced[key].position
						const normalizedKey = `${Math.floor(pos.x)},${Math.floor(pos.y)}`

						// Use normalized key in the validated updates
						validLadders[normalizedKey] = {
							position: {
								x: Math.floor(pos.x),
								y: Math.floor(pos.y),
							},
						}

						ladderUpdateCount++
					}
				}

				if (ladderUpdateCount > 0) {
					// Merge validated placed ladders into world state
					world.worldState.placedLadders = {
						...world.worldState.placedLadders,
						...validLadders,
					}
					validatedUpdates.ladderPlaced = validLadders
					hasValidUpdates = true

					console.log(
						`Added ${ladderUpdateCount} placed ladders to world state`
					)
				}
			}
		} catch (error) {
			console.error('Error processing world updates:', error)
			socket.emit('error', {
				message: 'Failed to process world updates',
				details: error.message,
			})
			return // Skip broadcasting if there was an error
		}

		// Only broadcast if we have valid updates
		if (hasValidUpdates) {
			// Debug world state after update
			const worldStateSize = {
				brokenBlocks: Object.keys(world.worldState.brokenBlocks || {}).length,
				openedChests: Object.keys(world.worldState.openedChests || {}).length,
				placedLadders: Object.keys(world.worldState.placedLadders || {}).length,
			}
			console.log(`World state after update:`, worldStateSize)

			// Validate seed before broadcasting
			if (typeof world.seed !== 'number') {
				console.warn(`Invalid seed detected during world update: ${world.seed}`)
				world.seed = Math.floor(Math.random() * 2147483647)
				console.log(`Generated new valid seed: ${world.seed}`)

				// Send an immediate seed confirmation to all clients
				io.to(currentWorldId).emit('seed_confirmation', { seed: world.seed })
			}

			// Broadcast updates to all other players in the world
			socket.to(currentWorldId).emit('world_state_updated', {
				updates: validatedUpdates,
				sourcePlayerId: userId,
				timestamp: Date.now(),
				seed: world.seed, // Include seed with every update for verification
			})

			// Send a seed confirmation to ensure client and server stay in sync
			socket.emit('seed_confirmation', {
				seed: world.seed,
			})
		}
	})

	// Player changes location (village/cave)
	socket.on('change_location', ({ location }) => {
		if (!currentWorldId || !userId) return

		const world = activeWorlds.get(currentWorldId)
		if (!world) return

		const player = world.players.get(userId)
		if (!player) return

		console.log(
			`Player ${userId} changed location to ${location} in world ${currentWorldId}`
		)

		player.location = location
		player.lastActive = Date.now()

		// Notify other players about location change
		socket.to(currentWorldId).emit('player_changed_location', {
			playerId: userId,
			location: location,
		})

		// Send seed confirmation on location change to ensure consistency
		if (world.seed) {
			socket.emit('seed_confirmation', {
				seed: world.seed,
			})
			console.log(
				`Sent seed confirmation during location change: ${world.seed}`
			)
		}
	})

	// Enhanced seed confirmation request handler with validation and consistency check
	socket.on('request_seed_confirmation', ({ currentSeed }) => {
		if (!currentWorldId || !userId) return

		const world = activeWorlds.get(currentWorldId)
		if (!world) return

		console.log(`Seed confirmation requested by player ${userId}, 
		- Client reports: ${currentSeed}
		- Server has: ${world.seed}`)

		// ENHANCED: Comprehensive seed validation and reconciliation logic
		let finalSeed = world.seed
		let seedChanged = false

		// If server has no valid seed but client does, use client's seed
		if (
			(!finalSeed || typeof finalSeed !== 'number') &&
			typeof currentSeed === 'number' &&
			!isNaN(currentSeed)
		) {
			finalSeed = currentSeed
			seedChanged = true
			console.log(
				`Server adopting client seed: ${finalSeed} from player ${userId}`
			)
		}
		// If both have valid seeds but they're different, log a warning but keep server's seed
		else if (
			typeof finalSeed === 'number' &&
			typeof currentSeed === 'number' &&
			finalSeed !== currentSeed
		) {
			console.warn(`Seed mismatch! Server: ${finalSeed}, Client: ${currentSeed}. 
			Client ${userId} will be synchronized to server seed.`)
		}
		// If server has no valid seed and client also has no valid seed, generate a new one
		else if (!finalSeed || typeof finalSeed !== 'number') {
			finalSeed = Math.floor(Math.random() * 2147483647)
			seedChanged = true
			console.log(
				`Neither server nor client had valid seed. Generated new seed: ${finalSeed}`
			)
		}

		// If seed was changed or is different from client's seed, update server and notify all clients
		if (seedChanged || finalSeed !== currentSeed) {
			world.seed = finalSeed

			// Send seed confirmation to all clients in this world to ensure everyone stays in sync
			io.to(currentWorldId).emit('seed_confirmation', { seed: finalSeed })
			console.log(`Broadcast seed confirmation to all clients: ${finalSeed}`)
		} else {
			// If seeds match, just confirm to the requesting client
			socket.emit('seed_confirmation', { seed: finalSeed })
		}

		// Update last active timestamp for this player
		const player = world.players.get(userId)
		if (player) {
			player.lastActive = Date.now()
		}
	})

	// Handle seed updates from clients
	socket.on('update_seed', ({ seed }) => {
		if (!currentWorldId || !userId) {
			console.warn('Seed update requested but no world context available')
			return
		}

		const world = activeWorlds.get(currentWorldId)
		if (!world) {
			console.warn(`World not found for seed update: ${currentWorldId}`)
			return
		}

		// Only accept valid seeds
		if (typeof seed !== 'number' || isNaN(seed)) {
			console.warn(`Ignoring invalid seed update from ${userId}: ${seed}`)
			return
		}

		// Log the seed change
		console.log(
			`Received seed update from ${userId} - New seed: ${seed}, Current world seed: ${world.seed}`
		)

		// Only update if current seed is invalid or different
		if (!world.seed || typeof world.seed !== 'number' || world.seed !== seed) {
			world.seed = seed
			console.log(`Updated world seed to: ${world.seed} from client ${userId}`)

			// Broadcast the seed update to all players in the world
			io.to(currentWorldId).emit('seed_confirmation', { seed: world.seed })
			console.log(`Broadcast seed confirmation to all clients: ${world.seed}`)
		}
	})

	// Handle full world state synchronization request
	socket.on('request_full_sync', ({ worldId }) => {
		if (!worldId) {
			console.warn('Full sync requested without world ID')
			return
		}

		// If requester is not in a world, use provided worldId
		if (!currentWorldId) {
			currentWorldId = worldId
		}

		console.log(
			`Full world state sync requested by player ${userId} for world ${currentWorldId}`
		)

		const world = activeWorlds.get(currentWorldId)
		if (!world) {
			console.warn(`World not found for full sync: ${currentWorldId}`)
			return
		}

		// Validate seed before sending
		const validSeed =
			typeof world.seed === 'number'
				? world.seed
				: Math.floor(Math.random() * 2147483647)

		if (validSeed !== world.seed) {
			console.warn(
				`Fixed invalid seed during full sync. Original: ${world.seed}, New: ${validSeed}`
			)
			world.seed = validSeed
		}

		// Send complete world state to the requesting client
		socket.emit('world_state', {
			worldId: currentWorldId,
			seed: validSeed,
			players: Array.from(world.players.values()),
			worldState: world.worldState,
			fullSync: true, // Flag indicating this is a full synchronization
			timestamp: Date.now(),
		})

		console.log(`Sent full world state to player ${userId}`)
	})

	// Handle disconnection
	socket.on('disconnect', () => {
		console.log(`Player disconnected: ${socket.id}`)
		handlePlayerDisconnect()
	})

	socket.on('leave_world', () => {
		console.log(`Player ${userId} leaving world: ${currentWorldId}`)
		handlePlayerDisconnect()
	})

	function handlePlayerDisconnect() {
		if (!currentWorldId || !userId) return

		const world = activeWorlds.get(currentWorldId)
		if (!world) return

		// Remove player from world
		world.players.delete(userId)

		// Notify others that player left
		socket.to(currentWorldId).emit('player_left', {
			playerId: userId,
		})

		// If world is empty, clean it up
		if (world.players.size === 0) {
			console.log(`World ${currentWorldId} is empty, removing it`)
			activeWorlds.delete(currentWorldId)
		}

		// Leave the socket room
		socket.leave(currentWorldId)
		currentWorldId = null
		userId = null
	}
})

// Start server
const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
	console.log(`Socket.IO server running on port ${PORT}`)
})
