// Ultimate crafting fix to ensure items can be crafted
console.log('Loading ultimate-crafting-fix.js')
;(function () {
	console.log('Applying ultimate crafting fix...')

	// Define a utility function to check if an object has all required properties
	function hasRequiredProperties(obj, propNames) {
		if (!obj) return false
		return propNames.every(prop => obj[prop] !== undefined)
	}

	// Add a global debug function to trigger crafting directly
	window.debugCraftItem = function (recipeIndex, quantity = 1) {
		if (!window.player) {
			console.error('No player found for direct crafting!')
			return false
		}

		const recipe = window.CRAFTING_RECIPES[recipeIndex]
		console.log('Debug crafting:', recipe, 'with quantity:', quantity)

		// Ensure quantity is valid
		quantity = Math.max(1, parseInt(quantity) || 1)

		// Calculate max craftable amount
		let maxCraftable = Infinity
		recipe.ingredients.forEach(ingredient => {
			if (window.player.inventory.hasItem) {
				const hasCount = window.player.inventory.getItemCount
					? window.player.inventory.getItemCount(ingredient.itemType)
					: 0
				const possibleCrafts = Math.floor(hasCount / ingredient.count)
				maxCraftable = Math.min(maxCraftable, possibleCrafts)
			}
		})

		// Limit quantity to what's possible
		if (quantity > maxCraftable) {
			quantity = maxCraftable
			console.log(`Limited quantity to ${quantity}`)
		}

		// If we can't craft any, return false
		if (quantity <= 0) {
			console.warn('Not enough ingredients to craft')
			return false
		}

		// Direct crafting implementation
		try {
			// Verify ingredients
			recipe.ingredients.forEach(ingredient => {
				const totalNeeded = ingredient.count * quantity
				const hasIngredient = window.player.inventory.hasItem(
					ingredient.itemType,
					totalNeeded
				)
				console.log(
					`Has ${ingredient.itemType} x${totalNeeded}: ${hasIngredient}`
				)
			})

			// Remove ingredients (adjusted for quantity)
			recipe.ingredients.forEach(ingredient => {
				const totalNeeded = ingredient.count * quantity
				window.player.inventory.removeItem(ingredient.itemType, totalNeeded)
			})

			// Add result (adjusted for quantity)
			const totalCrafted = recipe.result.count * quantity
			const success = window.player.inventory.addItem(
				recipe.result.itemType,
				totalCrafted
			)

			console.log(
				'Direct crafting result:',
				success,
				`(Crafted ${totalCrafted} items)`
			)
			return success
		} catch (error) {
			console.error('Error in direct crafting:', error)
			return false
		}
	}

	// Wait for player and UI to be initialized
	function initCraftingFix() {
		console.log('Checking if UI is initialized...')

		// Add click handler to craft button regardless of implementation
		const craftButton = document.querySelector('.craft-button')
		if (craftButton) {
			console.log('Found craft button, adding universal handler')

			// Remove old handlers by cloning
			const newButton = craftButton.cloneNode(true)
			craftButton.parentNode.replaceChild(newButton, craftButton)

			// Add direct handler
			newButton.addEventListener('click', function (event) {
				// Prevent event from bubbling up to document
				event.stopPropagation()
				console.log('CRAFT BUTTON CLICKED (Universal handler)')
				handleCraftButtonClick()
			})
		} else {
			console.log('Craft button not found, will retry in 1 second')
			setTimeout(initCraftingFix, 1000)
			return
		}

		// Add key handler for testing
		document.addEventListener('keydown', function (event) {
			// Alt+C to trigger crafting for testing
			if (event.altKey && event.key.toLowerCase() === 'c') {
				console.log('Alt+C pressed - debug crafting')
				// Pass quantity of 1 explicitly to ensure consistent behavior
				handleCraftButtonClick(1)
			}
		})

		console.log('Ultimate crafting fix initialized')
	}

	// Direct implementation of crafting logic
	function handleCraftButtonClick(forcedQuantity) {
		console.log(
			'Universal craft handler activated',
			forcedQuantity ? `with forced quantity: ${forcedQuantity}` : ''
		)

		// Find which UI implementation is active
		let activeUI = null

		if (window.player && window.player.craftingUI) {
			activeUI = window.player.craftingUI
			console.log('Found player.craftingUI')
		} else if (
			document.querySelector('.crafting-ui') &&
			document.querySelector('.crafting-ui').style.display !== 'none'
		) {
			// UI is visible but not accessible via player
			console.log('Crafting UI is visible but not linked to player')

			// Try to find the crafting UI instance
			if (window.craftingUI) {
				activeUI = window.craftingUI
				console.log('Found global craftingUI instance')
			}
		}

		if (!activeUI) {
			console.error('No active crafting UI found!')
			if (window.gameMonitor) {
				window.gameMonitor.error('Crafting system not initialized properly')
			}
			return
		}

		console.log('Found active UI:', activeUI)

		// Extract selected recipe index
		const selectedIndex = activeUI.selectedRecipeIndex
		console.log('Selected recipe index:', selectedIndex)

		if (selectedIndex === -1 || selectedIndex === undefined) {
			console.log('No recipe selected')
			if (window.gameMonitor) {
				window.gameMonitor.warn('Please select a recipe first')
			}
			return
		}

		// Get player reference - multiple ways to find it
		// First try - standard window.player reference
		let player = window.player

		// Second try - from activeUI.player (which sometimes has the reference)
		if (!player || !player.inventory) {
			console.log('Player not found in window.player, trying from UI...')
			if (activeUI.player) {
				player = activeUI.player
				console.log('Found player from activeUI.player')
			}
		}

		// Third try - from craftingSystem.player
		if (!player) {
			console.log('Player not found in UI, trying from craftingSystem...')
			if (activeUI.craftingSystem && activeUI.craftingSystem.player) {
				player = activeUI.craftingSystem.player
				console.log('Found player from activeUI.craftingSystem.player')
			}
		}

		// Check if we found a player
		if (!player) {
			console.error('Player not found!')
			if (window.gameMonitor) {
				window.gameMonitor.error('Player not initialized correctly')
			}
			return
		}

		// Fix for inventory - if the inventory property is missing, check if it's a direct property
		// or try to initialize it
		if (!player.inventory) {
			console.log('Player found but inventory is missing, trying to fix...')

			// Try to access inventory by key (in case it exists but is not detected properly)
			if (player['inventory']) {
				console.log('Found inventory as a property')
				// Create a reference to the existing inventory
				player.inventory = player['inventory']
			} else if (window.Inventory && typeof window.Inventory === 'function') {
				// Try to create a new inventory if missing
				console.log('Creating new inventory for player')
				player.inventory = new window.Inventory(player)
			} else {
				console.error('Inventory not found and cannot be created!')
				if (window.gameMonitor) {
					window.gameMonitor.error('Inventory not initialized correctly')
				}
				return
			}
		}

		// Get recipes and determine which one is selected
		let availableRecipes = []
		try {
			if (
				activeUI.craftingSystem &&
				activeUI.craftingSystem.getAvailableRecipes
			) {
				availableRecipes = activeUI.craftingSystem.getAvailableRecipes()
			}
		} catch (error) {
			console.error('Error getting available recipes:', error)
		}

		if (
			!availableRecipes ||
			!availableRecipes.length ||
			!availableRecipes[selectedIndex]
		) {
			console.error('Selected recipe not found in available recipes!')
			return
		}

		const selectedRecipe = availableRecipes[selectedIndex]
		console.log('Selected recipe:', selectedRecipe)

		// Find the matching recipe in global recipes
		let globalRecipeIndex = -1
		for (let i = 0; i < window.CRAFTING_RECIPES.length; i++) {
			const recipe = window.CRAFTING_RECIPES[i]
			if (recipe.result.itemType === selectedRecipe.result.itemType) {
				// Found a match by result item type
				const ingredientsMatch =
					recipe.ingredients.length === selectedRecipe.ingredients.length &&
					recipe.ingredients.every(
						(ing, idx) =>
							ing.itemType === selectedRecipe.ingredients[idx].itemType &&
							ing.count === selectedRecipe.ingredients[idx].count
					)

				if (ingredientsMatch) {
					globalRecipeIndex = i
					console.log('Found matching global recipe at index:', i)
					break
				}
			}
		}

		if (globalRecipeIndex === -1) {
			console.error('Could not find matching recipe in global recipes!')
			if (window.gameMonitor) {
				window.gameMonitor.error('Recipe not found in game database')
			}
			return
		}

		// DIRECT CRAFTING IMPLEMENTATION
		const recipe = window.CRAFTING_RECIPES[globalRecipeIndex]
		let hasAllIngredients = true
		let missingIngredients = []

		// Get quantity from input if available, or use forced quantity
		let quantity = forcedQuantity !== undefined ? forcedQuantity : 1
		if (!forcedQuantity && activeUI.quantityInput) {
			quantity = parseInt(activeUI.quantityInput.value) || 1

			// Validate quantity
			const maxQuantity = parseInt(activeUI.quantityInput.max) || 1
			quantity = Math.max(1, Math.min(quantity, maxQuantity))
			console.log(`Button handler: Crafting with quantity: ${quantity}`)
		}

		console.log(
			'Checking ingredients for recipe:',
			recipe,
			'with quantity:',
			quantity
		)

		// Add direct inventory access methods if they're missing
		if (!player.inventory.hasItem) {
			console.log('Adding missing hasItem method to inventory')
			player.inventory.hasItem = function (itemType, count) {
				let total = 0
				for (let i = 0; i < this.slots.length; i++) {
					if (this.slots[i] && this.slots[i].itemType === itemType) {
						total += this.slots[i].count
					}
				}
				return total >= count
			}
		}

		if (!player.inventory.removeItem) {
			console.log('Adding missing removeItem method to inventory')
			player.inventory.removeItem = function (itemType, count) {
				let remaining = count
				for (let i = 0; i < this.slots.length; i++) {
					if (this.slots[i] && this.slots[i].itemType === itemType) {
						if (this.slots[i].count > remaining) {
							this.slots[i].count -= remaining
							return true
						} else {
							remaining -= this.slots[i].count
							this.slots[i] = null
						}
						if (remaining <= 0) return true
					}
				}
				return false
			}
		}

		if (!player.inventory.addItem) {
			console.log('Adding missing addItem method to inventory')
			player.inventory.addItem = function (itemType, count) {
				// First try to stack with existing items
				for (let i = 0; i < this.slots.length; i++) {
					if (this.slots[i] && this.slots[i].itemType === itemType) {
						this.slots[i].count += count
						return true
					}
				}

				// If no stack available, find an empty slot
				for (let i = 0; i < this.slots.length; i++) {
					if (!this.slots[i]) {
						this.slots[i] = { itemType, count }
						return true
					}
				}

				return false // Inventory full
			}
		}

		// Verify ingredients
		recipe.ingredients.forEach(ingredient => {
			const totalNeeded = ingredient.count * quantity
			if (!player.inventory.hasItem(ingredient.itemType, totalNeeded)) {
				hasAllIngredients = false
				missingIngredients.push({
					type: ingredient.itemType,
					count: totalNeeded,
					name: window.BLOCKS[ingredient.itemType]?.name || 'Unknown Item',
				})
				console.log(
					`Missing ingredient: ${ingredient.itemType} x${totalNeeded}`
				)
			}
		})

		// Calculate maximum craftable quantity
		let maxCraftable = Infinity
		recipe.ingredients.forEach(ingredient => {
			const availableCount = player.inventory.slots
				? player.inventory.slots.reduce((total, slot) => {
						if (slot && slot.itemType === ingredient.itemType) {
							return total + slot.count
						}
						return total
				  }, 0)
				: 0

			const possibleCrafts = Math.floor(availableCount / ingredient.count)
			maxCraftable = Math.min(maxCraftable, possibleCrafts)
		})

		// If we don't have enough for requested quantity but can craft some
		if (!hasAllIngredients && maxCraftable > 0) {
			quantity = maxCraftable
			console.log(`Adjusted to craft ${quantity} items instead`)
			hasAllIngredients = true
			missingIngredients = []
		}

		if (hasAllIngredients && quantity > 0) {
			console.log(
				'Player has ingredients for',
				quantity,
				'crafts, crafting directly...'
			)

			try {
				// Remove ingredients (adjusted for quantity)
				recipe.ingredients.forEach(ingredient => {
					const totalNeeded = ingredient.count * quantity
					player.inventory.removeItem(ingredient.itemType, totalNeeded)
				})

				// Add result (adjusted for quantity)
				const totalCrafted = recipe.result.count * quantity
				const success = player.inventory.addItem(
					recipe.result.itemType,
					totalCrafted
				)

				if (success) {
					console.log('Successfully crafted', totalCrafted, 'items!')

					// Show success message
					if (window.gameMonitor) {
						const itemName =
							window.BLOCKS[recipe.result.itemType]?.name ||
							'Item #' + recipe.result.itemType
						window.gameMonitor.success(`Crafted: ${totalCrafted}x ${itemName}`)
					}

					// Re-render the recipe list and details
					if (activeUI.renderRecipeList) {
						activeUI.renderRecipeList()
					}

					if (
						activeUI.renderRecipeDetails &&
						activeUI.selectedRecipeIndex !== -1
					) {
						activeUI.renderRecipeDetails(activeUI.selectedRecipeIndex)
					}

					// Update quantity input max value if needed
					if (
						activeUI.updateQuantityInputMax &&
						activeUI.selectedRecipeIndex !== -1
					) {
						activeUI.updateQuantityInputMax(activeUI.selectedRecipeIndex)
					}

					// Update UI
					if (player.inventory.updateUI) {
						player.inventory.updateUI()
					}
				} else {
					console.error('Failed to add crafted item to inventory!')
					if (window.gameMonitor) {
						window.gameMonitor.error('Inventory is full!')
					}
				}
			} catch (error) {
				console.error('Error during crafting:', error)
				if (window.gameMonitor) {
					window.gameMonitor.error('Error during crafting: ' + error.message)
				}
			}
		} else {
			console.log('Missing ingredients for crafting:', missingIngredients)
			if (window.gameMonitor) {
				const missingNames = missingIngredients
					.map(ing => `${ing.name} x${ing.count}`)
					.join(', ')
				window.gameMonitor.error('Missing: ' + missingNames)
			}
		}
	}

	// Start initialization when the document is ready
	if (document.readyState === 'complete') {
		initCraftingFix()
	} else {
		window.addEventListener('load', initCraftingFix)
	}

	// Also try to initialize after a short delay in case the UI is created dynamically
	setTimeout(initCraftingFix, 2000)

	console.log('Ultimate crafting fix loaded')
})()
