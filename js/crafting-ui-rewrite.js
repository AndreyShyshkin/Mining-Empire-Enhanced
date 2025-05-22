// Complete rewrite of the CraftingUI implementation
console.log('Loading crafting-ui-rewrite.js')

class FixedCraftingUI {
	constructor(craftingSystem) {
		console.log(
			'FixedCraftingUI constructor called with craftingSystem:',
			craftingSystem
		)

		this.craftingSystem = craftingSystem
		this.player = craftingSystem?.player
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

		console.log('FixedCraftingUI initialized')
	}

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

		// Craft controls container
		const craftControls = document.createElement('div')
		craftControls.className = 'craft-controls'
		this.uiElement.appendChild(craftControls)

		// Quantity input
		const quantityContainer = document.createElement('div')
		quantityContainer.className = 'quantity-container'

		const quantityLabel = document.createElement('label')
		quantityLabel.textContent = 'Quantity:'
		quantityLabel.htmlFor = 'craft-quantity'
		quantityContainer.appendChild(quantityLabel)

		// Create a quantity control wrapper for the input and buttons
		const quantityControlWrapper = document.createElement('div')
		quantityControlWrapper.className = 'quantity-control-wrapper'

		// Add decrease button
		const decreaseBtn = document.createElement('button')
		decreaseBtn.textContent = '-'
		decreaseBtn.className = 'quantity-btn'
		decreaseBtn.addEventListener('click', () => {
			const currentValue = parseInt(this.quantityInput.value) || 1
			if (currentValue > 1) {
				this.quantityInput.value = (currentValue - 1).toString()
				if (this.selectedRecipeIndex !== -1) {
					this.updateCraftButtonTextWithQuantity()
				}
			}
		})
		quantityControlWrapper.appendChild(decreaseBtn)

		// Add the input
		this.quantityInput = document.createElement('input')
		this.quantityInput.type = 'number'
		this.quantityInput.id = 'craft-quantity'
		this.quantityInput.className = 'quantity-input'
		this.quantityInput.min = '1'
		this.quantityInput.value = '1'
		this.quantityInput.addEventListener('change', () => {
			// Make sure it's always at least 1
			const value = parseInt(this.quantityInput.value) || 1
			const max = parseInt(this.quantityInput.max) || 1
			this.quantityInput.value = Math.max(1, Math.min(value, max)).toString()

			// Update craft button text with quantity if more than 1
			if (this.selectedRecipeIndex !== -1) {
				this.updateCraftButtonTextWithQuantity()
			}
		})
		quantityControlWrapper.appendChild(this.quantityInput)

		// Add increase button
		const increaseBtn = document.createElement('button')
		increaseBtn.textContent = '+'
		increaseBtn.className = 'quantity-btn'
		increaseBtn.addEventListener('click', () => {
			const currentValue = parseInt(this.quantityInput.value) || 1
			const max = parseInt(this.quantityInput.max) || 1
			if (currentValue < max) {
				this.quantityInput.value = (currentValue + 1).toString()
				if (this.selectedRecipeIndex !== -1) {
					this.updateCraftButtonTextWithQuantity()
				}
			}
		})
		quantityControlWrapper.appendChild(increaseBtn)

		// Add the control wrapper to the container
		quantityContainer.appendChild(quantityControlWrapper)

		// Add "Max" button
		const maxBtn = document.createElement('button')
		maxBtn.textContent = 'Max'
		maxBtn.className = 'max-btn'
		maxBtn.addEventListener('click', () => {
			const max = parseInt(this.quantityInput.max) || 1
			this.quantityInput.value = max.toString()
			if (this.selectedRecipeIndex !== -1) {
				this.updateCraftButtonTextWithQuantity()
			}
		})
		quantityContainer.appendChild(maxBtn)

		craftControls.appendChild(quantityContainer)

		// Craft button
		const craftButton = document.createElement('button')
		craftButton.className = 'craft-button'
		craftButton.textContent = 'Craft'
		craftButton.addEventListener('click', () => this.craftSelectedItem())
		craftControls.appendChild(craftButton)

		// Store the button for later reference
		this.craftButton = craftButton

