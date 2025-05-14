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

	// Set a specific seed for a new world with enhanced validation
	setSeed(seed) {
		// Perform strict seed validation
		if (typeof seed !== 'number' || isNaN(seed) || !isFinite(seed)) {
			console.error('Invalid seed provided:', seed)

			// Try to recover from global seed
			if (
				typeof window !== 'undefined' &&
				window.globalGameSeed &&
				typeof window.globalGameSeed === 'number'
			) {
				console.log(`Recovering from global seed: ${window.globalGameSeed}`)
				seed = window.globalGameSeed
			}
			// Try to recover from localStorage
			else if (typeof localStorage !== 'undefined') {
				try {
					const storedSeed = localStorage.getItem('mining-empire-seed')
					if (storedSeed && !isNaN(Number(storedSeed))) {
						seed = Number(storedSeed)
						console.log(`Recovered seed from localStorage: ${seed}`)
					}
				} catch (err) {
					console.warn('Failed to recover seed from localStorage:', err)
				}
			}

			// If still invalid, generate a new seed
			if (typeof seed !== 'number' || isNaN(seed) || !isFinite(seed)) {
				seed = Math.floor(Math.random() * 2147483647)
				console.log(`Generated new emergency seed: ${seed}`)
			}
		}

		// Store the validated seed
		this.worldSeed = seed

		// Make sure the seed generator is using the same seed
		this.seedGenerator.setSeed(seed)

		// CRITICAL FIX: Ensure WorldMap is also updated with the same seed
		if (this.worldMap) {
			console.log(`Ensuring WorldMap uses the same seed: ${seed}`)
			this.worldMap.initializeMap(seed)
		}

		console.log(`World seed set to: ${seed}`)

		// Update global seed for consistency across the application
		if (typeof window !== 'undefined') {
			window.globalGameSeed = seed

			// Update seed display if possible
			if (typeof window.updateSeedDisplay === 'function') {
				window.updateSeedDisplay(seed)
			}

			// Store in localStorage for recovery
			try {
				localStorage.setItem('mining-empire-seed', seed.toString())
			} catch (err) {
				console.warn('Could not store seed in localStorage:', err)
			}
		}

		// Reset worldChanges for new seed
		this.worldChanges = {
			brokenBlocks: {},
			openedChests: {},
			placedLadders: {},
		}

		// Initialize the world map with our new seed
		this.worldMap.initializeMap(seed)

		return seed
	}

	// Get the current world seed with validation
	getSeed() {
		// Verify seed is valid
		if (this.worldSeed === null || this.worldSeed === undefined) {
			console.warn('Attempting to get seed, but it is not set')

			// Try to recover from global seed
			if (
				typeof window !== 'undefined' &&
				window.globalGameSeed &&
				typeof window.globalGameSeed === 'number'
			) {
				console.log(`Recovering seed from global: ${window.globalGameSeed}`)
				this.worldSeed = window.globalGameSeed
			} else {
				this.worldSeed = this.seedGenerator.newSeed()
				console.log(`Generated new emergency seed: ${this.worldSeed}`)
			}
		}
		return this.worldSeed
	}

	// This is called when player breaks a block
	markBlockBroken(x, y) {
		const gridX = Math.floor(Number(x))
		const gridY = Math.floor(Number(y))
		const key = `${gridX},${gridY}`

		// Only mark if not already broken
		if (!this.worldChanges.brokenBlocks[key]) {
			this.worldChanges.brokenBlocks[key] = true
			// Block was broken - notify multiplayer session
			this.notifyWorldChange({
				type: 'blockBroken',
				position: { x: gridX, y: gridY },
				key: key,
			})
			return true
		}
		return false
	}

	// Check if a block is broken
	isBlockBroken(x, y) {
		const gridX = Math.floor(Number(x))
		const gridY = Math.floor(Number(y))
		const key = `${gridX},${gridY}`

		const isBroken =
			this.worldChanges.brokenBlocks &&
			this.worldChanges.brokenBlocks[key] === true

		return isBroken
	}

	// Mark a chest as opened
	markChestOpened(x, y) {
		const gridX = Math.floor(Number(x))
		const gridY = Math.floor(Number(y))
		const key = `${gridX},${gridY}`

		// Only mark if not already opened
		if (!this.worldChanges.openedChests[key]) {
			this.worldChanges.openedChests[key] = true

			// Chest was opened - notify multiplayer session
			this.notifyWorldChange({
				type: 'chestOpened',
				position: { x: gridX, y: gridY },
				key: key,
			})
			return true
		}
		return false
	}

	// Check if a chest is opened - ensure coordinate normalization
	isChestOpened(x, y) {
		// CRITICAL FIX: Format key the same exact way as when marking as opened
		const gridX = Math.floor(Number(x))
		const gridY = Math.floor(Number(y))
		const key = `${gridX},${gridY}`

		// More explicit check
		const isOpened =
			this.worldChanges.openedChests &&
			this.worldChanges.openedChests[key] === true

		// Periodically log for verification
		if (Math.random() < 0.001 || isOpened) {
			console.log(`Check chest at ${key}: ${isOpened ? 'OPENED' : 'unopened'}`)
		}

		return isOpened
	}

	// Add a placed ladder with improved consistency and debugging
	addLadder(x, y) {
		const gridX = Math.floor(Number(x))
		const gridY = Math.floor(Number(y))
		const key = `${gridX},${gridY}`
		this.worldChanges.placedLadders[key] = true
		console.log(`Ladder placed at ${gridX}, ${gridY}`)

		// Notify multiplayer session
		this.notifyWorldChange({
			type: 'ladderPlaced',
			position: { x: gridX, y: gridY },
			key: key,
		})
	}

	// Check if there's a ladder at position with consistent coordinate handling
	hasLadder(x, y) {
		// CRITICAL FIX: Format key the same exact way as when adding a ladder
		const gridX = Math.floor(Number(x))
		const gridY = Math.floor(Number(y))
		const key = `${gridX},${gridY}`

		// More explicit check
		const hasLadder =
			this.worldChanges.placedLadders &&
			this.worldChanges.placedLadders[key] === true

		// Periodically log for verification
		if (Math.random() < 0.001 || hasLadder) {
			console.log(`Check ladder at ${key}: ${hasLadder ? 'PRESENT' : 'absent'}`)
		}

		return hasLadder
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

	// Enhanced detailed debug to help diagnose synchronization issues
	debugWorldChanges() {
		const brokenKeys = Object.keys(this.worldChanges.brokenBlocks || {})
		const chestKeys = Object.keys(this.worldChanges.openedChests || {})
		const ladderKeys = Object.keys(this.worldChanges.placedLadders || {})

		console.log(`===== DETAILED WORLD CHANGES =====`)
		console.log(`World seed: ${this.worldSeed} (${typeof this.worldSeed})`)
		console.log(
			`Global seed: ${window.globalGameSeed} (${typeof window.globalGameSeed})`
		)
		console.log(`Time: ${new Date().toISOString()}`)

		// Calculate some statistics about the coordinates
		let brokenBlockStats = this.analyzeCoordinates(brokenKeys)
		let chestStats = this.analyzeCoordinates(chestKeys)
		let ladderStats = this.analyzeCoordinates(ladderKeys)

		console.log(
			`Broken blocks (${brokenKeys.length}) - X range: ${brokenBlockStats.minX} to ${brokenBlockStats.maxX}, Y range: ${brokenBlockStats.minY} to ${brokenBlockStats.maxY}: `,
			brokenKeys.length
				? brokenKeys.slice(0, 10).join(', ') +
						(brokenKeys.length > 10 ? '...' : '')
				: 'none'
		)
		console.log(
			`Opened chests (${chestKeys.length}) - X range: ${chestStats.minX} to ${chestStats.maxX}, Y range: ${chestStats.minY} to ${chestStats.maxY}: `,
			chestKeys.length
				? chestKeys.slice(0, 10).join(', ') +
						(chestKeys.length > 10 ? '...' : '')
				: 'none'
		)
		console.log(
			`Placed ladders (${ladderKeys.length}) - X range: ${ladderStats.minX} to ${ladderStats.maxX}, Y range: ${ladderStats.minY} to ${ladderStats.maxY}: `,
			ladderKeys.length
				? ladderKeys.slice(0, 10).join(', ') +
						(ladderKeys.length > 10 ? '...' : '')
				: 'none'
		)

		console.log('=============================')
	}

	// Import world changes from external source (like multiplayer)
	// with improved validation and consistency
	importWorldChanges(changesData) {
		if (!changesData) {
			console.warn('No changes data provided to import')
			return false
		}

		let changesApplied = 0
		let invalidChanges = 0

		// Process broken blocks
		if (
			changesData.brokenBlocks &&
			typeof changesData.brokenBlocks === 'object'
		) {
			for (const key in changesData.brokenBlocks) {
				if (changesData.brokenBlocks[key] === true) {
					const [xStr, yStr] = key.split(',')
					const x = Math.floor(Number(xStr))
					const y = Math.floor(Number(yStr))

					// Validate coordinates
					if (isNaN(x) || isNaN(y)) {
						invalidChanges++
						continue
					}

					const formattedKey = `${x},${y}`
					if (!this.worldChanges.brokenBlocks[formattedKey]) {
						this.worldChanges.brokenBlocks[formattedKey] = true
						changesApplied++
					}
				}
			}
		}

		// Process opened chests
		if (
			changesData.openedChests &&
			typeof changesData.openedChests === 'object'
		) {
			for (const key in changesData.openedChests) {
				if (changesData.openedChests[key] === true) {
					const [xStr, yStr] = key.split(',')
					const x = Math.floor(Number(xStr))
					const y = Math.floor(Number(y))

					// Validate coordinates
					if (isNaN(x) || isNaN(y)) {
						invalidChanges++
						continue
					}

					const formattedKey = `${x},${y}`
					if (!this.worldChanges.openedChests[formattedKey]) {
						this.worldChanges.openedChests[formattedKey] = true
						changesApplied++
					}
				}
			}
		}

		// Process placed ladders
		if (
			changesData.placedLadders &&
			typeof changesData.placedLadders === 'object'
		) {
			for (const key in changesData.placedLadders) {
				if (changesData.placedLadders[key] === true) {
					const [xStr, yStr] = key.split(',')
					const x = Math.floor(Number(xStr))
					const y = Math.floor(Number(y))

					// Validate coordinates
					if (isNaN(x) || isNaN(y)) {
						invalidChanges++
						continue
					}

					const formattedKey = `${x},${y}`
					if (!this.worldChanges.placedLadders[formattedKey]) {
						this.worldChanges.placedLadders[formattedKey] = true
						changesApplied++
					}
				}
			}
		}

		if (invalidChanges > 0) {
			console.warn(`Ignored ${invalidChanges} invalid changes during import`)
		}

		console.log(`Imported ${changesApplied} world changes`)
		return changesApplied > 0
	}

	// Get world data for saving
	getWorldData() {
		// This method provides world data for saving functionality
		// It returns the same structure as getExportableState
		return this.getExportableState()
	}

	// Load world data (from save or network)
	loadWorld(worldData) {
		if (!worldData) {
			console.error('Invalid world data provided to loadWorld')
			return false
		}

		try {
			// Load the seed and ensure world map is initialized
			if (worldData.seed !== undefined && worldData.seed !== null) {
				this.setSeed(worldData.seed)
			} else {
				console.warn('World data missing seed, using current seed')
			}

			// Reset world changes before loading
			this.worldChanges = {
				brokenBlocks: {},
				openedChests: {},
				placedLadders: {},
			}

			// Handle broken blocks
			if (
				worldData.brokenBlocks &&
				typeof worldData.brokenBlocks === 'object'
			) {
				for (const key in worldData.brokenBlocks) {
					if (worldData.brokenBlocks[key] === true) {
						const [xStr, yStr] = key.split(',')
						const x = Math.floor(Number(xStr))
						const y = Math.floor(Number(yStr))

						// Validate coordinates
						if (!isNaN(x) && !isNaN(y)) {
							const formattedKey = `${x},${y}`
							this.worldChanges.brokenBlocks[formattedKey] = true
						}
					}
				}
			}

			// Handle opened chests
			if (
				worldData.openedChests &&
				typeof worldData.openedChests === 'object'
			) {
				for (const key in worldData.openedChests) {
					if (worldData.openedChests[key] === true) {
						const [xStr, yStr] = key.split(',')
						const x = Math.floor(Number(xStr))
						const y = Math.floor(Number(yStr))

						// Validate coordinates
						if (!isNaN(x) && !isNaN(y)) {
							const formattedKey = `${x},${y}`
							this.worldChanges.openedChests[formattedKey] = true
						}
					}
				}
			}

			// Handle placed ladders
			if (
				worldData.placedLadders &&
				typeof worldData.placedLadders === 'object'
			) {
				for (const key in worldData.placedLadders) {
					if (worldData.placedLadders[key] === true) {
						const [xStr, yStr] = key.split(',')
						const x = Math.floor(Number(xStr))
						const y = Math.floor(Number(yStr))

						// Validate coordinates
						if (!isNaN(x) && !isNaN(y)) {
							const formattedKey = `${x},${y}`
							this.worldChanges.placedLadders[formattedKey] = true
						}
					}
				}
			}

			console.log(`Successfully loaded world with seed ${this.worldSeed}`)
			console.log(
				`Broken blocks: ${Object.keys(this.worldChanges.brokenBlocks).length}`
			)
			console.log(
				`Opened chests: ${Object.keys(this.worldChanges.openedChests).length}`
			)
			console.log(
				`Placed ladders: ${Object.keys(this.worldChanges.placedLadders).length}`
			)

			return true
		} catch (error) {
			console.error('Failed to load world data:', error)
			return false
		}
	}

	// Get compact object for network transfer
	getExportableState() {
		return {
			seed: this.worldSeed,
			brokenBlocks: { ...this.worldChanges.brokenBlocks },
			openedChests: { ...this.worldChanges.openedChests },
			placedLadders: { ...this.worldChanges.placedLadders },
		}
	}

	// Handle a world change notification from another source (e.g., another player)
	handleRemoteWorldChange(change) {
		if (!change || !change.type || !change.position) return false

		try {
			const x = Math.floor(Number(change.position.x))
			const y = Math.floor(Number(change.position.y))

			// Ensure coordinates are valid
			if (isNaN(x) || isNaN(y)) {
				console.warn('Invalid coordinates in remote world change:', change)
				return false
			}

			const key = `${x},${y}`

			switch (change.type) {
				case 'blockBroken':
					if (!this.worldChanges.brokenBlocks[key]) {
						this.worldChanges.brokenBlocks[key] = true
						console.log(`Remote block broken at ${x},${y}`)
						return true
					}
					break

				case 'chestOpened':
					if (!this.worldChanges.openedChests[key]) {
						this.worldChanges.openedChests[key] = true
						console.log(`Remote chest opened at ${x},${y}`)
						return true
					}
					break

				case 'ladderPlaced':
					if (!this.worldChanges.placedLadders[key]) {
						this.worldChanges.placedLadders[key] = true
						console.log(`Remote ladder placed at ${x},${y}`)
						return true
					}
					break

				default:
					console.warn('Unknown change type:', change.type)
					return false
			}

			return false
		} catch (err) {
			console.error('Error processing remote world change:', err)
			return false
		}
	}

	// Notify about a world change (to be implemented by game manager)
	notifyWorldChange(change) {
		if (typeof window !== 'undefined' && window.emitWorldChange) {
			window.emitWorldChange(change)
		}
	}

	// Analyze coordinates from a set of coordinate keys
	analyzeCoordinates(keys) {
		let result = {
			minX: Infinity,
			maxX: -Infinity,
			minY: Infinity,
			maxY: -Infinity,
			uniqueXCount: 0,
			uniqueYCount: 0,
			validCoords: 0,
			invalidCoords: 0,
		}

		if (!keys || keys.length === 0) {
			return {
				minX: 0,
				maxX: 0,
				minY: 0,
				maxY: 0,
				uniqueXCount: 0,
				uniqueYCount: 0,
				validCoords: 0,
				invalidCoords: 0,
			}
		}

		const uniqueXValues = new Set()
		const uniqueYValues = new Set()

		for (const key of keys) {
			const [xStr, yStr] = key.split(',')
			const x = Number(xStr)
			const y = Number(yStr)

			if (isNaN(x) || isNaN(y)) {
				result.invalidCoords++
				continue
			}

			result.validCoords++
			uniqueXValues.add(x)
			uniqueYValues.add(y)

			result.minX = Math.min(result.minX, x)
			result.maxX = Math.max(result.maxX, x)
			result.minY = Math.min(result.minY, y)
			result.maxY = Math.max(result.maxY, y)
		}

		result.uniqueXCount = uniqueXValues.size
		result.uniqueYCount = uniqueYValues.size

		return result
	}

	// Comprehensive multiplayer synchronization verification utility
	verifyMultiplayerSynchronization(remoteWorldState) {
		console.log('--- Multiplayer Sync Verification ---')
		if (!remoteWorldState) {
			console.warn('No remote state to verify against')
			return {
				isValid: false,
				issues: ['No remote state provided'],
			}
		}

		// Verify seed
		const seedMatches = this.worldSeed === remoteWorldState.seed
		console.log(
			`Seed verification: ${seedMatches ? 'MATCH' : 'MISMATCH'} (local: ${
				this.worldSeed
			}, remote: ${remoteWorldState.seed})`
		)

		// Count states
		const localBlocksCount = Object.keys(
			this.worldChanges.brokenBlocks || {}
		).length
		const remoteBlocksCount = Object.keys(
			remoteWorldState.brokenBlocks || {}
		).length

		const localChestsCount = Object.keys(
			this.worldChanges.openedChests || {}
		).length
		const remoteChestsCount = Object.keys(
			remoteWorldState.openedChests || {}
		).length

		const localLaddersCount = Object.keys(
			this.worldChanges.placedLadders || {}
		).length
		const remoteLaddersCount = Object.keys(
			remoteWorldState.placedLadders || {}
		).length

		// Calculate differences
		const missingBlocks = this.findMissingItems(
			remoteWorldState.brokenBlocks || {},
			this.worldChanges.brokenBlocks || {}
		)
		const extraBlocks = this.findMissingItems(
			this.worldChanges.brokenBlocks || {},
			remoteWorldState.brokenBlocks || {}
		)

		const missingChests = this.findMissingItems(
			remoteWorldState.openedChests || {},
			this.worldChanges.openedChests || {}
		)
		const extraChests = this.findMissingItems(
			this.worldChanges.openedChests || {},
			remoteWorldState.openedChests || {}
		)

		const missingLadders = this.findMissingItems(
			remoteWorldState.placedLadders || {},
			this.worldChanges.placedLadders || {}
		)
		const extraLadders = this.findMissingItems(
			this.worldChanges.placedLadders || {},
			remoteWorldState.placedLadders || {}
		)

		// Generate report
		const report = {
			isValid:
				seedMatches &&
				missingBlocks.length === 0 &&
				extraBlocks.length === 0 &&
				missingChests.length === 0 &&
				extraChests.length === 0 &&
				missingLadders.length === 0 &&
				extraLadders.length === 0,
			seedMatches: seedMatches,
			blocks: {
				localCount: localBlocksCount,
				remoteCount: remoteBlocksCount,
				missing: missingBlocks.slice(0, 10),
				missingCount: missingBlocks.length,
				extra: extraBlocks.slice(0, 10),
				extraCount: extraBlocks.length,
			},
			chests: {
				localCount: localChestsCount,
				remoteCount: remoteChestsCount,
				missing: missingChests.slice(0, 10),
				missingCount: missingChests.length,
				extra: extraChests.slice(0, 10),
				extraCount: extraChests.length,
			},
			ladders: {
				localCount: localLaddersCount,
				remoteCount: remoteLaddersCount,
				missing: missingLadders.slice(0, 10),
				missingCount: missingLadders.length,
				extra: extraLadders.slice(0, 10),
				extraCount: extraLadders.length,
			},
			issues: [],
		}

		// Log detailed report
		console.log(
			`Broken blocks: Local ${localBlocksCount} / Remote ${remoteBlocksCount}`
		)
		if (missingBlocks.length > 0) {
			report.issues.push(
				`Missing ${missingBlocks.length} blocks that exist on remote`
			)
			console.log(
				`- Missing ${missingBlocks.length} blocks: ${missingBlocks
					.slice(0, 5)
					.join(', ')}${missingBlocks.length > 5 ? '...' : ''}`
			)
		}
		if (extraBlocks.length > 0) {
			report.issues.push(
				`Have ${extraBlocks.length} blocks that don't exist on remote`
			)
			console.log(
				`- Extra ${extraBlocks.length} blocks: ${extraBlocks
					.slice(0, 5)
					.join(', ')}${extraBlocks.length > 5 ? '...' : ''}`
			)
		}

		console.log(
			`Opened chests: Local ${localChestsCount} / Remote ${remoteChestsCount}`
		)
		if (missingChests.length > 0) {
			report.issues.push(
				`Missing ${missingChests.length} chests that exist on remote`
			)
			console.log(
				`- Missing ${missingChests.length} chests: ${missingChests
					.slice(0, 5)
					.join(', ')}${missingChests.length > 5 ? '...' : ''}`
			)
		}
		if (extraChests.length > 0) {
			report.issues.push(
				`Have ${extraChests.length} chests that don't exist on remote`
			)
			console.log(
				`- Extra ${extraChests.length} chests: ${extraChests
					.slice(0, 5)
					.join(', ')}${extraChests.length > 5 ? '...' : ''}`
			)
		}

		console.log(
			`Placed ladders: Local ${localLaddersCount} / Remote ${remoteLaddersCount}`
		)
		if (missingLadders.length > 0) {
			report.issues.push(
				`Missing ${missingLadders.length} ladders that exist on remote`
			)
			console.log(
				`- Missing ${missingLadders.length} ladders: ${missingLadders
					.slice(0, 5)
					.join(', ')}${missingLadders.length > 5 ? '...' : ''}`
			)
		}
		if (extraLadders.length > 0) {
			report.issues.push(
				`Have ${extraLadders.length} ladders that don't exist on remote`
			)
			console.log(
				`- Extra ${extraLadders.length} ladders: ${extraLadders
					.slice(0, 5)
					.join(', ')}${extraLadders.length > 5 ? '...' : ''}`
			)
		}

		if (!seedMatches) {
			report.issues.push(
				`Seed mismatch: local ${this.worldSeed}, remote ${remoteWorldState.seed}`
			)
		}

		console.log(
			`Synchronization is ${report.isValid ? 'VALID ✅' : 'INVALID ❌'}`
		)
		console.log('----------------------------------')

		return report
	}

	// Helper function to find missing items in a map
	findMissingItems(source, target) {
		const missing = []
		for (const key in source) {
			if (source[key] === true && (!target[key] || target[key] !== true)) {
				missing.push(key)
			}
		}
		return missing
	}
}
