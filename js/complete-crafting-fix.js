// Complete Crafting Fix - Final solution for both online and offline modes
console.log('Loading complete-crafting-fix.js - FINAL FIX')
;(function () {
	console.log('Initializing complete crafting fix...')

	// The main issue is that player references get lost or mismatched
	// especially in offline mode. This fix ensures that the correct player
	// reference is used consistently.

	// First, we need a reliable way to get the player instance
	function getPlayerInstance() {
		// Try the global player first
		if (window.player && typeof window.player === 'object') {
			return window.player
		}

		// Try to find player through the crafting UI
		const craftingUI = document.querySelector('.crafting-ui')
		if (craftingUI) {
			// Search for player references in window objects
			for (const key in window) {
				if (window[key] && typeof window[key] === 'object') {
					// Check if it has a player or craftingSystem.player property
					if (window[key].player && typeof window[key].player === 'object') {
						return window[key].player
					}

					if (
						window[key].craftingSystem &&
						window[key].craftingSystem.player &&
						typeof window[key].craftingSystem.player === 'object'
					) {
						return window[key].craftingSystem.player
					}
				}
			}
		}

		return null
	}

	// The most direct implementation of the craftItem function
	function simpleCraftItem(recipeIndex, quantity = 1) {
		console.log(
			'Final craftItem implementation with index:',
			recipeIndex,
			'quantity:',
			quantity
		)

		const player = getPlayerInstance()
		if (!player) {
			console.error('No player instance found!')
			return false
		}

		if (!player.inventory) {
			console.error('Player has no inventory!')
			return false
		}

		// Validate recipe index
		if (recipeIndex < 0 || recipeIndex >= window.CRAFTING_RECIPES.length) {
			console.error('Invalid recipe index:', recipeIndex)
			return false
		}

		const recipe = window.CRAFTING_RECIPES[recipeIndex]
		console.log('Crafting recipe:', recipe)

		// Check if player has all ingredients
		let hasIngredients = true

		// Ensure quantity is valid and at least 1
		quantity = Math.max(1, parseInt(quantity) || 1)
		console.log(`Using quantity: ${quantity}`)

		// Calculate maximum craftable quantity based on available ingredients
		let maxCraftable = Infinity
		recipe.ingredients.forEach(ingredient => {
			let count = 0

			// Count items in player's inventory
			if (player.inventory.slots) {
				player.inventory.slots.forEach(slot => {
					if (slot && slot.itemType === ingredient.itemType) {
						count += slot.count
					}
				})
			}

			const possibleCrafts = Math.floor(count / ingredient.count)
			maxCraftable = Math.min(maxCraftable, possibleCrafts)

			if (count < ingredient.count * quantity) {
				hasIngredients = false
				console.warn(
					`Missing ingredient: need ${ingredient.count * quantity} of ${
						window.BLOCKS[ingredient.itemType].name
					}, have ${count}`
				)
			}
		})

		// Limit quantity to what's possible
		if (quantity > maxCraftable) {
			quantity = maxCraftable
			console.log(
				`Limited quantity to ${quantity} based on available ingredients`
			)
		}

		// If we can't craft any, return false
		if (quantity <= 0) {
			console.warn('Not enough ingredients to craft')
			return false
		}

		if (!hasIngredients) {
			console.warn(
				'Player does not have all ingredients for requested quantity'
			)

			// If we can craft at least 1, continue with adjusted quantity
			if (maxCraftable > 0) {
				quantity = maxCraftable
				console.log(`Adjusted to craft ${quantity} items instead`)
				hasIngredients = true
			} else {
				return false
			}
		}

		try {
			// Remove ingredients (adjusted for quantity)
			for (const ingredient of recipe.ingredients) {
				let remaining = ingredient.count * quantity

				// Find slots with this item and remove required amount
				for (
					let i = 0;
					i < player.inventory.slots.length && remaining > 0;
					i++
				) {
					const slot = player.inventory.slots[i]

					if (slot && slot.itemType === ingredient.itemType) {
						const removeAmount = Math.min(slot.count, remaining)
						slot.count -= removeAmount
						remaining -= removeAmount

						if (slot.count <= 0) {
							player.inventory.slots[i] = null
						}
					}
				}
			}

			// Add crafted item to inventory (adjusted for quantity)
			const totalCrafted = recipe.result.count * quantity
			let added = false

			// First try to stack with existing items
			for (let i = 0; i < player.inventory.slots.length; i++) {
				const slot = player.inventory.slots[i]

				if (slot && slot.itemType === recipe.result.itemType) {
					slot.count += totalCrafted
					added = true
					break
				}
			}

			// If not stacked, find an empty slot
			if (!added) {
				for (let i = 0; i < player.inventory.slots.length; i++) {
					if (!player.inventory.slots[i]) {
						player.inventory.slots[i] = {
							itemType: recipe.result.itemType,
							count: totalCrafted,
						}
						added = true
						break
					}
				}
			}

			if (!added) {
				console.error('Could not add item to inventory - inventory full')
				return false
			}

			// Update UI
			if (typeof player.inventory.renderHotbar === 'function') {
				player.inventory.renderHotbar()
			}

			if (
				typeof player.inventory.renderFullInventory === 'function' &&
				player.inventory.isFullInventoryOpen
			) {
				player.inventory.renderFullInventory()
			}

			console.log('Crafting successful!')

			return true
		} catch (error) {
			console.error('Error crafting item:', error)
			return false
		}
	}

	// Override all craftItem methods in the system
	function overrideCraftingMethods() {
		console.log('Overriding all craftItem methods...')

		// Fix CraftingSystem.prototype.craftItem if it exists
		if (window.CraftingSystem && window.CraftingSystem.prototype) {
			console.log('Overriding CraftingSystem.prototype.craftItem')
			window.CraftingSystem.prototype.craftItem = simpleCraftItem
		}

		// Fix FixedCraftingSystem.prototype.craftItem if it exists
		if (window.FixedCraftingSystem && window.FixedCraftingSystem.prototype) {
			console.log('Overriding FixedCraftingSystem.prototype.craftItem')
			window.FixedCraftingSystem.prototype.craftItem = simpleCraftItem
		}

		// Add global direct crafting function
		window.directCraftItem = simpleCraftItem
		console.log('Added global directCraftItem function')

		// Fix all crafting UI instances
		for (const key in window) {
			if (window[key] && typeof window[key] === 'object') {
				// Fix craftingSystem.craftItem
				if (
					window[key].craftingSystem &&
					typeof window[key].craftingSystem === 'object'
				) {
					console.log('Fixing craftingSystem.craftItem in', key)
					window[key].craftingSystem.craftItem = simpleCraftItem
				}

				// Fix craftSelectedItem in UI instances
				if (typeof window[key].craftSelectedItem === 'function') {
					const originalCraftSelectedItem = window[key].craftSelectedItem

					window[key].craftSelectedItem = function () {
						console.log('Overridden craftSelectedItem called in', key)

						const selectedIndex = this.selectedRecipeIndex
						if (selectedIndex === -1 || selectedIndex === undefined) {
							console.warn('No recipe selected')
							return false
						}

						try {
							// Get the available recipes
							const availableRecipes = this.craftingSystem.getAvailableRecipes()
							if (!availableRecipes || !availableRecipes[selectedIndex]) {
								console.error('Selected recipe not available:', selectedIndex)
								return false
							}

							// Find the recipe index in the global recipes list
							const recipe = availableRecipes[selectedIndex]
							const recipeIndex = window.CRAFTING_RECIPES.findIndex(
								r =>
									r.result.itemType === recipe.result.itemType &&
									JSON.stringify(r.ingredients) ===
										JSON.stringify(recipe.ingredients)
							)

							if (recipeIndex === -1) {
								console.error('Recipe not found in global recipes')
								return false
							}

							// Get quantity from input if available
							let quantity = 1
							if (this.quantityInput) {
								quantity = parseInt(this.quantityInput.value) || 1

								// Validate quantity
								const maxQuantity = parseInt(this.quantityInput.max) || 1
								quantity = Math.max(1, Math.min(quantity, maxQuantity))
								console.log(`Crafting with quantity: ${quantity}`)
							}

							// Use our simple implementation with quantity
							const success = simpleCraftItem(recipeIndex, quantity)

							if (success) {
								// Update UI
								if (typeof this.renderRecipeList === 'function') {
									this.renderRecipeList()
								}

								if (
									typeof this.renderRecipeDetails === 'function' &&
									this.selectedRecipeIndex !== -1
								) {
									this.renderRecipeDetails(this.selectedRecipeIndex)
								}

								// Update quantity input max if needed
								if (
									typeof this.updateQuantityInputMax === 'function' &&
									this.selectedRecipeIndex !== -1
								) {
									this.updateQuantityInputMax(this.selectedRecipeIndex)
								}
							}

							return success
						} catch (error) {
							console.error('Error in overridden craftSelectedItem:', error)
							return false
						}
					}
				}
			}
		}
	}

	// Add direct button handler
	function addCraftButtonHandler() {
		console.log('Adding direct craft button handler...')

		// Global click handler for craft buttons - ONLY target .craft-button specifically
		document.addEventListener('click', function (event) {
			// Make sure we're only capturing clicks on the actual craft button
			if (
				event.target &&
				event.target.classList.contains('craft-button') &&
				!event.target.closest('.quantity-container') && // Not in quantity controls
				!event.target.closest('.recipe-item') && // Not a recipe item
				event.target.textContent.includes('Craft') // Only if it has "Craft" in the text
			) {
				// Stop propagation to prevent other handlers from firing
				event.stopPropagation()

				console.log('Craft button clicked!')

				// Find any crafting UI
				let craftingUI = null
				for (const key in window) {
					if (
						window[key] &&
						typeof window[key] === 'object' &&
						typeof window[key].renderRecipeList === 'function' &&
						window[key].selectedRecipeIndex !== undefined
					) {
						craftingUI = window[key]
						break
					}
				}

				if (!craftingUI) {
					console.warn('No crafting UI found')
					return
				}

				console.log('Using crafting UI to craft selected recipe')

				try {
					if (craftingUI.selectedRecipeIndex === -1) {
						console.warn('No recipe selected')
						return
					}

					// Get the available recipes
					const availableRecipes =
						craftingUI.craftingSystem.getAvailableRecipes()
					if (
						!availableRecipes ||
						!availableRecipes[craftingUI.selectedRecipeIndex]
					) {
						console.error('Selected recipe not available')
						return
					}

					// Find the recipe index in the global recipes list
					const recipe = availableRecipes[craftingUI.selectedRecipeIndex]
					const recipeIndex = window.CRAFTING_RECIPES.findIndex(
						r =>
							r.result.itemType === recipe.result.itemType &&
							JSON.stringify(r.ingredients) ===
								JSON.stringify(recipe.ingredients)
					)

					if (recipeIndex === -1) {
						console.error('Recipe not found in global recipes')
						return
					}

					// Get quantity from input if available
					let quantity = 1
					if (craftingUI.quantityInput) {
						quantity = parseInt(craftingUI.quantityInput.value) || 1

						// Validate quantity
						const maxQuantity = parseInt(craftingUI.quantityInput.max) || 1
						quantity = Math.max(1, Math.min(quantity, maxQuantity))
						console.log(`Button handler: Crafting with quantity: ${quantity}`)
					}

					// Use our simple implementation with quantity
					const success = simpleCraftItem(recipeIndex, quantity)

					if (success) {
						// Update UI
						craftingUI.renderRecipeList()

						if (craftingUI.selectedRecipeIndex !== -1) {
							craftingUI.renderRecipeDetails(craftingUI.selectedRecipeIndex)

							// Update quantity input max if needed
							if (typeof craftingUI.updateQuantityInputMax === 'function') {
								craftingUI.updateQuantityInputMax(
									craftingUI.selectedRecipeIndex
								)
							}
						}
					}
				} catch (error) {
					console.error('Error in craft button handler:', error)
				}
			}
		})
	}

	// Add debug keybinding
	function addDebugKeybinding() {
		document.addEventListener('keydown', function (event) {
			// Alt+C to craft first torch recipe
			if (event.altKey && event.key === 'c') {
				console.log('Debug crafting triggered (Alt+C)')

				// Try to find a torch recipe
				let torchRecipeIndex = -1

				window.CRAFTING_RECIPES.forEach((recipe, index) => {
					if (recipe.result.itemType === window.BLOCK_TYPES.TORCH) {
						torchRecipeIndex = index
						return
					}
				})

				if (torchRecipeIndex !== -1) {
					console.log('Found torch recipe at index:', torchRecipeIndex)
					// Use quantity of 1 by default
					const success = simpleCraftItem(torchRecipeIndex, 1)
					console.log('Torch crafting result:', success ? 'Success' : 'Failed')
				} else {
					console.warn('No torch recipe found')
				}
			}
		})

		console.log('Debug keybinding added (Alt+C)')
	}

	// Initialize everything
	function initialize() {
		console.log('Initializing complete crafting fix...')

		// Override all crafting methods
		overrideCraftingMethods()

		// Add direct button handler
		addCraftButtonHandler()

		// Add debug keybinding
		addDebugKeybinding()
	}

	// Execute the initialization
	if (document.readyState === 'complete') {
		initialize()
	} else {
		window.addEventListener('load', initialize)
	}

	// Also initialize after a delay to ensure all other scripts have loaded
	setTimeout(initialize, 2000)

	console.log('Complete crafting fix loaded successfully!')
})()
