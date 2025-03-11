import { Tile } from '../Entities/Tile'
import { Vector2 } from '../Math/Vector2'
import { EntityTypes } from '../Physics/EntityTypes'

// Enhanced background tile creator that prevents pixel gaps
export function createBackgroundTile(image, sceneManager, x, y) {
	const layer = sceneManager.Instance.mine.TC.GetLayer(y)

	if (!layer) {
		console.warn(`Could not get layer at y=${y}`)
		return null
	}

	// Create a tile with slightly overlapping edges to prevent gaps
	const tile = new Tile(
		new Vector2(0 + 100 * x, 100 * y),
		new Vector2(101, 101), // Slightly larger size
		image,
		1,
		EntityTypes.BackGroundTile,
		sceneManager.Instance.mine
	)

	// Add to layer and return the created tile
	layer.push(tile)
	return tile
}

// Get the correct background image based on depth
export function getBackgroundImageForDepth(images, y) {
	if (y < 50) return images.lvl1bg
	if (y < 150) return images.lvl2bg
	if (y < 250) return images.lvl3bg
	if (y < 350) return images.lvl4bg
	return images.lvl5bg
}
