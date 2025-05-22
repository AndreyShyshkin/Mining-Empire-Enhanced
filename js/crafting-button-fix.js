// Fix the crafting UI's craft button functionality
console.log('Loading crafting-button-fix.js')

;(function () {
	// Ensure CraftingUI's craftSelectedItem method is working
	const originalCraftSelectedItem =
		window.CraftingUI.prototype.craftSelectedItem

	// Override the craftSelectedItem method
	window.CraftingUI.prototype.craftSelectedItem = function () {
		console.log('CraftingUI.craftSelectedItem called!')

		if (this.selectedRecipeIndex === -1) {
			console.log('No recipe selected!')
			return
		}

		try {
			console.log('Selected recipe index:', this.selectedRecipeIndex)

			const availableRecipes = this.craftingSystem.getAvailableRecipes()
			console.log('Available recipes count:', availableRecipes.length)

			if (!availableRecipes || !availableRecipes[this.selectedRecipeIndex]) {
				console.error('Selected recipe not found in available recipes!')
				return
			}

			const selectedRecipe = availableRecipes[this.selectedRecipeIndex]
			console.log('Selected recipe:', selectedRecipe)

			// Find the global recipe index
			const recipeIndex = window.CRAFTING_RECIPES.findIndex(recipe => {
				return (
					recipe.result.itemType === selectedRecipe.result.itemType &&
					JSON.stringify(recipe.ingredients) ===
						JSON.stringify(selectedRecipe.ingredients)
				)
			})

			console.log('Found global recipe index:', recipeIndex)

			if (recipeIndex !== -1) {
				console.log('Calling craftItem with index:', recipeIndex)
				const success = this.craftingSystem.craftItem(recipeIndex)
				console.log('Craft result:', success)

				if (success) {
					// Re-render the recipe list to update ingredient availability
					this.renderRecipeList()

					// Re-render the details if an item is still selected
					if (this.selectedRecipeIndex !== -1) {
						this.renderRecipeDetails(this.selectedRecipeIndex)
					}
				}
			} else {
				console.error('Recipe not found in global recipes!')
			}
		} catch (error) {
			console.error('Error in craftSelectedItem:', error)
		}
	}

	// Add direct click handler to the craft button if it exists
	function addCraftButtonHandler() {
		const craftButton = document.querySelector('.craft-button')
		if (craftButton) {
			console.log('Found craft button, adding direct handler')

			// Remove old handlers
			const newButton = craftButton.cloneNode(true)
			craftButton.parentNode.replaceChild(newButton, craftButton)

			// Add new handler
			newButton.addEventListener('click', function () {
				console.log('Craft button clicked directly!')
				if (window.player && window.player.craftingUI) {
					window.player.craftingUI.craftSelectedItem()
				}
			})
		} else {
			console.log('Craft button not found, will retry later')
			setTimeout(addCraftButtonHandler, 1000)
		}
	}

	// Add the direct handler when crafting UI opens
	const originalShowUI = window.CraftingUI.prototype.showUI
	window.CraftingUI.prototype.showUI = function () {
		originalShowUI.call(this)
		setTimeout(addCraftButtonHandler, 100)
	}

	console.log('Crafting button fix loaded!')
})()
