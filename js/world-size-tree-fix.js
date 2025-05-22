// Improve world size and tree generation
console.log('Loading world-size-tree-fix.js')(function () {
	// Store original World constructor
	const originalWorld = window.World

	// Override the World class to increase size
	window.World = function (width, height, existingData = null) {
		// Increase world size by at least 3x
		// Only increase if the default size is being used
		if (width <= 100) {
			console.log(`Increasing world width from ${width} to ${width * 3}`)
			width = width * 3
		}

		if (height <= 100) {
			console.log(`Increasing world height from ${height} to ${height * 3}`)
			height = height * 3
		}

		// Call original constructor with new dimensions
		return new originalWorld(width, height, existingData)
	}

	// Copy all prototype methods to the new constructor
	for (const key of Object.getOwnPropertyNames(originalWorld.prototype)) {
		window.World.prototype[key] = originalWorld.prototype[key]
	}

	// Override tree generation method to create more and larger trees
	const originalGenerate = window.World.prototype.generate
	window.World.prototype.generate = function () {
		// Call original generation method
		originalGenerate.call(this)

		// Add more trees after base world generation
		this.addMoreTrees()

		console.log('World generation enhanced: added more trees')
	}

	// New method to add additional trees
	window.World.prototype.addMoreTrees = function () {
		console.log('Adding more trees to world')

		const groundLevel = Math.floor(this.height * 0.4)

		// Scan the ground surface for spaces to plant trees
		for (let x = 5; x < this.width - 5; x += 3) {
			// Spacing trees every ~3 blocks
			// Find ground level at this x-coordinate
			let surfaceY = 0
			for (let y = 0; y < this.height; y++) {
				if (
					this.getTile(x, y) === window.BLOCK_TYPES.GRASS ||
					this.getTile(x, y) === window.BLOCK_TYPES.DIRT
				) {
					surfaceY = y
					break
				}
			}

			// Random chance to create a tree at this position
			if (surfaceY > 0 && Math.random() < 0.4) {
				this.createLargeTree(x, surfaceY - 1)
			}
		}
	}

	// Method to create a larger tree
	window.World.prototype.createLargeTree = function (x, surfaceY) {
		// Determine tree height (larger than default)
		const treeHeight = window.Utils.randomInt(8, 15)

		// Create trunk
		for (let ty = 0; ty < treeHeight; ty++) {
			const y = surfaceY - ty
			if (y >= 0) {
				this.setTile(x, y, window.BLOCK_TYPES.WOOD)
			}
		}

		// Create wider canopy with more leaves
		const canopySize = window.Utils.randomInt(3, 5) // Larger leaf radius
		const leafBottom = surfaceY - treeHeight + 1
		const leafTop = Math.max(0, leafBottom - 4)

		// Generate leaves
		for (let lx = x - canopySize; lx <= x + canopySize; lx++) {
			for (let ly = leafTop; ly <= leafBottom; ly++) {
				// Skip some leaves near the edges for a more natural look
				if (Math.abs(lx - x) === canopySize && Math.random() < 0.6) {
					continue
				}

				// Make sure we're within world bounds
				if (lx >= 0 && lx < this.width && ly >= 0 && ly < this.height) {
					// Only place leaves on air blocks (don't replace trunk)
					if (this.getTile(lx, ly) === window.BLOCK_TYPES.AIR) {
						this.setTile(lx, ly, window.BLOCK_TYPES.LEAVES)
					}
				}
			}
		}
	}

	console.log('World size and tree generation improvements loaded')
})()
