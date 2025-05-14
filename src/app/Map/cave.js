import { Cave } from '../Entities/Cave'
import { Tile } from '../Entities/Tile'
import { Images } from '../Graphics/Images'
import { SceneManager } from '../Logic/SceneManager'
import { WorldManager } from '../Logic/WorldManager'
import { WorldMap } from '../Logic/WorldMap'
import { Vector2 } from '../Math/Vector2'
import { EntityTypes } from '../Physics/EntityTypes'

// Create a world manager instance for tracking world changes
const worldManager = WorldManager.getInstance()
const worldMap = WorldMap.getInstance()

function cave() {
	console.log('=== CAVE GENERATION STARTING ===')

	// Log original broken blocks for debugging
	const brokenBlocksMap = { ...worldManager.worldChanges.brokenBlocks }
	const brokenCount = Object.keys(brokenBlocksMap).length
	console.log(
		`Starting cave generation with ${brokenCount} broken blocks in save data`
	)

	// CRITICAL FIX WITH ENHANCED VALIDATION: Comprehensive seed check and synchronization
	const globalSeed = window.globalGameSeed
	let finalSeed = null

	console.log('=== SEED VERIFICATION FOR CAVE GENERATION ===')
	console.log(`- WorldManager seed: ${worldManager.worldSeed}`)
	console.log(`- Global seed: ${globalSeed}`)
	console.log(`- WorldMap seed: ${worldMap.worldSeed}`)
	if (worldManager.seedGenerator) {
		console.log(`- SeedGenerator seed: ${worldManager.seedGenerator.seed}`)
	}

	// Determine which seed to use, prioritizing global seed for multiplayer consistency
	if (typeof globalSeed === 'number' && !isNaN(globalSeed)) {
		finalSeed = globalSeed
		console.log(`Using global seed for consistency: ${finalSeed}`)
	} else if (
		worldManager.worldSeed &&
		typeof worldManager.worldSeed === 'number'
	) {
		finalSeed = worldManager.worldSeed
		console.log(`Using WorldManager seed: ${finalSeed}`)
	} else {
		// Emergency fallback - generate new seed
		finalSeed = Math.floor(Math.random() * 2147483647)
		console.warn(`No valid seed found! Generated emergency seed: ${finalSeed}`)
	}

	// Apply the final seed to all components
	console.log(`Applying final seed ${finalSeed} to all components`)

	// 1. Set WorldManager seed (this will also update global seed)
	worldManager.setSeed(finalSeed)

	// 2. Double-check global seed was updated
	if (window.globalGameSeed !== finalSeed) {
		console.warn(`Global seed not updated correctly! Fixing...`)
		window.globalGameSeed = finalSeed
	}

	// 3. Force update the WorldMap with the final seed
	worldMap.initializeMap(finalSeed)

	// 4. Store in localStorage for recovery
	try {
		localStorage.setItem('mining-empire-seed', finalSeed.toString())
		console.log(`Saved seed ${finalSeed} to localStorage`)
	} catch (err) {
		console.warn('Failed to save seed to localStorage:', err)
	}

	// FINAL VERIFICATION: Log all seeds to confirm synchronization
	console.log(`=== FINAL SEED VERIFICATION ===`)
	console.log(`- WorldManager seed: ${worldManager.worldSeed}`)
	console.log(`- Global seed: ${window.globalGameSeed}`)
	console.log(`- WorldMap seed: ${worldMap.worldSeed}`)
	if (worldManager.seedGenerator) {
		console.log(`- SeedGenerator seed: ${worldManager.seedGenerator.seed}`)
	}
	console.log(`Cave will be generated with seed: ${finalSeed}`)

	// Clear existing entities to prevent duplicates
	SceneManager.Instance.mine.Entities = []

	// Initialize the TileContainer properly
	if (!SceneManager.Instance.mine.TC) {
		console.error('TileContainer is not initialized!')
		return
	}

	// Reset the layer container
	SceneManager.Instance.mine.TC.ClearLayers()

	// Generate trees
	for (let x = -62; x < 62; x++) {
		if (x % 4 === 0 && x !== 8) {
			tree(SceneManager.Instance.mine.Entities, x)
		}
	}

	// Add the cave entrance
	SceneManager.Instance.mine.Entities.push(
		new Cave(
			new Vector2(800, 400),
			new Vector2(300, 200),
			Images.cave,
			2,
			EntityTypes.Cave,
			SceneManager.Instance.mine
		)
	)

	// Create the world by iterating through our pre-generated map
	console.log('Building world from WorldMap cache...')
	for (let y = 6; y < 1000; y++) {
		for (let x = -62; x < 62; x++) {
			const blockKey = `${x},${y}`
			const isBlockBroken = brokenBlocksMap[blockKey] === true

			// If block is broken, just add a background tile
			if (isBlockBroken) {
				const bgImageName = worldMap.getBackgroundForDepth(y)
				const bgImage = Images[bgImageName]
				lvlBg(bgImage, SceneManager, x, y)
				continue
			}

			// Get block data from our pre-generated map
			const blockData = worldMap.getBlockAt(x, y)

			if (!blockData) {
				console.warn(`No block data at ${x}, ${y}`)
				continue
			}

			// Handle special structure blocks differently
			if (blockData.type === 'chest') {
				// Only create chest if not already opened
				if (!worldManager.isChestOpened(x, y)) {
					chest(SceneManager, x, y)
				} else {
					// If chest was opened, place background tile
					const bgImageName = worldMap.getBackgroundForDepth(y)
					const bgImage = Images[bgImageName]
					lvlBg(bgImage, SceneManager, x, y)
				}
				continue
			}

			if (blockData.type === 'cross') {
				cross(SceneManager, x, y)
				continue
			}

			if (blockData.type === 'background') {
				// Get the correct background image
				const bgImage = Images[blockData.image]
				lvlBg(bgImage, SceneManager, x, y)
				continue
			}

			// Handle resource blocks
			if (blockData.type === 'resource') {
				lvlRes(Images[blockData.image], SceneManager, x, y, blockData.hp)
				continue
			}

			// Handle grass blocks
			if (blockData.type === 'grass') {
				lvl1_grass(SceneManager, x, y, blockData.hp)
				continue
			}

			// Handle regular blocks
			lvl(Images[blockData.image], SceneManager, x, y, blockData.hp)
		}
	}

	// Restore ladders that were placed by the player
	console.log('Restoring player-placed ladders...')
	let restoredCount = 0
	for (const key in worldManager.worldChanges.placedLadders) {
		if (worldManager.worldChanges.placedLadders[key]) {
			const [x, y] = key.split(',').map(Number)
			const layer = SceneManager.Instance.mine.TC.GetLayerByPos(y * 100)
			if (layer) {
				layer.push(
					new Tile(
						new Vector2(x * 100, y * 100),
						new Vector2(100, 100),
						Images.ladder,
						3,
						EntityTypes.Ladder,
						SceneManager.Instance.mine
					)
				)
				restoredCount++
			}
		}
	}
	console.log(`Restored ${restoredCount} ladders`)

	// Mark mine as initialized
	SceneManager.Instance.mineInitialized = true
	console.log('=== CAVE GENERATION COMPLETE ===')
}

