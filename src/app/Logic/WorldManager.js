import { SeedGenerator } from './SeedGenerator'
import { WorldMap } from './WorldMap'

export class WorldManager {
	static instance = null

	constructor() {
		if (WorldManager.instance) {
			return WorldManager.instance
		}

		this.worldSeed = null
		this.seedGenerator = new SeedGenerator()
		this.worldChanges = {
			brokenBlocks: {}, // format: "x,y": true
			openedChests: {}, // format: "x,y": true
			placedLadders: {}, // format: "x,y": true
		}

		// Add reference to WorldMap
		this.worldMap = WorldMap.getInstance()

		WorldManager.instance = this
	}

	static getInstance() {
		if (!WorldManager.instance) {
			WorldManager.instance = new WorldManager()
		}
		return WorldManager.instance
	}

	// Generate a new world with a new seed
	newWorld() {
		this.worldSeed = this.seedGenerator.newSeed()
		this.worldChanges = {
			brokenBlocks: {},
			openedChests: {},
			placedLadders: {},
		}

		// Initialize the world map with our new seed
		this.worldMap.initializeMap(this.worldSeed)

		console.log('Generated new world with seed:', this.worldSeed)
		return this.worldSeed
	}

	// Set a specific seed for a new world
	setSeed(seed) {
		if (typeof seed !== 'number') {
			console.error('Invalid seed provided:', seed)
			seed = Math.floor(Math.random() * 2147483647)
		}

		this.worldSeed = seed
		this.seedGenerator.setSeed(seed)
		console.log(`World seed set to: ${seed}`)

		// Reset world changes for the new seed
		this.worldChanges = {
			brokenBlocks: {},
			openedChests: {},
			placedLadders: {},
		}

		return seed
	}

	// Load world data from saved state - add more robust error handling
	loadWorld(worldData) {
		if (!worldData) {
			console.error('Invalid world data provided, creating new world')
			this.newWorld()
			return
		}

		try {
			// Set the seed
			if (!worldData.seed) {
				console.warn('No seed in world data, generating new seed')
				this.worldSeed = this.seedGenerator.newSeed()
			} else {
				this.worldSeed = worldData.seed
			}

			// Initialize the world map with this seed
			this.worldMap.initializeMap(this.worldSeed)

			// CRITICAL FIX: Ensure broken blocks are correctly copied
			if (!worldData.changes) {
				console.warn('No changes in world data, resetting changes')
				this.resetChanges()
			} else {
				console.log('Loading world changes...')

				// Create a shallow copy of broken blocks from the save data
				const brokenBlocks = { ...(worldData.changes.brokenBlocks || {}) }
				const blockKeys = Object.keys(brokenBlocks)

				console.log(`Found ${blockKeys.length} broken blocks in save file`)

				// Explicitly copy each block state to ensure proper loading
				this.worldChanges = {
					brokenBlocks: {}, // Start fresh
					openedChests: worldData.changes.openedChests || {},
					placedLadders: worldData.changes.placedLadders || {},
				}

				// Copy each broken block explicitly to ensure proper format
				blockKeys.forEach(key => {
					if (brokenBlocks[key]) {
						this.worldChanges.brokenBlocks[key] = true
					}
				})

				// Verify broken blocks were correctly copied
				const loadedCount = Object.keys(this.worldChanges.brokenBlocks).length
				if (loadedCount !== blockKeys.length) {
					console.error(
						`Failed to load all broken blocks: expected ${blockKeys.length} but got ${loadedCount}`
					)
				} else {
					console.log(`Successfully loaded ${loadedCount} broken blocks`)
				}

				// Print samples of the actual data for verification
				this.debugWorldChanges()
			}

			console.log('Loaded world with seed:', this.worldSeed)
		} catch (error) {
			console.error('Error loading world data:', error)
			this.newWorld()
		}
	}

	// Reset all changes tracking
	resetChanges() {
		this.worldChanges = {
			brokenBlocks: {},
			openedChests: {},
			placedLadders: {},
		}
	}

	// Get world data for saving
	getWorldData() {
		// Count changes for debugging
		const brokenCount = Object.keys(this.worldChanges.brokenBlocks).length
		const chestCount = Object.keys(this.worldChanges.openedChests).length
		const ladderCount = Object.keys(this.worldChanges.placedLadders).length

		console.log(
			`Saving world with seed ${this.worldSeed} and changes: ${brokenCount} broken blocks, ${chestCount} opened chests, ${ladderCount} placed ladders`
		)

		return {
			seed: this.worldSeed,
			changes: this.worldChanges,
		}
	}

