// CraftingUI class - made global for access from game.js
class CraftingUI {
	constructor(craftingSystem) {
		this.craftingSystem = craftingSystem
		this.player = craftingSystem.player
		this.uiElement = null
		this.recipeListElement = null
		this.detailsElement = null
		this.selectedRecipeIndex = -1
		this.isCraftingOpen = false

		// Create UI elements
		this.createUI()

		// Initially hide the UI
		this.hideUI()

		// Validate all recipes
		this.validateAllRecipes()

		// Add debug logging
		console.log('CraftingUI initialized')
		console.log('BLOCK_TYPES:', window.BLOCK_TYPES)
		console.log('BLOCKS:', window.BLOCKS)
		console.log('CRAFTING_RECIPES:', window.CRAFTING_RECIPES)

		// Debug craftingSystem methods
		console.log(
			'CraftingSystem methods:',
			'updateNearbyCraftingStations:',
			typeof this.craftingSystem.updateNearbyCraftingStations,
			'scanForCraftingStations:',
			typeof this.craftingSystem.scanForCraftingStations,
			'hasIngredients:',
			typeof this.craftingSystem.hasIngredients,
			'hasRequiredStation:',
			typeof this.craftingSystem.hasRequiredStation,
			'canCraft:',
			typeof this.craftingSystem.canCraft,
			'craftItem:',
			typeof this.craftingSystem.craftItem
		)
	}

	// Helper method to validate all recipes and identify problematic ones
	validateAllRecipes() {
		console.log('Validating crafting recipes...')

		if (!window.CRAFTING_RECIPES) {
			console.error('Error: CRAFTING_RECIPES is not defined or not accessible')
			return
		}

		window.CRAFTING_RECIPES.forEach((recipe, index) => {
			// Check result item
			if (!window.BLOCKS[recipe.result.itemType]) {
				console.error(
					`Recipe #${index} has invalid result item type: ${recipe.result.itemType}`
				)
				console.error('Problem recipe:', JSON.stringify(recipe))
			}

			// Check ingredient items
			recipe.ingredients.forEach((ingredient, idx) => {
				if (!window.BLOCKS[ingredient.itemType]) {
					console.error(
						`Recipe #${index} has invalid ingredient #${idx} item type: ${ingredient.itemType}`
					)
				}
			})
		})

		console.log('Recipe validation complete')
	}

	// Create UI elements
	createUI() {
		// Main container
		this.uiElement = document.createElement('div')
		this.uiElement.className = 'crafting-ui'
		document.body.appendChild(this.uiElement)

		// Header
		const header = document.createElement('div')
		header.className = 'crafting-header'
		header.textContent = 'Crafting'
		this.uiElement.appendChild(header)

		// Close button
		const closeButton = document.createElement('button')
		closeButton.className = 'close-button'
		closeButton.textContent = 'X'
		closeButton.addEventListener('click', () => this.hideUI())
		header.appendChild(closeButton)

		// Recipe list
		this.recipeListElement = document.createElement('div')
		this.recipeListElement.className = 'recipe-list'
		this.uiElement.appendChild(this.recipeListElement)

		// Recipe details
		this.detailsElement = document.createElement('div')
		this.detailsElement.className = 'recipe-details'
		this.uiElement.appendChild(this.detailsElement)

		// Craft button
		const craftButton = document.createElement('button')
		craftButton.className = 'craft-button'
		craftButton.textContent = 'Craft'
		craftButton.addEventListener('click', () => this.craftSelectedItem())
		this.uiElement.appendChild(craftButton)

		// Add stylesheet once
		if (!document.getElementById('crafting-css')) {
			const style = document.createElement('style')
			style.id = 'crafting-css'
			style.textContent = craftingCss
			document.head.appendChild(style)
		}
	}

	// Show the crafting UI
	showUI() {
		if (this.uiElement) {
			// Update available recipes based on player's position
			if (this.craftingSystem.updateNearbyCraftingStations) {
				this.craftingSystem.updateNearbyCraftingStations()
			} else if (this.craftingSystem.scanForCraftingStations) {
				// Fallback to scanForCraftingStations if updateNearbyCraftingStations is not available
				console.warn(
					'updateNearbyCraftingStations not found, using scanForCraftingStations instead'
				)
				this.craftingSystem.scanForCraftingStations()
			} else {
				console.error(
					'Neither updateNearbyCraftingStations nor scanForCraftingStations methods found on craftingSystem'
				)
			}

			// Render the recipe list
			this.renderRecipeList()

			// Show the UI
			this.uiElement.style.display = 'flex'
		}
	}

