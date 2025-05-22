/**
 * Inventory Visibility Fix
 *
 * This file fixes issues with inventory visibility when switching between worlds.
 * The main problem is that sometimes the inventory state gets out of sync with its
 * visual representation, causing the inventory to be "open" but not visible.
 */

console.log('Loading inventory-visibility-fix.js')

;(function () {
	// Function to reset inventory state
	function resetInventoryState() {
		console.log('[Visibility Fix] Resetting inventory state')

		// If we have a player with inventory, reset its state
		if (window.player && window.player.inventory) {
			// Reset the open state
			window.player.inventory.isFullInventoryOpen = false

			// Make sure the UI element is hidden
			if (window.player.inventory.fullInventoryElement) {
				window.player.inventory.fullInventoryElement.style.display = 'none'
			}

			// Clean up any orphaned UI elements
			const inventories = document.querySelectorAll('#fullInventory')
			inventories.forEach(inv => {
				if (inv !== window.player.inventory.fullInventoryElement) {
					console.log('[Visibility Fix] Removing orphaned inventory element')
					inv.remove()
				}
			})
		} else {
			// If player doesn't exist yet, clean up any lingering inventory elements
			const inventories = document.querySelectorAll('#fullInventory')
			if (inventories.length > 0) {
				console.log(
					'[Visibility Fix] Removing all inventory elements during reset'
				)
				inventories.forEach(inv => inv.remove())
			}
		}

		// Also reset crafting UI if it exists
		if (window.craftingUI) {
			window.craftingUI.isCraftingOpen = false

			// Hide the crafting container if it exists
			if (window.craftingUI.craftingContainer) {
				window.craftingUI.craftingContainer.style.display = 'none'
			}
		}

		// Make sure game isn't paused
		window.gameIsPaused = false
	}

	// Enhance the Inventory class
	if (typeof Inventory === 'function' && Inventory.prototype) {
		console.log('[Visibility Fix] Enhancing Inventory class')

		// Store the original constructor
		const originalInventory = Inventory

		// Add methods to fix visibility issues
		Inventory.prototype.fixVisibility = function () {
			console.log('[Visibility Fix] Fixing inventory visibility')

			// Make sure UI element exists and hasn't been orphaned
			if (
				!this.fullInventoryElement ||
				!document.body.contains(this.fullInventoryElement)
			) {
				console.log('[Visibility Fix] Recreating inventory UI')

				// First remove any existing inventory element that might be orphaned
				const oldInventories = document.querySelectorAll('#fullInventory')
				oldInventories.forEach(inv => inv.remove())

				// Then create a new one
				this.fullInventoryElement = null
				this.createFullInventoryUI()
			}

			// Make sure display state matches the isOpen flag
			if (this.isFullInventoryOpen) {
				// Should be visible
				if (this.fullInventoryElement.style.display !== 'flex') {
					console.log(
						'[Visibility Fix] Showing inventory that should be visible'
					)
					this.renderFullInventory()
					this.fullInventoryElement.style.display = 'flex'
					window.gameIsPaused = true
				}
			} else {
				// Should be hidden
				if (this.fullInventoryElement.style.display !== 'none') {
					console.log('[Visibility Fix] Hiding inventory that should be hidden')
					this.fullInventoryElement.style.display = 'none'

					// Only unpause if crafting isn't open
					if (!window.craftingUI || !window.craftingUI.isCraftingOpen) {
						window.gameIsPaused = false
					}
				}
			}
		}

		// Enhance toggle method to ensure visibility
		const originalToggle = Inventory.prototype.toggleFullInventory
		Inventory.prototype.toggleFullInventory = function () {
			console.log('[Visibility Fix] Enhanced toggle called')

			// Call original toggle method
			const result = originalToggle.call(this)

			// Make sure visibility is correct
			this.fixVisibility()

			return result
		}
	}

	// Override startGame to ensure inventory state is reset when switching worlds
	if (window.startGame) {
		const originalStartGame = window.startGame
		window.startGame = function (...args) {
			// First, clean up any UI elements that might be lingering
			console.log('[Visibility Fix] Cleaning up before starting game')

			// Reset inventory state before starting game
			resetInventoryState()

			// Remove any lingering UI elements
			const inventories = document.querySelectorAll('#fullInventory')
			inventories.forEach(inv => {
				console.log(
					'[Visibility Fix] Removing inventory element before game start'
				)
				inv.remove()
			})

			// Also remove any crafting UI elements
			const craftingContainers = document.querySelectorAll(
				'.crafting-container'
			)
			craftingContainers.forEach(container => {
				console.log(
					'[Visibility Fix] Removing crafting container before game start'
				)
				container.remove()
			})

			// Call original startGame
			const result = originalStartGame.apply(this, args)

			// After game starts, check and reset again in case something went wrong
			setTimeout(() => {
				console.log('[Visibility Fix] Post-game start cleanup check')

				// Clean up any duplicate elements that might have been created
				const inventories = document.querySelectorAll('#fullInventory')
				if (inventories.length > 1) {
					console.log(
						'[Visibility Fix] Found multiple inventory elements, cleaning up'
					)

					// Keep only the one attached to the player if possible
					let keptOne = false

					if (window.player && window.player.inventory) {
						inventories.forEach(inv => {
							if (inv !== window.player.inventory.fullInventoryElement) {
								inv.remove()
							} else {
								keptOne = true
							}
						})
					}

					// If we couldn't identify which one to keep, remove all but the first
					if (!keptOne) {
						for (let i = 1; i < inventories.length; i++) {
							inventories[i].remove()
						}
					}
				}

				// Ensure that if player exists, inventory is properly set up
				if (window.player && window.player.inventory) {
					window.player.inventory.fixVisibility()
				}
			}, 1000)

			return result
		}
	}

	// Periodically check and fix visibility during gameplay
	function setupVisibilityFixer() {
		// Check every 2 seconds
		setInterval(() => {
			// Only run checks when in game
			if (!window.isInGame) return

			// Check for orphaned inventory elements or multiple elements
			const inventories = document.querySelectorAll('#fullInventory')

			// First case: Multiple inventory elements exist
			if (inventories.length > 1) {
				console.log(
					'[Visibility Fix] Detected multiple inventory elements, cleaning up'
				)

				// Keep only the one attached to the player if possible
				let keptOne = false

				if (window.player && window.player.inventory) {
					inventories.forEach(inv => {
						if (inv !== window.player.inventory.fullInventoryElement) {
							console.log('[Visibility Fix] Removing extra inventory element')
							inv.remove()
						} else {
							keptOne = true
						}
					})
				}

				// If we couldn't identify which one to keep, remove all but the first
				if (!keptOne && inventories.length > 0) {
					console.log('[Visibility Fix] Keeping only first inventory element')
					for (let i = 1; i < inventories.length; i++) {
						inventories[i].remove()
					}
				}
			}

			// Check if player inventory exists
			if (window.player && window.player.inventory) {
				// Check for mismatch in inventory state
				const isOpen = window.player.inventory.isFullInventoryOpen
				let isVisible = false

				if (window.player.inventory.fullInventoryElement) {
					isVisible =
						window.player.inventory.fullInventoryElement.style.display ===
						'flex'

					// Also check if the element is actually in the DOM
					if (
						!document.body.contains(
							window.player.inventory.fullInventoryElement
						)
					) {
						console.log('[Visibility Fix] Inventory element detached from DOM')
						window.player.inventory.fullInventoryElement = null
						isVisible = false
					}
				}

				// Fix mismatched states
				if (isOpen !== isVisible) {
					console.log(
						'[Visibility Fix] Detected inventory state mismatch, fixing...'
					)
					window.player.inventory.fixVisibility()
				}

				// Also ensure game pause state is correct
				const shouldBePaused =
					isOpen || (window.craftingUI && window.craftingUI.isCraftingOpen)
				if (window.gameIsPaused !== shouldBePaused) {
					console.log(
						'[Visibility Fix] Fixing game pause state:',
						shouldBePaused
					)
					window.gameIsPaused = shouldBePaused
				}
			}
		}, 2000)
	}

	// Initialize when page loads
	if (document.readyState === 'complete') {
		setupVisibilityFixer()

		// Clean up any residual UI elements
		const inventories = document.querySelectorAll('#fullInventory')
		if (
			inventories.length > 0 &&
			(!window.player || !window.player.inventory || !window.isInGame)
		) {
			console.log(
				'[Visibility Fix] Cleaning up residual inventory elements on page load'
			)
			inventories.forEach(inv => inv.remove())
		}
	} else {
		window.addEventListener('load', () => {
			setupVisibilityFixer()

			// Clean up any residual UI elements
			const inventories = document.querySelectorAll('#fullInventory')
			if (
				inventories.length > 0 &&
				(!window.player || !window.player.inventory || !window.isInGame)
			) {
				console.log(
					'[Visibility Fix] Cleaning up residual inventory elements on page load'
				)
				inventories.forEach(inv => inv.remove())
			}
		})
	}

	console.log('[Visibility Fix] Inventory visibility fix initialized')
})()
