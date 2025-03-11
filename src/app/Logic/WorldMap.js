import { SeedGenerator } from './SeedGenerator'

/**
 * WorldMap class caches the generated world based on seed
 * This ensures the world is identical each time it's loaded with the same seed
 */
export class WorldMap {
	static instance = null

	constructor() {
		if (WorldMap.instance) {
			return WorldMap.instance
		}

		this.worldSeed = null
		this.seedGenerator = null
		this.mapData = {
			terrain: {}, // Basic terrain type at each x,y
			resources: {}, // Resource types at x,y positions
			structures: {}, // Special structures like chest rooms
		}

		WorldMap.instance = this
	}

	static getInstance() {
		if (!WorldMap.instance) {
			WorldMap.instance = new WorldMap()
		}
		return WorldMap.instance
	}

	/**
	 * Initialize or reset the world map with a seed
	 */
	initializeMap(seed) {
		console.log(`Initializing world map with seed: ${seed}`)
		this.worldSeed = seed
		this.seedGenerator = new SeedGenerator(seed)

		// Clear existing map data
		this.mapData = {
			terrain: {},
			resources: {},
			structures: {},
		}

		// Generate the full map
		this.generateWorldMap()
	}

	/**
	 * Pregenerate the entire world map
	 * This makes world loading much faster and ensures consistency
	 */
	generateWorldMap() {
		console.log('Pre-generating world map...')

		// Reset the seed generator to ensure consistent generation
		this.seedGenerator.reset()

		// Generate the basic terrain first (all regular blocks)
		this.generateBasicTerrain()

		// Then generate special structures (like chest rooms)
		this.generateStructures()

		// Finally add resources based on depth and randomness
		this.generateResources()

		console.log('World map generation complete')
	}

	/**
	 * Generate the basic terrain blocks for the whole map
	 */
	generateBasicTerrain() {
		// Generate from y=6 to y=1000, our standard world height
		for (let y = 6; y < 1000; y++) {
			for (let x = -62; x < 62; x++) {
				const key = `${x},${y}`

				// Surface layer (grass)
				if (y === 6) {
					this.mapData.terrain[key] = {
						type: 'grass',
						image: 'lvl1_grass',
						hp: x >= -50 && x <= 50 ? 5 : 10000,
					}
				}
				// Near surface (upper dirt)
				else if (y < 10) {
					this.mapData.terrain[key] = {
						type: 'dirt',
						image: 'lvl1',
						hp: x >= -50 && x <= 50 ? 5 : 10000,
					}
				}
				// Deeper layers
				else {
					// Determine block type based on depth
					let blockType
					let blockHp

					if (y < 50) {
						blockType = 'lvl1'
						blockHp = 5
					} else if (y < 150) {
						blockType = 'lvl2'
						blockHp = 15
					} else if (y < 250) {
						blockType = 'lvl3'
						blockHp = 25
					} else if (y < 350) {
						blockType = 'lvl4'
						blockHp = 35
					} else {
						blockType = 'lvl5'
						blockHp = 45
					}

					// Border blocks are much stronger
					if (x < -50 || x > 50) {
						blockHp = 10000
					}

					this.mapData.terrain[key] = {
						type: 'rock',
						image: blockType,
						hp: blockHp,
					}
				}
			}
		}
	}

	/**
	 * Generate special structures like chest rooms
	 */
	generateStructures() {
		// Generate from y=15 to y=950
		for (let y = 15; y < 950; y++) {
			for (let x = -40; x < 40; x++) {
				// Use structure-specific random generation for consistency
				const shouldCreateStructure =
					this.seedGenerator.structureRandom(1, 2000) === 1

				if (shouldCreateStructure) {
					// Create a chest room structure
					this.createChestRoomStructure(x, y)
				}
			}
		}
	}