	// Hide the crafting UI
	hideUI() {
		if (this.uiElement) {
			this.uiElement.style.display = 'none'
			this.selectedRecipeIndex = -1
		}
	}

	// Update recipe list and UI (called when inventory changes)
	updateRecipeList() {
		if (
			this.isCraftingOpen &&
			this.uiElement &&
			this.uiElement.style.display !== 'none'
		) {
			// Update available crafting stations
			this.craftingSystem.scanForCraftingStations()

			// Render the updated recipe list
			this.renderRecipeList()
		}
	}

	// Toggle UI visibility
	toggleUI() {
		this.isCraftingOpen = !this.isCraftingOpen
		if (this.isCraftingOpen) {
			this.showUI()
		} else {
			this.hideUI()
		}
		return this.isCraftingOpen
	}

	// Compatibility method - delegates to toggleUI to maintain backward compatibility
	toggleCrafting() {
		return this.toggleUI()
	}

	// Render the recipe list
	renderRecipeList() {
		// Clear previous list
		this.recipeListElement.innerHTML = ''

		// Check if getAvailableRecipes method exists
		if (!this.craftingSystem.getAvailableRecipes) {
			console.error(
				'getAvailableRecipes method is not defined on craftingSystem'
			)
			const errorElement = document.createElement('div')
			errorElement.className = 'error-message'
			errorElement.textContent = 'Error: Crafting system not fully initialized!'
			this.recipeListElement.appendChild(errorElement)
			return
		}

		// Declare availableRecipes at the function scope
		let availableRecipes = []

		try {
			// Get available recipes
			availableRecipes = this.craftingSystem.getAvailableRecipes()

			if (!availableRecipes || availableRecipes.length === 0) {
				const noRecipesElement = document.createElement('div')
				noRecipesElement.className = 'no-recipes'
				noRecipesElement.textContent = 'No recipes available'
				this.recipeListElement.appendChild(noRecipesElement)
				return
			}
		} catch (error) {
			console.error('Error in getAvailableRecipes:', error)
			const errorElement = document.createElement('div')
			errorElement.className = 'error-message'
			errorElement.textContent = 'Error loading recipes: ' + error.message
			this.recipeListElement.appendChild(errorElement)
			return
		}

		// Create recipe items
		availableRecipes.forEach((recipe, index) => {
			try {
				// Create recipe item
				const recipeItem = document.createElement('div')
				recipeItem.className = 'recipe-item'
				recipeItem.dataset.index = index

				// Check if the recipe has a valid result item type
				if (!window.BLOCKS[recipe.result.itemType]) {
					console.error(
						`Invalid item type in recipe result: ${recipe.result.itemType}`
					)
					console.error('Problem recipe:', JSON.stringify(recipe))

					// Skip rendering this recipe but don't crash completely
					recipeItem.textContent = 'Unknown Item'
					recipeItem.style.color = 'red'
					this.recipeListElement.appendChild(recipeItem)
					return
				}

				// Recipe icon (result item)
				const recipeIcon = document.createElement('div')
				recipeIcon.className = 'recipe-icon'

				// Use item's texture if available, otherwise use a fallback
				try {
					const resultTexture = window.BLOCKS[recipe.result.itemType].texture
					if (typeof resultTexture === 'string') {
						recipeIcon.style.backgroundColor = resultTexture
					} else {
						// Fallback for missing textures
						recipeIcon.style.backgroundColor = '#888'
					}
				} catch (err) {
					console.error(`Error with recipe icon texture: ${err.message}`)
					recipeIcon.style.backgroundColor = '#888' // Fallback color
				}

				// Recipe name and count
				const recipeName = document.createElement('div')
				recipeName.className = 'recipe-name'

				try {
					const itemName =
						window.BLOCKS[recipe.result.itemType].name ||
						`Item #${recipe.result.itemType}`
					recipeName.textContent = `${itemName} x${recipe.result.count}`
				} catch (err) {
					console.error(`Error getting recipe name: ${err.message}`)
					recipeName.textContent = `Unknown Item x${recipe.result.count}`
				}

				// Check if player has the ingredients
				const hasIngredients = this.craftingSystem.hasIngredients(recipe)
				if (!hasIngredients) {
					recipeItem.classList.add('missing-ingredients')
				}

				// Add click event
				recipeItem.addEventListener('click', () => {
					this.selectRecipe(index)
				})

				// Append elements
				recipeItem.appendChild(recipeIcon)
				recipeItem.appendChild(recipeName)
				this.recipeListElement.appendChild(recipeItem)
			} catch (err) {
				console.error(`Error rendering recipe ${index}:`, err)
			}
		})
	}

