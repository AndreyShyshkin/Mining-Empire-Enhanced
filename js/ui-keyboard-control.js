/**
 * UI Keyboard Control
 *
 * This file centralizes the keyboard controls for inventory and crafting UI:
 * - E key toggles inventory only
 * - C key opens both inventory and crafting if closed, or just crafting if inventory is open
 * - Both E and C will close both UI elements if both are already open
 */

console.log('Loading ui-keyboard-control.js')
;(function () {
	// Initialize keyboard controls when the document is fully loaded
	function initKeyboardControls() {
		console.log('Initializing UI keyboard controls')

		// Remove any existing listeners to prevent duplicates
		if (window._uiKeyboardHandler) {
			document.removeEventListener('keydown', window._uiKeyboardHandler)
		}

		// Remove conflicting handlers from other files
		if (window._inventoryToggleHandler) {
			window.removeEventListener('keydown', window._inventoryToggleHandler)
			console.log(
				'Removed inventory toggle handler from inventory-reset-fix.js'
			)
		}

		// Create the handler function
		window._uiKeyboardHandler = function (e) {
			// Only process if we have a valid player with inventory
			if (!window.player || !window.player.inventory || !window.isInGame) return

			if (e.key.toLowerCase() === 'e') {
				// E key: Toggle inventory with special handling
				handleInventoryKeypress()
				// Prevent default for Tab key if that was used
				if (e.key === 'Tab') {
					e.preventDefault()
				}
			} else if (e.key.toLowerCase() === 'c') {
				// C key: Toggle crafting with special handling
				handleCraftingKeypress()
			} else if (e.key === 'F11') {
				// F11 key: Toggle fullscreen if the function exists
				e.preventDefault()
				if (typeof window.toggleFullscreen === 'function') {
					window.toggleFullscreen()
				}
			} else if (e.key.toLowerCase() === 'm') {
				// M key: Toggle settings menu if the function exists
				if (typeof window.toggleSettingsMenu === 'function') {
					window.toggleSettingsMenu()
				}
			}
		}

		// Register the event listener
		document.addEventListener('keydown', window._uiKeyboardHandler)
	}

	// Handler for E key press
	function handleInventoryKeypress() {
		try {
			// Check if both inventory and crafting are open
			const isInventoryOpen = window.player.inventory.isFullInventoryOpen
			const isCraftingOpen = window.craftingUI
				? window.craftingUI.isCraftingOpen
				: false

			if (isInventoryOpen && isCraftingOpen) {
				// If both are open, close both
				window.player.inventory.toggleFullInventory()
				window.craftingUI.toggleCrafting()
				window.gameIsPaused = false
				console.log('Closed both inventory and crafting via E key')
			} else {
				// Toggle just the inventory
				const isOpen = window.player.inventory.toggleFullInventory()

				// If closing inventory, also close crafting if it's open
				if (!isOpen && window.craftingUI && window.craftingUI.isCraftingOpen) {
					window.craftingUI.toggleCrafting()
				}

				// Update game pause state
				window.gameIsPaused = isOpen

				console.log('Toggled inventory via E key, open: ' + isOpen)
			}
		} catch (error) {
			console.error('Error in inventory keypress handler:', error)
		}
	}

	// Handler for C key press
	function handleCraftingKeypress() {
		if (!window.craftingUI) return

		try {
			// Check current state
			const isInventoryOpen = window.player.inventory.isFullInventoryOpen
			const isCraftingOpen = window.craftingUI.isCraftingOpen

			if (isInventoryOpen && isCraftingOpen) {
				// If both are open, close both
				window.player.inventory.toggleFullInventory()
				window.craftingUI.toggleCrafting()
				window.gameIsPaused = false
				console.log('Closed both inventory and crafting via C key')
			} else if (isInventoryOpen && !isCraftingOpen) {
				// If inventory is open but crafting is closed, just open crafting
				window.craftingUI.toggleCrafting()
				window.gameIsPaused = true
				console.log('Opened crafting (inventory already open) via C key')
			} else {
				// If inventory is closed, open both
				window.player.inventory.toggleFullInventory()
				window.craftingUI.toggleCrafting()
				window.gameIsPaused = true
				console.log('Opened both inventory and crafting via C key')
			}
		} catch (error) {
			console.error('Error in crafting keypress handler:', error)
		}
	}

	// Initialize immediately if document is already loaded
	if (document.readyState === 'complete') {
		initKeyboardControls()
	} else {
		// Otherwise wait for the document to load
		window.addEventListener('load', initKeyboardControls)
	}

	// Setup reinitialize triggers
	// 1. When game starts
	if (window.startGame && typeof window.startGame === 'function') {
		const originalStartGame = window.startGame
		window.startGame = function (...args) {
			const result = originalStartGame.apply(this, args)
			setTimeout(initKeyboardControls, 500) // Delay to ensure other systems are loaded
			return result
		}
		console.log('Added UI keyboard control initialization to game start')
	}

	// 2. Also add a function to reinitialize controls that can be called after game state changes
	window.reinitializeUIControls = initKeyboardControls

	console.log('UI keyboard control system ready')
})()