		// Add stylesheet
		this.createCss()
	}

	createCss() {
		if (!document.getElementById('fixed-crafting-css')) {
			const style = document.createElement('style')
			style.id = 'fixed-crafting-css'

			style.textContent = `
            .crafting-ui {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 500px;
                height: 400px;
                background-color: rgba(0, 0, 0, 0.8);
                border: 2px solid #444;
                color: white;
                display: flex;
                flex-direction: column;
                padding: 10px;
                z-index: 1000;
                font-family: Arial, sans-serif;
            }
            
            .crafting-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px;
                border-bottom: 1px solid #444;
                font-weight: bold;
                font-size: 1.2em;
            }
            
            .close-button {
                background-color: #a00;
                color: white;
                border: none;
                border-radius: 3px;
                width: 20px;
                height: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            }
            
            .recipe-list {
                flex: 1;
                overflow-y: auto;
                padding: 5px;
                margin: 5px 0;
                border: 1px solid #444;
                background-color: rgba(0, 0, 0, 0.5);
            }
            
            .recipe-item {
                display: flex;
                align-items: center;
                padding: 5px;
                cursor: pointer;
                border-bottom: 1px solid #333;
            }
            
            .recipe-item:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .recipe-item.selected {
                background-color: rgba(100, 100, 255, 0.3);
            }
            
            .recipe-icon {
                width: 20px;
                height: 20px;
                margin-right: 10px;
                border: 1px solid #444;
            }
            
            .recipe-name {
                flex: 1;
            }
            
            .error-message {
                color: #ff6666;
                padding: 10px;
                text-align: center;
                font-style: italic;
            }
            
            .recipe-details {
                padding: 10px;
                margin: 5px 0;
                height: 120px;
                overflow-y: auto;
                border: 1px solid #444;
                background-color: rgba(0, 0, 0, 0.5);
            }
            
            .recipe-title {
                font-weight: bold;
                margin-bottom: 5px;
                font-size: 1.1em;
            }
            
            .requirements-title {
                margin-top: 10px;
                font-weight: bold;
            }
            
            .ingredients-list {
                list-style-type: none;
                padding-left: 10px;
                margin: 5px 0;
            }
            
            .station-requirement {
                margin-top: 10px;
                font-style: italic;
            }
            
            .missing {
                color: #f88;
            }
            
            .missing-ingredients {
                opacity: 0.5;
            }
            
            .craft-controls {
                display: flex;
                align-items: center;
                margin-top: 10px;
                padding: 5px;
                background-color: rgba(30, 30, 30, 0.7);
                border-radius: 3px;
            }
            
            .craft-button {
                background-color: #2a2;
                color: white;
                border: none;
                padding: 8px 15px;
                cursor: pointer;
                font-weight: bold;
                border-radius: 3px;
                white-space: nowrap;
            }
            
            .craft-button:hover {
                background-color: #3b3;
            }
            
            .quantity-container {
                display: flex;
                align-items: center;
                margin-right: 10px;
                flex: 1;
            }
            
            .quantity-container label {
                margin-right: 5px;
                white-space: nowrap;
            }
            
            .quantity-control-wrapper {
                display: flex;
                align-items: center;
                margin-right: 5px;
                border: 1px solid #444;
                border-radius: 3px;
                overflow: hidden;
            }
            
            .quantity-input {
                width: 40px;
                padding: 5px;
                border: none;
                text-align: center;
                background-color: rgba(0, 0, 0, 0.5);
                color: white;
            }
            
            .quantity-btn {
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: rgba(50, 50, 50, 0.8);
                color: white;
                border: none;
                cursor: pointer;
            }
            
            .quantity-btn:hover {
                background-color: rgba(70, 70, 70, 0.8);
            }
            
            .max-btn {
                padding: 4px 8px;
                background-color: rgba(50, 50, 100, 0.8);
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
            }
            
            .max-btn:hover {
                background-color: rgba(70, 70, 120, 0.8);
            }
            
            .no-recipes {
                padding: 10px;
                color: #aaa;
                font-style: italic;
                text-align: center;
            }
            `

			document.head.appendChild(style)
		}
	}

	showUI() {
		if (this.uiElement) {
			console.log('FixedCraftingUI.showUI called')

			try {
				// Update available recipes based on player's position
				if (
					typeof this.craftingSystem.updateNearbyCraftingStations === 'function'
				) {
					console.log('Calling updateNearbyCraftingStations...')
					this.craftingSystem.updateNearbyCraftingStations()
				} else {
					console.error('updateNearbyCraftingStations is not defined!')
				}

				// Render the recipe list
				this.renderRecipeList()

				// Show the UI
				this.uiElement.style.display = 'flex'
			} catch (error) {
				console.error('Error in showUI:', error)

				// Show error message to user
				const errorMsg = document.createElement('div')
				errorMsg.className = 'error-message'
				errorMsg.textContent = `Error: ${error.message}`
				this.recipeListElement.innerHTML = ''
				this.recipeListElement.appendChild(errorMsg)

				this.uiElement.style.display = 'flex'
			}
		}
	}

	hideUI() {
		if (this.uiElement) {
			this.uiElement.style.display = 'none'
		}
	}

	toggleUI() {
		console.log('FixedCraftingUI.toggleUI called')
		this.isCraftingOpen = !this.isCraftingOpen

		if (this.isCraftingOpen) {
			this.showUI()
		} else {
			this.hideUI()
		}

		return this.isCraftingOpen
	}

	toggleCrafting() {
		console.log('FixedCraftingUI.toggleCrafting called')
		return this.toggleUI()
	}

	renderRecipeList() {
		console.log('FixedCraftingUI.renderRecipeList called')

		// Clear previous list
		this.recipeListElement.innerHTML = ''

		try {
			// Check if getAvailableRecipes method exists
			if (typeof this.craftingSystem.getAvailableRecipes !== 'function') {
				console.error(
					'getAvailableRecipes method is not defined on craftingSystem'
				)
				const errorElement = document.createElement('div')
				errorElement.className = 'error-message'
				errorElement.textContent =
					'Error: Crafting system not fully initialized!'
				this.recipeListElement.appendChild(errorElement)
				return
			}

			// Get available recipes
			const availableRecipes = this.craftingSystem.getAvailableRecipes()

			if (!availableRecipes || availableRecipes.length === 0) {
				const noRecipesElement = document.createElement('div')
				noRecipesElement.className = 'no-recipes'
				noRecipesElement.textContent = 'No recipes available'
				this.recipeListElement.appendChild(noRecipesElement)
				return
			}

			// Render each recipe as a list item
			availableRecipes.forEach((recipe, index) => {
				try {
					const recipeItem = document.createElement('div')
					recipeItem.className = 'recipe-item'
					recipeItem.dataset.index = index

					// Recipe icon
					const recipeIcon = document.createElement('div')
					recipeIcon.className = 'recipe-icon'

					try {
						const resultTexture = window.BLOCKS[recipe.result.itemType]?.texture
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
							window.BLOCKS[recipe.result.itemType]?.name ||
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
		} catch (error) {
			console.error('Error in renderRecipeList:', error)
			const errorElement = document.createElement('div')
			errorElement.className = 'error-message'
			errorElement.textContent = `Error: ${error.message}`
			this.recipeListElement.appendChild(errorElement)
		}
	}

	selectRecipe(index) {
		console.log('FixedCraftingUI.selectRecipe called with index:', index)

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

		// Update quantity input max value based on available resources
		this.updateQuantityInputMax(index)

		// Update craft button text
		this.updateCraftButtonText(index)
	}

	updateCraftButtonText(index) {
		if (!this.craftButton) return

		try {
			const availableRecipes = this.craftingSystem.getAvailableRecipes()
			const recipe = availableRecipes[index]

			if (recipe) {
				const itemName =
					window.BLOCKS[recipe.result.itemType]?.name ||
					`Item #${recipe.result.itemType}`
				this.craftButton.textContent = `Craft ${itemName}`

				// Update with quantity if needed
				this.updateCraftButtonTextWithQuantity()
			} else {
				this.craftButton.textContent = 'Craft'
			}
		} catch (error) {
			console.error('Error updating craft button text:', error)
			this.craftButton.textContent = 'Craft'
		}
	}

	updateCraftButtonTextWithQuantity() {
		if (!this.craftButton || !this.quantityInput) return

		try {
			const quantity = parseInt(this.quantityInput.value) || 1
			const availableRecipes = this.craftingSystem.getAvailableRecipes()
			const recipe = availableRecipes[this.selectedRecipeIndex]

			if (recipe) {
				const itemName =
					window.BLOCKS[recipe.result.itemType]?.name ||
					`Item #${recipe.result.itemType}`
				const totalItems = recipe.result.count * quantity

				if (quantity > 1) {
					this.craftButton.textContent = `Craft ${itemName} (${totalItems}x)`
				} else {
					this.craftButton.textContent = `Craft ${itemName}`
				}
			}
		} catch (error) {
			console.error('Error updating craft button text with quantity:', error)
		}
	}

	updateQuantityInputMax(index) {
		// Reset quantity input
		if (!this.quantityInput) return

		// Default to 1
		this.quantityInput.value = '1'

		// Calculate max craftable amount based on ingredients
		try {
			const availableRecipes = this.craftingSystem.getAvailableRecipes()
			const recipe = availableRecipes[index]

			if (!recipe) return

			// Calculate how many items can be crafted based on available resources
			let maxCraftable = Infinity

			recipe.ingredients.forEach(ingredient => {
				if (!this.player || !this.player.inventory) return

				// Get how many of this ingredient the player has
				const availableCount = this.player.inventory.getItemCount(
					ingredient.itemType
				)

				// Calculate how many recipes can be made with this ingredient
				const possibleCrafts = Math.floor(availableCount / ingredient.count)

				// Update maxCraftable if this ingredient is more limiting
				maxCraftable = Math.min(maxCraftable, possibleCrafts)
			})

			// Set the max value for the quantity input
			if (maxCraftable !== Infinity) {
				this.quantityInput.max = maxCraftable.toString()
				console.log(`Set max craftable quantity to: ${maxCraftable}`)
			}
		} catch (error) {
			console.error('Error updating quantity input max:', error)
		}
	}

	renderRecipeDetails(index) {
		console.log('FixedCraftingUI.renderRecipeDetails called with index:', index)

		// Clear previous details
		this.detailsElement.innerHTML = ''

		try {
			// Get recipe
			const availableRecipes = this.craftingSystem.getAvailableRecipes()
			const recipe = availableRecipes[index]

			if (!recipe) {
				console.error(`Recipe not found at index: ${index}`)
				return
			}

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
					const playerHasItem = this.player?.inventory?.hasItem(
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
		} catch (error) {
			console.error('Error rendering recipe details:', error)

			const errorMsg = document.createElement('div')
			errorMsg.className = 'error-message'
			errorMsg.textContent = `Error: ${error.message}`
			this.detailsElement.appendChild(errorMsg)
		}
	}

	craftSelectedItem() {
		console.log('FixedCraftingUI.craftSelectedItem called')

		if (this.selectedRecipeIndex === -1) {
			return
		}

		try {
			const availableRecipes = this.craftingSystem.getAvailableRecipes()
			const recipeIndex = window.CRAFTING_RECIPES.findIndex(
				recipe => recipe === availableRecipes[this.selectedRecipeIndex]
			)

			if (recipeIndex !== -1) {
				// Get quantity from input
				let quantity = 1
				if (this.quantityInput) {
					quantity = parseInt(this.quantityInput.value) || 1

					// Validate quantity
					const maxQuantity = parseInt(this.quantityInput.max) || 1
					quantity = Math.max(1, Math.min(quantity, maxQuantity))

					console.log(
						`Crafting ${quantity} items with recipe index ${recipeIndex}`
					)
				}

				const success = this.craftingSystem.craftItem(recipeIndex, quantity)

				if (success) {
					// Re-render the recipe list to update ingredient availability
					this.renderRecipeList()

					// Re-render the details if an item is still selected
					if (this.selectedRecipeIndex !== -1) {
						this.renderRecipeDetails(this.selectedRecipeIndex)
						// Update the quantity input max
						this.updateQuantityInputMax(this.selectedRecipeIndex)
					}
				}
			}
		} catch (error) {
			console.error('Error in craftSelectedItem:', error)
		}
	}
}

// Replace the existing CraftingUI with our fixed version
window.CraftingUI = FixedCraftingUI
console.log('Fixed CraftingUI has been registered globally')