function lvl(lvlX, SceneManager, x, y, Hp) {
	const layer = SceneManager.Instance.mine.TC.GetLayer(y)
	if (layer) {
		layer.push(
			new Tile(
				new Vector2(0 + 100 * x, 100 * y),
				new Vector2(100, 100),
				lvlX,
				2,
				EntityTypes.SolidTile,
				SceneManager.Instance.mine,
				Hp
			)
		)
	} else {
		console.warn(`Could not get layer at y=${y}`)
	}
}

function lvlBg(lvlX, SceneManager, x, y) {
	const layer = SceneManager.Instance.mine.TC.GetLayer(y)
	if (layer) {
		layer.push(
			new Tile(
				new Vector2(0 + 100 * x, 100 * y),
				new Vector2(100, 100),
				lvlX,
				1,
				EntityTypes.BackGroundTile,
				SceneManager.Instance.mine
			)
		)
	} else {
		console.warn(`Could not get layer at y=${y}`)
	}
}

function lvlRes(lvlX, SceneManager, x, y, Hp) {
	const layer = SceneManager.Instance.mine.TC.GetLayer(y)
	if (layer) {
		layer.push(
			new Tile(
				new Vector2(0 + 100 * x, 100 * y),
				new Vector2(100, 100),
				lvlX,
				2,
				EntityTypes.SolidTile,
				SceneManager.Instance.mine,
				Hp
			)
		)
	} else {
		console.warn(`Could not get layer at y=${y}`)
	}
}

