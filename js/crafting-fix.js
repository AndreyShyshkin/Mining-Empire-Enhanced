// Crafting fix for the issue where items couldn't be crafted when clicked
console.log('Loading crafting-fix.js')
;(function () {
	// Fix the issue with craftSelectedItem in FixedCraftingUI
	// The bug was in how the recipe index was being calculated
	const originalCraftSelectedItem =
		window.FixedCraftingUI.prototype.craftSelectedItem

	window.FixedCraftingUI.prototype.craftSelectedItem = function () {
		console.log('Patched craftSelectedItem called')

		if (this.selectedRecipeIndex === -1) {
			console.log('No recipe selected')
			return
		}

		try {
			// The bug was in this section. The previous code was trying to find
			// reference equality between objects, which won't work.
			// Instead, we should directly use the selected index:
			const success = this.craftingSystem.craftItem(this.selectedRecipeIndex)

			console.log('Crafting result:', success ? 'Success' : 'Failed')

			if (success) {
				// Re-render the recipe list to update ingredient availability
				this.renderRecipeList()

				// Re-render the details if an item is still selected
				if (this.selectedRecipeIndex !== -1) {
					this.renderRecipeDetails(this.selectedRecipeIndex)
				}
			}
		} catch (error) {
			console.error('Error in patched craftSelectedItem:', error)
		}
	}

	// Also add a debug method to directly craft items
	window.debugCraftItem = function (recipeIndex) {
		if (!window.player || !window.player.craftingSystem) {
			console.error('Cannot access crafting system for debug crafting')
			return false
		}

		console.log('Debug crafting recipe at index:', recipeIndex)
		return window.player.craftingSystem.craftItem(recipeIndex)
	}

	console.log('Crafting fix applied successfully')
})()