	/**
	 * Create a chest room structure at the given coordinates
	 */
	createChestRoomStructure(xStart, yStart) {
		// Generate a 4x9 room with a chest
		for (let a = 0; a < 4; a++) {
			const y = a === 0 ? yStart : yStart - a

			for (let i = 0; i < 9; i++) {
				const x = i === 0 ? xStart : xStart - i
				const key = `${x},${y}`

				// Place chest in the middle of the first row
				if (a === 0 && i === 3) {
					this.mapData.structures[key] = {
						type: 'chest',
						image: 'chest',
					}
				} else {
					// Place cross decoration everywhere else
					this.mapData.structures[key] = {
						type: 'cross',
						image: 'cross',
					}
				}

				// Set appropriate background based on depth
				let bgImage
				if (y < 50) bgImage = 'lvl1bg'
				else if (y < 150) bgImage = 'lvl2bg'
				else if (y < 250) bgImage = 'lvl3bg'
				else if (y < 350) bgImage = 'lvl4bg'
				else bgImage = 'lvl5bg'

				// Mark this location as having a structure (replaces terrain)
				this.mapData.terrain[key] = {
					type: 'background',
					image: bgImage,
					hp: 0,
				}
			}
		}
	}

	/**
	 * Generate resources throughout the world
	 */
	generateResources() {
		// Generate resources from y=10 to y=1000
		for (let y = 10; y < 1000; y++) {
			for (let x = -50; x < 50; x++) {
				const key = `${x},${y}`

				// Skip if this is part of a structure or outside valid resource area
				if (
					this.mapData.structures[key] ||
					!this.mapData.terrain[key] ||
					this.mapData.terrain[key].type === 'background'
				) {
					continue
				}

				// Use resource-specific random generation for consistency
				const resourceRoll = this.seedGenerator.resourceRandom(1, 100)

				// Different resource distribution based on depth
				if (y < 50) {
					if (resourceRoll < 2) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl1_res2',
							hp: 6,
						}
					} else if (resourceRoll < 5) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl1_res1',
							hp: 7,
						}
					}
				} else if (y < 150) {
					if (resourceRoll < 2) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl2_res3',
							hp: 18,
						}
					} else if (resourceRoll < 5) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl2_res1',
							hp: 16,
						}
					} else if (resourceRoll < 10) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl2_res2',
							hp: 17,
						}
					}
				} else if (y < 250) {
					if (resourceRoll < 2) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl3_res4',
							hp: 28,
						}
					} else if (resourceRoll < 5) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl3_res3',
							hp: 27,
						}
					} else if (resourceRoll < 10) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl3_res2',
							hp: 26,
						}
					}
				} else if (y < 350) {
					if (resourceRoll < 2) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl4_res5',
							hp: 38,
						}
					} else if (resourceRoll < 5) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl4_res4',
							hp: 37,
						}
					} else if (resourceRoll < 10) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl4_res3',
							hp: 36,
						}
					}
				} else {
					if (resourceRoll < 2) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl5_res6',
							hp: 48,
						}
					} else if (resourceRoll < 5) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl5_res5',
							hp: 47,
						}
					} else if (resourceRoll < 10) {
						this.mapData.resources[key] = {
							type: 'resource',
							image: 'lvl5_res4',
							hp: 46,
						}
					}
				}
			}
		}
	}

	/**
	 * Get the block information at a specific position
	 */
	getBlockAt(x, y) {
		const key = `${x},${y}`

		// Check for structures first (chests, etc.)
		if (this.mapData.structures[key]) {
			return this.mapData.structures[key]
		}

		// Check for resources next
		if (this.mapData.resources[key]) {
			return this.mapData.resources[key]
		}

		// Return the base terrain as a fallback
		return this.mapData.terrain[key] || null
	}

	/**
	 * Get the background image to use for a broken block at the given depth
	 */
	getBackgroundForDepth(y) {
		if (y < 50) return 'lvl1bg'
		if (y < 150) return 'lvl2bg'
		if (y < 250) return 'lvl3bg'
		if (y < 350) return 'lvl4bg'
		return 'lvl5bg'
	}
}
