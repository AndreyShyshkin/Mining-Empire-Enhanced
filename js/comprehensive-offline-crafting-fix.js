// Complete offline crafting fix
console.log('Loading comprehensive-offline-crafting-fix.js')
;(function () {
	console.log('Initializing comprehensive offline crafting fix...')

	// Global reference to ensure consistent access to player
	let globalPlayerRef = null

	// Function to poll and find the player instance
	function findPlayerInstance() {
		// Try multiple ways to find player object
		if (window.player) {
			globalPlayerRef = window.player
			console.log('Found player via window.player')
			return window.player
		}

		// Try searching for player in UI components
		const craftingUI = document.querySelector('.crafting-ui')
		if (craftingUI) {
			for (const key in window) {
				if (
					window[key] &&
					typeof window[key] === 'object' &&
					window[key].craftingSystem &&
					window[key].craftingSystem.player
				) {
					globalPlayerRef = window[key].craftingSystem.player
					console.log('Found player via UI component:', key)
					return globalPlayerRef
				}
			}
		}

		return null
	}

	// Fix for CraftingUI's craftSelectedItem method
	function fixCraftSelectedItem() {
		// First, check if CraftingUI exists
		if (typeof window.CraftingUI !== 'function') {
			console.warn('CraftingUI constructor not found!')
			return
		}

		console.log('Fixing CraftingUI.craftSelectedItem method...')

		// Fix the craftSelectedItem method
		const originalCraftSelectedItem =
			window.CraftingUI.prototype.craftSelectedItem

		window.CraftingUI.prototype.craftSelectedItem = function () {
			console.log('Enhanced craftSelectedItem called')

			// First find player instance to make sure we have it
			const player = findPlayerInstance()
			if (!player) {
				console.error('Failed to find player instance')
				return false
			}

			// Check if we have a selected recipe
			if (
				this.selectedRecipeIndex === -1 ||
				this.selectedRecipeIndex === undefined
			) {
				console.warn('No recipe selected')
				return false
			}

			try {
				// Get available recipes
				const availableRecipes = this.craftingSystem.getAvailableRecipes()
				if (!availableRecipes || !availableRecipes[this.selectedRecipeIndex]) {
					console.error(
						'Selected recipe not available:',
						this.selectedRecipeIndex
					)
					return false
				}

				// Get the selected recipe
				const selectedRecipe = availableRecipes[this.selectedRecipeIndex]
				console.log('Selected recipe:', selectedRecipe)

				// Make sure the player reference is correct
				if (this.craftingSystem.player !== player) {
					console.warn('Fixing player reference in craftingSystem')
					this.craftingSystem.player = player
				}

				// Try to find the recipe index in the global recipes list
				const recipeIndex = window.CRAFTING_RECIPES.findIndex(
					recipe =>
						recipe.result.itemType === selectedRecipe.result.itemType &&
						JSON.stringify(recipe.ingredients) ===
							JSON.stringify(selectedRecipe.ingredients)
				)

				console.log('Found global recipe index:', recipeIndex)

				// Craft the item
				if (recipeIndex !== -1) {
					// Ensure the craftItem method is available
					if (typeof this.craftingSystem.craftItem !== 'function') {
						console.error('craftingSystem.craftItem method not found!')
						return false
					}

					// Call the craftItem method
					console.log('Crafting item with recipe index:', recipeIndex)
					const success = this.craftingSystem.craftItem(recipeIndex)
					console.log('Craft result:', success ? 'Success' : 'Failed')

					if (success) {
						// Update UI
						this.renderRecipeList()
						if (this.selectedRecipeIndex !== -1) {
							this.renderRecipeDetails(this.selectedRecipeIndex)
						}

						// Also update the inventory UI
						if (player.inventory) {
							if (typeof player.inventory.renderHotbar === 'function') {
								player.inventory.renderHotbar()
							}
							if (
								player.inventory.isFullInventoryOpen &&
								typeof player.inventory.renderFullInventory === 'function'
							) {
								player.inventory.renderFullInventory()
							}
						}
					}

					return success
				} else {
					console.error('Recipe not found in global recipes')
					return false
				}
			} catch (error) {
				console.error('Error in craftSelectedItem:', error)
				return false
			}
		}

		console.log('CraftingUI.craftSelectedItem method fixed')
	}

	// Fix for direct crafting button clicks
	function addDirectCraftButtonHandler() {
		console.log('Setting up direct craft button handler')

		// Add a click event listener for all craft buttons
		document.addEventListener('click', function (event) {
			// Check if the clicked element is specifically a craft button and not within quantity controls
			if (
				event.target &&
				event.target.classList.contains('craft-button') &&
				!event.target.closest('.quantity-container') && // Not in quantity controls
				!event.target.closest('.recipe-item') // Not a recipe item
			) {
				console.log('Craft button clicked via direct handler!')

				// Find the crafting UI instance
				let craftingUI = null
				for (const key in window) {
					if (
						window[key] &&
						typeof window[key] === 'object' &&
						window[key].craftingSystem &&
						window[key].renderRecipeList
					) {
						craftingUI = window[key]
						break
					}
				}

				if (!craftingUI) {
					console.warn('Could not find crafting UI instance')
					return
				}

				// Get the selected recipe index
				if (craftingUI.selectedRecipeIndex === -1) {
					console.warn('No recipe is selected')
					return
				}

				// Call the improved craftSelectedItem method
				craftingUI.craftSelectedItem()
			}
		})
	}

	// Find and fix the FixedCraftingSystem
	function fixCraftingSystem() {
		// Check if FixedCraftingSystem is available
		if (typeof window.FixedCraftingSystem !== 'function') {
			console.warn('FixedCraftingSystem constructor not found')
			return
		}

		console.log('Fixing FixedCraftingSystem craftItem method...')

		// Fix the craftItem method
		const originalCraftItem = window.FixedCraftingSystem.prototype.craftItem

		window.FixedCraftingSystem.prototype.craftItem = function (recipeIndex) {
			console.log('Enhanced craftItem called with index:', recipeIndex)

			// Make sure the player reference is correct
			const player = findPlayerInstance()
			if (player && this.player !== player) {
				console.log('Updating player reference in craftingSystem')
				this.player = player
			}

			// Validate recipe index
			if (recipeIndex < 0 || recipeIndex >= window.CRAFTING_RECIPES.length) {
				console.error('Invalid recipe index:', recipeIndex)
				return false
			}

			// Get the recipe
			const recipe = window.CRAFTING_RECIPES[recipeIndex]
			console.log('Recipe to craft:', recipe)

			// Check if the player has all the ingredients
			if (!this.hasIngredients(recipe)) {
				console.warn("Player doesn't have all ingredients")
				return false
			}

			// Check if the required crafting station is available
			if (!this.hasRequiredStation(recipe)) {
				console.warn('Required crafting station not available')
				return false
			}

			try {
				// Remove the ingredients from the player's inventory
				recipe.ingredients.forEach(ingredient => {
					console.log(
						'Removing ingredient:',
						ingredient.count + 'x',
						window.BLOCKS[ingredient.itemType].name
					)

					if (
						!player.inventory.removeItem(ingredient.itemType, ingredient.count)
					) {
						throw new Error(
							'Failed to remove item from inventory: ' +
								window.BLOCKS[ingredient.itemType].name
						)
					}
				})

				// Add the result to the player's inventory
				console.log(
					'Adding result:',
					recipe.result.count + 'x',
					window.BLOCKS[recipe.result.itemType].name
				)

				if (
					!player.inventory.addItem(recipe.result.itemType, recipe.result.count)
				) {
					throw new Error(
						'Failed to add item to inventory: ' +
							window.BLOCKS[recipe.result.itemType].name
					)
				}

				// Update the UI
				if (typeof player.inventory.renderHotbar === 'function') {
					player.inventory.renderHotbar()
				}

				if (
					player.inventory.isFullInventoryOpen &&
					typeof player.inventory.renderFullInventory === 'function'
				) {
					player.inventory.renderFullInventory()
				}

				console.log('Crafting successful!')
				return true
			} catch (error) {
				console.error('Error while crafting:', error)
				return false
			}
		}

		console.log('FixedCraftingSystem craftItem method fixed')
	}

	// Create direct crafting implementation that bypasses the regular system
	function createDirectCraftingImplementation() {
		// Add a global direct crafting function
		window.directCraftItem = function (recipeIndex) {
			console.log('Direct crafting of recipe index:', recipeIndex)

			// Find player instance
			const player = findPlayerInstance()
			if (!player) {
				console.error('Player not found for direct crafting')
				return false
			}

			// Validate recipe index
			if (recipeIndex < 0 || recipeIndex >= window.CRAFTING_RECIPES.length) {
				console.error('Invalid recipe index for direct crafting')
				return false
			}

			// Get the recipe
			const recipe = window.CRAFTING_RECIPES[recipeIndex]

			// Check if player has all ingredients
			let hasAllIngredients = true
			recipe.ingredients.forEach(ingredient => {
				let playerCount = 0

				// Count how many of this ingredient the player has
				if (player.inventory && player.inventory.slots) {
					player.inventory.slots.forEach(slot => {
						if (slot && slot.itemType === ingredient.itemType) {
							playerCount += slot.count
						}
					})
				}

				if (playerCount < ingredient.count) {
					hasAllIngredients = false
				}
			})

			if (!hasAllIngredients) {
				console.warn('Player does not have all ingredients for direct crafting')
				return false
			}

			try {
				// Remove ingredients (manually, not using removeItem)
				recipe.ingredients.forEach(ingredient => {
					let remainingToRemove = ingredient.count

					for (
						let i = 0;
						i < player.inventory.slots.length && remainingToRemove > 0;
						i++
					) {
						const slot = player.inventory.slots[i]

						if (slot && slot.itemType === ingredient.itemType) {
							const removeCount = Math.min(slot.count, remainingToRemove)
							slot.count -= removeCount
							remainingToRemove -= removeCount

							// Clear slot if empty
							if (slot.count <= 0) {
								player.inventory.slots[i] = null
							}
						}
					}
				})

				// Add result (manually, not using addItem)
				let added = false

				// First try to stack with existing items
				for (let i = 0; i < player.inventory.slots.length; i++) {
					const slot = player.inventory.slots[i]

					if (slot && slot.itemType === recipe.result.itemType) {
						slot.count += recipe.result.count
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
								count: recipe.result.count,
							}
							added = true
							break
						}
					}
				}

				if (!added) {
					console.error('Failed to add item to inventory - inventory full')
					return false
				}

				// Update UI
				if (typeof player.inventory.renderHotbar === 'function') {
					player.inventory.renderHotbar()
				}

				if (
					player.inventory.isFullInventoryOpen &&
					typeof player.inventory.renderFullInventory === 'function'
				) {
					player.inventory.renderFullInventory()
				}

				console.log('Direct crafting successful')
				return true
			} catch (error) {
				console.error('Error in direct crafting:', error)
				return false
			}
		}

		console.log('Direct crafting implementation created')
	}

	// Add keybinding for testing crafting
	function addDebugKeybinding() {
		document.addEventListener('keydown', function (event) {
			// Alt+C to craft first recipe (or any available recipe)
			if (event.altKey && event.key === 'c') {
				console.log('Debug crafting triggered (Alt+C)')

				// Find any recipe in the crafting system
				const player = findPlayerInstance()
				if (!player) {
					console.error('Player not found for debug crafting')
					return
				}

				// Try to craft the first torch recipe
				// Look for torch recipes in the global recipes
				let recipeIndex = -1

				window.CRAFTING_RECIPES.forEach((recipe, index) => {
					if (recipe.result.itemType === window.BLOCK_TYPES.TORCH) {
						recipeIndex = index
					}
				})

				if (recipeIndex !== -1) {
					console.log('Found torch recipe at index:', recipeIndex)

					// Try direct crafting first
					if (typeof window.directCraftItem === 'function') {
						const success = window.directCraftItem(recipeIndex)
						console.log(
							'Direct crafting result:',
							success ? 'Success' : 'Failed'
						)
					}
				} else {
					console.warn('No torch recipe found')
				}
			}
		})

		console.log('Debug keybinding added (Alt+C for torch crafting)')
	}

	// Initialize all fixes
	function init() {
		console.log('Initializing all crafting fixes...')

		// Find the player first
		findPlayerInstance()

		// Apply all fixes
		fixCraftSelectedItem()
		fixCraftingSystem()
		addDirectCraftButtonHandler()
		createDirectCraftingImplementation()
		addDebugKeybinding()

		// Set up a periodic check for player in case it's loaded later
		const playerCheckInterval = setInterval(() => {
			const player = findPlayerInstance()
			if (player) {
				console.log('Player instance found, fixing crafting references')

				// Update player references in all crafting UIs
				for (const key in window) {
					if (
						window[key] &&
						typeof window[key] === 'object' &&
						window[key].craftingSystem &&
						typeof window[key].craftingSystem === 'object'
					) {
						window[key].craftingSystem.player = player

						if (window[key].player !== player) {
							window[key].player = player
						}
					}
				}

				clearInterval(playerCheckInterval)
			}
		}, 1000)
	}

	// Run init on load and after a short delay to ensure all scripts are loaded
	if (document.readyState === 'complete') {
		init()
	} else {
		window.addEventListener('load', init)
	}

	// Also run init after a delay in case the game loads scripts dynamically
	setTimeout(init, 2000)

	console.log('Comprehensive offline crafting fix loaded')
})()
