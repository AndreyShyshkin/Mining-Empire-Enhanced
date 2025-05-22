// Utility functions
const Utils = {
	distance: (x1, y1, x2, y2) => {
		return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
	},

	randomInt: (min, max) => {
		return Math.floor(Math.random() * (max - min + 1)) + min
	},

	lerp: (start, end, t) => {
		return start * (1 - t) + end * t
	},

	// Convert world coordinates to screen coordinates
	worldToScreen: (x, y, camera) => {
		return {
			x: x - camera.x,
			y: y - camera.y,
		}
	},

	// Convert screen coordinates to world coordinates
	screenToWorld: (x, y, camera) => {
		return {
			x: x + camera.x,
			y: y + camera.y,
		}
	},

	// Convert world coordinates to tile coordinates
	worldToTile: (x, y) => {
		return {
			x: Math.floor(x / BLOCK_SIZE),
			y: Math.floor(y / BLOCK_SIZE),
		}
	},

	// Convert tile coordinates to world coordinates (top-left of the tile)
	tileToWorld: (tileX, tileY) => {
		return {
			x: tileX * BLOCK_SIZE,
			y: tileY * BLOCK_SIZE,
		}
	},
}
