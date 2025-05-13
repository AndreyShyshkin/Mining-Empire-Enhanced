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

		// Add player to the world
		world.players.set(userId, {
			id: userId,
			displayName: user.displayName || 'Player',
			position: { x: 920, y: 500 }, // Default position
			location: 'village', // Default location
			online: true,
			lastActive: Date.now(),
		})

		// Send current world state to the player
		socket.emit('world_state', {
			worldId,
			seed: world.seed,
			players: Array.from(world.players.values()),
			worldState: world.worldState,
		})

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
		if (!currentWorldId || !userId) return

		const world = activeWorlds.get(currentWorldId)
		if (!world) return

		// Detailed logging for world changes
		console.log(
			`World state update from player ${userId} in world ${currentWorldId}:`,
			JSON.stringify(updates)
		)

		// Handle different types of updates more specifically
		if (updates.blockBroken) {
			// Merge block breaks into world state
			world.worldState.brokenBlocks = {
				...world.worldState.brokenBlocks,
				...updates.blockBroken,
			}
		}

		if (updates.chestOpened) {
			// Merge opened chests into world state
			world.worldState.openedChests = {
				...world.worldState.openedChests,
				...updates.chestOpened,
			}
		}

		if (updates.ladderPlaced) {
			// Merge placed ladders into world state
			world.worldState.placedLadders = {
				...world.worldState.placedLadders,
				...updates.ladderPlaced,
			}
		}

		// Broadcast updates to all other players in the world
		socket.to(currentWorldId).emit('world_state_updated', {
			updates: updates,
			sourcePlayerId: userId,
		})
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
