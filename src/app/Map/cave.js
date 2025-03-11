import { Cave } from '../Entities/Cave'
import { Tile } from '../Entities/Tile'
import { Images } from '../Graphics/Images'
import { SceneManager } from '../Logic/SceneManager'
import { Vector2 } from '../Math/Vector2'
import { EntityTypes } from '../Physics/EntityTypes'
import { WorldManager } from '../Logic/WorldManager'
import { WorldMap } from '../Logic/WorldMap'

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

	// Initialize or use existing seed
	if (!worldManager.worldSeed) {
		worldManager.newWorld()
		console.log('Created new world with seed:', worldManager.worldSeed)
	}

	// Initialize the WorldMap with the seed
	worldMap.initializeMap(worldManager.worldSeed)

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
		layer.push(
			new Tile(
				new Vector2(0 + 100 * x, 100 * y),
				new Vector2(100, 100),
				Images.chest,
				2,
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
		layer.push(
			new Tile(
				new Vector2(0 + 100 * x, 100 * y),
				new Vector2(100, 100),
				Images.cross,
				2,
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