	// Select a recipe
	selectRecipe(index) {
		// Clear previous selection
		const previousSelection = this.recipeListElement.querySelector('.selected')
		if (previousSelection) {
			previousSelection.classList.remove('selected')
		}

		// Mark new selection
		const newSelection = this.recipeListElement.querySelector(
			`[data-index="${index}"]`
		)
		if (newSelection) {
			newSelection.classList.add('selected')
		}

		// Set selected index
		this.selectedRecipeIndex = index

		// Show recipe details
		this.renderRecipeDetails(index)
	}

	// Render recipe details
	renderRecipeDetails(index) {
		// Clear previous details
		this.detailsElement.innerHTML = ''

		// Get recipe
		const recipes = this.craftingSystem.getAvailableRecipes()
		const recipe = recipes[index]

		if (!recipe) {
			console.error(`Recipe not found at index: ${index}`)
			return
		}

		try {
			// Recipe title
			const title = document.createElement('div')
			title.className = 'recipe-title'
			const resultName =
				window.BLOCKS[recipe.result.itemType]?.name ||
				`Item #${recipe.result.itemType}`
			title.textContent = `${resultName} x${recipe.result.count}`
			this.detailsElement.appendChild(title)

			// Requirements title
			const requirementsTitle = document.createElement('div')
			requirementsTitle.className = 'requirements-title'
			requirementsTitle.textContent = 'Requirements:'
			this.detailsElement.appendChild(requirementsTitle)

			// Ingredients list
			const ingredientsList = document.createElement('ul')
			ingredientsList.className = 'ingredients-list'

			recipe.ingredients.forEach(ingredient => {
				try {
					const ingredientItem = document.createElement('li')

					if (!window.BLOCKS[ingredient.itemType]) {
						console.error(
							`Invalid ingredient item type: ${ingredient.itemType}`
						)
						ingredientItem.textContent = `Unknown Item x${ingredient.count}`
						ingredientsList.appendChild(ingredientItem)
						return
					}

					const ingredientName =
						window.BLOCKS[ingredient.itemType].name ||
						`Item #${ingredient.itemType}`
					const playerHasItem = this.player.inventory.hasItem(
						ingredient.itemType,
						ingredient.count
					)

					ingredientItem.textContent = `${ingredientName} x${ingredient.count}`
					if (!playerHasItem) {
						ingredientItem.classList.add('missing')
					}

					ingredientsList.appendChild(ingredientItem)
				} catch (err) {
					console.error(`Error rendering ingredient: ${err.message}`)
				}
			})

			this.detailsElement.appendChild(ingredientsList)

			// Crafting station requirement
			if (recipe.station !== window.CRAFTING_STATIONS.NONE) {
				const stationElement = document.createElement('div')
				stationElement.className = 'station-requirement'

				let stationName = 'Unknown Station'
				if (recipe.station === window.CRAFTING_STATIONS.WORKBENCH) {
					stationName = 'Workbench'
				} else if (recipe.station === window.CRAFTING_STATIONS.FURNACE) {
					stationName = 'Furnace'
				} else if (recipe.station === window.CRAFTING_STATIONS.ANVIL) {
					stationName = 'Anvil'
				}

				const hasStation = this.craftingSystem.hasRequiredStation(recipe)
				stationElement.textContent = `Requires: ${stationName}`

				if (!hasStation) {
					stationElement.classList.add('missing')
				}

				this.detailsElement.appendChild(stationElement)
			}
		} catch (err) {
			console.error(`Error rendering recipe details: ${err.message}`)
		}
	}

	// Craft the selected item
	craftSelectedItem() {
		if (this.selectedRecipeIndex === -1) {
			return
		}

		const availableRecipes = this.craftingSystem.getAvailableRecipes()
		const recipeIndex = window.CRAFTING_RECIPES.findIndex(
			recipe => recipe === availableRecipes[this.selectedRecipeIndex]
		)

		if (recipeIndex !== -1) {
			const success = this.craftingSystem.craftItem(recipeIndex)

			if (success) {
				// Re-render the recipe list to update ingredient availability
				this.renderRecipeList()

				// Re-render the details if an item is still selected
				if (this.selectedRecipeIndex !== -1) {
					this.renderRecipeDetails(this.selectedRecipeIndex)
				}
			}
		}
	}
}

// Add keyboard event listener for toggling the crafting UI (E key)
document.addEventListener('keydown', event => {
	if (event.key === 'e' || event.key === 'E') {
		// If a player exists and has a crafting UI
		if (window.player && window.player.craftingUI) {
			window.player.craftingUI.toggleUI()
		}
	}
})
