// Direct fix for crafting functionality
console.log('Loading emergency-crafting-fix.js')

;(function () {
	// The key issue might be in finding the recipe index
	// Let's add a more robust recipe matching function

	// Define a function to find recipe by result
	function findRecipeIndexByResult(craftingRecipes, resultType, ingredients) {
		for (let i = 0; i < craftingRecipes.length; i++) {
			const recipe = craftingRecipes[i]

			// Match by result type
			if (recipe.result.itemType === resultType) {
				console.log(`Found recipe match for ${resultType} at index ${i}`)
				return i
			}
		}
		return -1
	}

	// Override both CraftingUI implementations
	const uiImplementations = [window.CraftingUI, window.FixedCraftingUI]

	uiImplementations.forEach(UI => {
		if (!UI || !UI.prototype) return

		// Original method
		const originalCraftSelectedItem = UI.prototype.craftSelectedItem

		// Replace with our fixed implementation
		UI.prototype.craftSelectedItem = function () {
			console.log('Emergency fixed craftSelectedItem called')

			if (this.selectedRecipeIndex === -1) {
				console.log('No recipe selected')
				return
			}

			try {
				// Get the available recipes
				const availableRecipes = this.craftingSystem.getAvailableRecipes()

				if (!availableRecipes || !availableRecipes[this.selectedRecipeIndex]) {
					console.error('Selected recipe not found in available recipes!')
					return
				}

				// Get the selected recipe
				const selectedRecipe = availableRecipes[this.selectedRecipeIndex]
				console.log('Selected recipe result:', selectedRecipe.result.itemType)

				// Find the recipeIndex in a more robust way
				const recipeIndex = findRecipeIndexByResult(
					window.CRAFTING_RECIPES,
					selectedRecipe.result.itemType,
					selectedRecipe.ingredients
				)

				console.log('Found recipe at index:', recipeIndex)

				if (recipeIndex !== -1) {
					console.log('Attempting to craft with index:', recipeIndex)

					// DIRECT IMPLEMENTATION: Don't rely on the crafting system
					// Check if player has ingredients
					const recipe = window.CRAFTING_RECIPES[recipeIndex]
					const player = this.player
					let hasAllIngredients = true

					// Verify ingredients
					recipe.ingredients.forEach(ingredient => {
						if (
							!player.inventory.hasItem(ingredient.itemType, ingredient.count)
						) {
							hasAllIngredients = false
							console.log(
								`Missing ingredient: ${ingredient.itemType} x${ingredient.count}`
							)
						}
					})

					if (hasAllIngredients) {
						console.log('Player has all ingredients, crafting directly...')

						// Remove ingredients
						recipe.ingredients.forEach(ingredient => {
							player.inventory.removeItem(ingredient.itemType, ingredient.count)
						})

						// Add result
						const success = player.inventory.addItem(
							recipe.result.itemType,
							recipe.result.count
						)

						if (success) {
							console.log('Successfully crafted item!')

							// Show success message
							if (window.gameMonitor) {
								const itemName =
									window.BLOCKS[recipe.result.itemType]?.name ||
									'Item #' + recipe.result.itemType
								window.gameMonitor.success(
									`Crafted: ${recipe.result.count}x ${itemName}`
								)
							}

							// Re-render the recipe list and details
							this.renderRecipeList()
							if (this.selectedRecipeIndex !== -1) {
								this.renderRecipeDetails(this.selectedRecipeIndex)
							}
						} else {
							console.error('Failed to add crafted item to inventory!')
							if (window.gameMonitor) {
								window.gameMonitor.error('Inventory is full!')
							}
						}
					} else {
						console.log('Missing ingredients for crafting')
						if (window.gameMonitor) {
							window.gameMonitor.error('Missing ingredients for crafting')
						}
					}
				}
			} catch (error) {
				console.error('Error in emergency craftSelectedItem:', error)
			}
		}

		console.log(`Replaced craftSelectedItem for ${UI.name}`)
	})

	console.log('Emergency crafting fix loaded')
})()
