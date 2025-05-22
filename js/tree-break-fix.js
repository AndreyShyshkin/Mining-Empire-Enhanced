// Make trees breakable without tools
console.log('Loading tree-break-fix.js')

// Modify the mining system to allow breaking trees without an axe
;(function () {
	// Reference to the original startMining method from mining-system-fix.js
	const originalStartMining = window.Player.prototype.startMining

	// Override the startMining method to allow breaking trees without tools
	window.Player.prototype.startMining = function (tileX, tileY) {
		// Call the original method for basic checks
		const canStartMining = originalStartMining.call(this, tileX, tileY)

		// If mining was rejected by the original method, check if it's because of trying to break trees without an axe
		if (!canStartMining) {
			const blockType = this.world.getTile(tileX, tileY)
			const block = window.BLOCKS[blockType]

			// Special handling for wood/trees
			if (
				block &&
				(block.name.includes('Wood') || blockType === window.BLOCK_TYPES.WOOD)
			) {
				console.log('Allowing tree breaking without an axe')

				// Set up mining for trees without an axe (will be slower)
				this.miningTileX = tileX
				this.miningTileY = tileY
				this.miningTime = 0
				this.miningDuration = block.hardness ? block.hardness * 2000 : 2000 // Twice as slow without proper tool
				this.isMining = true

				// Show a visual indicator that mining is happening but slowly
				if (this.showToolWarning) {
					this.showToolWarning('Mining slowly...', '#FFAA00')
				}

				return true
			}
		}

		return canStartMining
	}

	// Optional: Update the wood block definition to make it slightly easier to break
	if (window.BLOCKS && window.BLOCKS[window.BLOCK_TYPES.WOOD]) {
		// Ensure wood doesn't have a required mining power
		window.BLOCKS[window.BLOCK_TYPES.WOOD].requiredMiningPower = 0

		// Slightly reduce hardness to make it faster to break without tools
		if (window.BLOCKS[window.BLOCK_TYPES.WOOD].hardness > 1) {
			window.BLOCKS[window.BLOCK_TYPES.WOOD].hardness = 1.5
		}
	}

	console.log('Tree breaking without tools enabled')
})()
