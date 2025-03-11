/**
 * Deterministic random number generator for world generation
 */
export class SeedGenerator {
	constructor(seed = null) {
		// Use the provided seed or generate one
		this.seed = seed || Math.floor(Math.random() * 2147483647)

		// Create a separate random state for each level of generation
		this._mainState = this.seed
		this._terrainState = this.seed
		this._resourceState = this.seed
		this._chestState = this.seed
		this._structureState = this.seed

		console.log(`SeedGenerator initialized with seed: ${this.seed}`)
	}

	/**
	 * Main random generator using xorshift algorithm - more reliable than Park-Miller
	 * for longer sequences of random numbers
	 */
	random() {
		// Xorshift algorithm
		let x = this._mainState
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		this._mainState = x

		// Normalize to [0, 1)
		return (x & 0x7fffffff) / 0x80000000
	}

	/**
	 * Get a random integer specific to terrain generation
	 */
	terrainRandom(min, max) {
		min = Math.ceil(min)
		max = Math.floor(max)

		// Use xorshift for terrain
		let x = this._terrainState
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		this._terrainState = x

		// Convert to range and return as integer
		return Math.floor(((x & 0x7fffffff) / 0x80000000) * (max - min + 1)) + min
	}

	/**
	 * Get a random integer specific to resource placement
	 */
	resourceRandom(min, max) {
		min = Math.ceil(min)
		max = Math.floor(max)

		// Use xorshift for resources
		let x = this._resourceState
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		this._resourceState = x

		// Convert to range and return as integer
		return Math.floor(((x & 0x7fffffff) / 0x80000000) * (max - min + 1)) + min
	}

	/**
	 * Get a random integer specific to chest generation
	 */
	chestRandom(min, max) {
		min = Math.ceil(min)
		max = Math.floor(max)

		// Use xorshift for chests
		let x = this._chestState
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		this._chestState = x

		// Convert to range and return as integer
		return Math.floor(((x & 0x7fffffff) / 0x80000000) * (max - min + 1)) + min
	}

	/**
	 * Get a random integer specific to structure generation
	 */
	structureRandom(min, max) {
		min = Math.ceil(min)
		max = Math.floor(max)

		// Use xorshift for structures
		let x = this._structureState
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		this._structureState = x

		// Convert to range and return as integer
		return Math.floor(((x & 0x7fffffff) / 0x80000000) * (max - min + 1)) + min
	}

	/**
	 * Generate a new seed and reset the generator
	 */
	newSeed() {
		this.seed = Math.floor(Math.random() * 2147483647)
		this.setSeed(this.seed)
		return this.seed
	}

	/**
	 * Set a specific seed and reset the generator states
	 */
	setSeed(seed) {
		this.seed = seed

		// Reset all states to the seed
		this._mainState = seed
		this._terrainState = seed
		this._resourceState = seed
		this._chestState = seed
		this._structureState = seed

		console.log(`Seed reset to: ${seed}`)
	}

	/**
	 * Get the current seed
	 */
	getSeed() {
		return this.seed
	}

	/**
	 * Reset all generators to initial states
	 */
	reset() {
		this.setSeed(this.seed)
		console.log(`SeedGenerator reset to initial state with seed: ${this.seed}`)
	}
}
