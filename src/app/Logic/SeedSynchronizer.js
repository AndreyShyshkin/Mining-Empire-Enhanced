/**
 * Utility function to verify and fix seed synchronization across the entire game
 * This file provides diagnostic tools to ensure consistent seed usage
 */

/**
 * Comprehensive check of seed consistency across all game systems
 * @returns {Object} Results of the verification
 */
export function verifySeedConsistency() {
	const result = {
		allMatch: false,
		seeds: {},
		issues: [],
	}

	try {
		console.log('=== COMPREHENSIVE SEED VERIFICATION ===')

		// Collect all seeds from various game systems
		const seeds = {
			globalSeed:
				typeof window !== 'undefined' ? window.globalGameSeed : undefined,
			worldManagerSeed: undefined,
			worldMapSeed: undefined,
			seedGeneratorSeed: undefined,
			localStorageSeed: undefined,
			gameSynchronizerSeed: undefined,
		}

		// Get WorldManager seed
		if (window.WorldManager || window.gameContainer?.WorldManager) {
			const worldManager =
				window.WorldManager || window.gameContainer.WorldManager
			seeds.worldManagerSeed = worldManager.worldSeed

			// Get SeedGenerator seed
			if (worldManager.seedGenerator) {
				seeds.seedGeneratorSeed = worldManager.seedGenerator.seed
			}

			// Get WorldMap seed
			if (worldManager.worldMap) {
				seeds.worldMapSeed = worldManager.worldMap.worldSeed
			}
		}

		// Get GameSynchronizer seed
		if (window.GameSynchronizer || window.gameContainer?.GameSynchronizer) {
			const gameSynchronizer =
				window.GameSynchronizer || window.gameContainer.GameSynchronizer
			seeds.gameSynchronizerSeed = gameSynchronizer.seed
		}

		// Get localStorage seed
		try {
			const storedSeed = localStorage.getItem('mining-empire-seed')
			if (storedSeed && !isNaN(Number(storedSeed))) {
				seeds.localStorageSeed = Number(storedSeed)
			}
		} catch (err) {
			console.warn('Failed to access localStorage for seed verification:', err)
		}

		// Store all collected seeds
		result.seeds = seeds

		// Log all seeds
		console.log('Collected seeds:', seeds)

		// Find primary seed (use globalSeed if available, otherwise find most common value)
		const primarySeed = findPrimarySeed(seeds)
		console.log('Primary seed determined to be:', primarySeed)

		if (primarySeed === null || typeof primarySeed !== 'number') {
			result.issues.push('No valid primary seed could be determined')
			return result
		}

		// Check if all seeds match the primary seed
		const mismatchedSystems = findMismatchedSeeds(seeds, primarySeed)
		if (mismatchedSystems.length > 0) {
			result.issues.push(
				`Seed mismatches found in: ${mismatchedSystems.join(', ')}`
			)
			result.mismatchedSystems = mismatchedSystems
			result.primarySeed = primarySeed
		} else {
			result.allMatch = true
			result.primarySeed = primarySeed
		}

		return result
	} catch (error) {
		console.error('Error in verifySeedConsistency:', error)
		result.issues.push(`Verification error: ${error.message}`)
		return result
	}
}

/**
 * Determine the primary seed value from all collected seeds
 * @param {Object} seeds Collection of seeds from different systems
 * @returns {number|null} The primary seed or null if none can be determined
 */
function findPrimarySeed(seeds) {
	// First, try to use globalSeed as the primary seed
	if (typeof seeds.globalSeed === 'number' && !isNaN(seeds.globalSeed)) {
		return seeds.globalSeed
	}

	// If no global seed, collect all valid seeds
	const validSeeds = []
	for (const key in seeds) {
		if (typeof seeds[key] === 'number' && !isNaN(seeds[key])) {
			validSeeds.push(seeds[key])
		}
	}

	if (validSeeds.length === 0) {
		return null
	}

	// Find the most common seed value
	const seedCounts = {}
	let maxCount = 0
	let mostCommonSeed = null

	for (const seed of validSeeds) {
		seedCounts[seed] = (seedCounts[seed] || 0) + 1
		if (seedCounts[seed] > maxCount) {
			maxCount = seedCounts[seed]
			mostCommonSeed = seed
		}
	}

	return mostCommonSeed
}

/**
 * Find which systems have mismatched seeds
 * @param {Object} seeds Collection of seeds from different systems
 * @param {number} primarySeed The primary seed to compare against
 * @returns {string[]} Array of system names with mismatched seeds
 */
function findMismatchedSeeds(seeds, primarySeed) {
	const mismatched = []

	for (const key in seeds) {
		if (seeds[key] !== undefined && seeds[key] !== primarySeed) {
			mismatched.push(key)
		}
	}

	return mismatched
}

/**
 * Fix seed inconsistencies by synchronizing all systems to the primary seed
 * @param {Object} result Result from verifySeedConsistency
 * @returns {boolean} True if fixes were applied
 */
export function fixSeedInconsistencies(result) {
	if (
		!result ||
		!result.primarySeed ||
		typeof result.primarySeed !== 'number'
	) {
		console.error('Cannot fix seed inconsistencies: No valid primary seed')
		return false
	}

	const primarySeed = result.primarySeed
	console.log(`Fixing seed inconsistencies using primary seed: ${primarySeed}`)

	try {
		// Set global seed
		if (typeof window !== 'undefined') {
			window.globalGameSeed = primarySeed
		}

		// Update localStorage
		try {
			localStorage.setItem('mining-empire-seed', primarySeed.toString())
		} catch (err) {
			console.warn('Failed to update localStorage seed:', err)
		}

		// Update WorldManager and related systems
		if (window.WorldManager || window.gameContainer?.WorldManager) {
			const worldManager =
				window.WorldManager || window.gameContainer.WorldManager
			worldManager.setSeed(primarySeed)
		}

		// Update GameSynchronizer
		if (window.GameSynchronizer || window.gameContainer?.GameSynchronizer) {
			const gameSynchronizer =
				window.GameSynchronizer || window.gameContainer.GameSynchronizer
			gameSynchronizer.seed = primarySeed

			// Request seed confirmation from server
			if (gameSynchronizer.socket && gameSynchronizer.isActive) {
				gameSynchronizer.socket.emit('request_seed_confirmation', {
					currentSeed: primarySeed,
				})
			}
		}

		// Log completion
		console.log('Seed synchronization completed')

		// Verify the fixes worked
		const verificationResult = verifySeedConsistency()
		console.log('Verification after fix:', verificationResult)

		return verificationResult.allMatch
	} catch (error) {
		console.error('Error fixing seed inconsistencies:', error)
		return false
	}
}