	// Mark a block as broken - ensure consistent coordinate formatting
	markBlockBroken(x, y) {
		// CRITICAL FIX: Make sure coordinates are integers and format key consistently
		const gridX = Math.floor(Number(x))
		const gridY = Math.floor(Number(y))
		const key = `${gridX},${gridY}`

		this.worldChanges.brokenBlocks[key] = true
		console.log(`Marked block broken at ${gridX},${gridY} (key: ${key})`)
	}

	// Check if a block is broken - ensure same coordinate handling
	isBlockBroken(x, y) {
		// CRITICAL FIX: Format key the same exact way
		const gridX = Math.floor(Number(x))
		const gridY = Math.floor(Number(y))
		const key = `${gridX},${gridY}`

		// CRITICAL FIX: More explicit check with debug logging
		const isBroken =
			this.worldChanges.brokenBlocks &&
			this.worldChanges.brokenBlocks[key] === true

		// Periodically log to verify correct operation
		if (Math.random() < 0.001 || isBroken) {
			console.log(`Check block at ${key}: ${isBroken ? 'BROKEN' : 'intact'}`)
		}

		return isBroken
	}

	// Mark a chest as opened
	markChestOpened(x, y) {
		const key = `${x},${y}`
		this.worldChanges.openedChests[key] = true
	}

	// Check if a chest is opened
	isChestOpened(x, y) {
		const key = `${x},${y}`
		return this.worldChanges.openedChests[key] === true
	}

	// Add a placed ladder - enhance with better debugging
	addLadder(x, y) {
		const key = `${x},${y}`
		this.worldChanges.placedLadders[key] = true
		console.log(`Ladder placed at ${x}, ${y}`)
	}

	// Check if there's a ladder at position - enhance with better logging
	hasLadder(x, y) {
		const key = `${x},${y}`
		return this.worldChanges.placedLadders[key] === true
	}

	// Enhanced debugging method to print world state
	debugWorldState() {
		const brokenCount = Object.keys(this.worldChanges.brokenBlocks).length
		const chestCount = Object.keys(this.worldChanges.openedChests).length
		const ladderCount = Object.keys(this.worldChanges.placedLadders).length

		console.log(`===== WORLD STATE =====`)
		console.log(`Seed: ${this.worldSeed}`)
		console.log(`Broken blocks: ${brokenCount}`)
		console.log(`Opened chests: ${chestCount}`)
		console.log(`Placed ladders: ${ladderCount}`)

		// Print some sample broken blocks for debugging
		let brokenSamples = Object.keys(this.worldChanges.brokenBlocks).slice(0, 5)
		if (brokenSamples.length > 0) {
			console.log(`Sample broken blocks: ${brokenSamples.join(', ')}`)
		}

		// Print some sample ladders for debugging
		let ladderSamples = Object.keys(this.worldChanges.placedLadders).slice(0, 5)
		if (ladderSamples.length > 0) {
			console.log(`Sample ladders: ${ladderSamples.join(', ')}`)
		}

		console.log(`=======================`)
	}

	// More detailed debug to help diagnose issues
	debugWorldChanges() {
		const brokenKeys = Object.keys(this.worldChanges.brokenBlocks)
		const chestKeys = Object.keys(this.worldChanges.openedChests)
		const ladderKeys = Object.keys(this.worldChanges.placedLadders)

		console.log(`===== DETAILED WORLD CHANGES =====`)
		console.log(
			`Broken blocks (${brokenKeys.length}): `,
			brokenKeys.length
				? brokenKeys.slice(0, 10).join(', ') +
						(brokenKeys.length > 10 ? '...' : '')
				: 'none'
		)
		console.log(
			`Opened chests (${chestKeys.length}): `,
			chestKeys.length
				? chestKeys.slice(0, 5).join(', ') + (chestKeys.length > 5 ? '...' : '')
				: 'none'
		)
		console.log(
			`Placed ladders (${ladderKeys.length}): `,
			ladderKeys.length
				? ladderKeys.slice(0, 5).join(', ') +
						(ladderKeys.length > 5 ? '...' : '')
				: 'none'
		)
	}
}