function lvl1_grass(SceneManager, x, y, Hp) {
	const layer = SceneManager.Instance.mine.TC.GetLayer(y)
	if (layer) {
		layer.push(
			new Tile(
				new Vector2(0 + 100 * x, 100 * y),
				new Vector2(100, 100),
				Images.lvl1_grass,
				2,
				EntityTypes.SolidTile,
				SceneManager.Instance.mine,
				Hp
			)
		)
	} else {
		console.warn(`Could not get layer at y=${y}`)
	}
}

function chest(SceneManager, x, y) {
	const layer = SceneManager.Instance.mine.TC.GetLayer(y)
	if (layer) {
		// First add the background appropriate for this depth
		const bgImageName = worldMap.getBackgroundForDepth(y)
		const bgImage = Images[bgImageName]

		// Add background tile first
		layer.push(
			new Tile(
				new Vector2(0 + 100 * x, 100 * y),
				new Vector2(100, 100),
				bgImage,
				1, // Layer 1 for background
				EntityTypes.BackGroundTile,
				SceneManager.Instance.mine
			)
		)

		// Then add chest on top
		layer.push(
			new Tile(
				new Vector2(0 + 100 * x, 100 * y),
				new Vector2(100, 100),
				Images.chest,
				2, // Layer 2 for chest
				EntityTypes.BackGroundTile,
				SceneManager.Instance.mine
			)
		)
	} else {
		console.warn(`Could not get layer at y=${y}`)
	}
}

function cross(SceneManager, x, y) {
	const layer = SceneManager.Instance.mine.TC.GetLayer(y)
	if (layer) {
		// First add the background appropriate for this depth
		const bgImageName = worldMap.getBackgroundForDepth(y)
		const bgImage = Images[bgImageName]

		// Add background tile first
		layer.push(
			new Tile(
				new Vector2(0 + 100 * x, 100 * y),
				new Vector2(100, 100),
				bgImage,
				1, // Layer 1 for background
				EntityTypes.BackGroundTile,
				SceneManager.Instance.mine
			)
		)

		// Then add cross decoration on top
		layer.push(
			new Tile(
				new Vector2(0 + 100 * x, 100 * y),
				new Vector2(100, 100),
				Images.cross,
				2, // Layer 2 for decoration
				EntityTypes.BackGroundTile,
				SceneManager.Instance.mine
			)
		)
	} else {
		console.warn(`Could not get layer at y=${y}`)
	}
}

function tree(Entities, x) {
	Entities.push(
		new Tile(
			new Vector2(100 * x + 50, 300),
			new Vector2(200, 300),
			Images.tree,
			2,
			EntityTypes.Building,
			SceneManager.Instance.town
		)
	)
}

function getBackgroundImageForDepth(y) {
	if (y < 50) {
		return Images.lvl1bg
	}
	if (y >= 50 && y < 150) {
		return Images.lvl2bg
	}
	if (y >= 150 && y < 250) {
		return Images.lvl3bg
	}
	if (y >= 250 && y < 350) {
		return Images.lvl4bg
	}
	return Images.lvl5bg
}

export default cave
