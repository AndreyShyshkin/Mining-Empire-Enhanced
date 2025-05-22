/**
 * UI Z-Index Fix
 *
 * This file fixes issues with z-index between inventory and crafting UI components,
 * ensuring proper layering and visibility when both are open.
 * Also ensures proper cleanup when exiting to menu.
 */

console.log('Loading ui-zindex-fix.js')

;(function () {
	// Function to adjust z-indices
	function fixZIndices() {
		if (!window.isInGame || !window.player || !window.player.inventory) return

		// Get DOM elements
		const inventoryElement = document.getElementById('fullInventory')
		const craftingElement = document.querySelector('.crafting-ui')

		if (!inventoryElement || !craftingElement) return

		const isInventoryOpen = window.player.inventory.isFullInventoryOpen
		const isCraftingOpen = window.craftingUI && window.craftingUI.isCraftingOpen

		if (isInventoryOpen && isCraftingOpen) {
			// Both are open, make crafting UI appear on top
			craftingElement.style.zIndex = '1100'
			inventoryElement.style.zIndex = '1000'

			// Also ensure crafting is visually to the right of inventory
			craftingElement.style.right = '50px'
			craftingElement.style.left = 'auto'

			// Position inventory on left side
			inventoryElement.style.left = '50%'
			inventoryElement.style.right = 'auto'

			console.log('[Z-Index Fix] Adjusted z-indices with both UIs open')
		} else {
			// Reset to default z-index if only one is open
			if (craftingElement) craftingElement.style.zIndex = '1000'
			if (inventoryElement) inventoryElement.style.zIndex = '1000'
		}
	}

	// Enhanced menu return handler
	function enhanceMenuReturn() {
		// Get the menu return button
		const menuButton = document.getElementById('returnToMenuBtn')
		if (!menuButton) return

		// Store the original click handler
		const originalClickHandler = menuButton.onclick

		// Set a new handler that ensures all UIs are closed
		menuButton.onclick = function (event) {
			console.log('[Z-Index Fix] Enhanced menu return handler called')

			// Force close inventory
			if (window.player && window.player.inventory) {
				if (window.player.inventory.isFullInventoryOpen) {
					window.player.inventory.isFullInventoryOpen = false

					if (window.player.inventory.fullInventoryElement) {
						window.player.inventory.fullInventoryElement.style.display = 'none'
					}
				}
			}

			// Force close crafting
			if (window.craftingUI) {
				window.craftingUI.isCraftingOpen = false

				if (window.craftingUI.uiElement) {
					window.craftingUI.uiElement.style.display = 'none'
				}
			}

			// Reset game paused state
			window.gameIsPaused = false

			// Clean up any orphaned UI elements
			const inventories = document.querySelectorAll('#fullInventory')
			inventories.forEach(inv => {
				if (
					window.player &&
					window.player.inventory &&
					inv !== window.player.inventory.fullInventoryElement
				) {
					inv.remove()
				}
			})

			const craftingUIs = document.querySelectorAll('.crafting-ui')
			craftingUIs.forEach(ui => {
				if (window.craftingUI && ui !== window.craftingUI.uiElement) {
					ui.remove()
				}
			})

			// Call the original handler
			if (originalClickHandler) {
				originalClickHandler.call(this, event)
			}
		}

		console.log('[Z-Index Fix] Enhanced menu return button')
	}

	// Override inventory toggle method
	function enhanceInventoryToggle() {
		if (typeof Inventory !== 'function' || !Inventory.prototype) return

		const originalToggle = Inventory.prototype.toggleFullInventory

		Inventory.prototype.toggleFullInventory = function () {
			// Call original method
			const result = originalToggle.apply(this, arguments)

			// Fix z-indices after toggle
			setTimeout(fixZIndices, 0)

			return result
		}

		console.log('[Z-Index Fix] Enhanced inventory toggle method')
	}

	// Override crafting UI toggle
	function enhanceCraftingToggle() {
		if (!window.CraftingUI || !window.CraftingUI.prototype) return

		const originalToggle =
			window.CraftingUI.prototype.toggleUI ||
			window.CraftingUI.prototype.toggleCrafting

		if (!originalToggle) return

		const toggleMethod = window.CraftingUI.prototype.toggleUI
			? 'toggleUI'
			: 'toggleCrafting'

		window.CraftingUI.prototype[toggleMethod] = function () {
			// Call original method
			const result = originalToggle.apply(this, arguments)

			// Fix z-indices after toggle
			setTimeout(fixZIndices, 0)

			return result
		}

		console.log('[Z-Index Fix] Enhanced crafting toggle method')
	}

	// Set up periodic check for UI state
	function setupPeriodicCheck() {
		setInterval(fixZIndices, 1000)
	}

	// Initialize when document is loaded
	function initialize() {
		enhanceInventoryToggle()
		enhanceCraftingToggle()
		enhanceMenuReturn()
		setupPeriodicCheck()

		// Initial fix
		setTimeout(fixZIndices, 500)

		console.log('[Z-Index Fix] Initialization complete')
	}

	// Check if document is already loaded
	if (document.readyState === 'complete') {
		initialize()
	} else {
		window.addEventListener('load', initialize)
	}

	// Also add global access to force a z-index update
	window.fixUIZIndices = fixZIndices
})()
