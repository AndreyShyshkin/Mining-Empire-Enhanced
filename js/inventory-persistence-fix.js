/**
 * Inventory persistence fix - additional safeguards
 *
 * This file provides additional safeguards for the inventory system
 * to ensure proper behavior when:
 * - Switching between worlds
 * - Going back to the menu
 * - Creating new worlds
 */

console.log('Loading inventory-persistence-fix.js')

// This fix works together with inventory-reset-fix.js
;(function () {
	// Make sure inventory is properly cleaned up when the game starts
	document.addEventListener('DOMContentLoaded', function () {
		// Function to check and clean up inventory elements
		function checkAndCleanInventory() {
			// Clean up any inventory UI elements if we're in the menu
			const gameContainer = document.getElementById('gameContainer')
			const isInGameView =
				gameContainer && gameContainer.style.display !== 'none'

			if (!isInGameView) {
				const inventories = document.querySelectorAll('#fullInventory')
				if (inventories.length > 0) {
					console.log(
						`[Persistence Fix] Cleaning up ${inventories.length} inventory elements in menu`
					)
					inventories.forEach(inv => inv.remove())
				}
			}
		}

		// Set up periodic check for menu state
		setInterval(checkAndCleanInventory, 2000)

		// Check when page loads
		checkAndCleanInventory()

		console.log('[Persistence Fix] Inventory cleanup monitor initialized')
	})

	// Add clean menu transitions
	function fixMenuTransitions() {
		// Add click handlers to menu buttons
		const menuButtons = document.querySelectorAll(
			'#mainMenu button, #worldSelectionMenu button, #createWorldMenu button'
		)

		menuButtons.forEach(button => {
			button.addEventListener('click', function () {
				// Force inventory cleanup when navigating between menus
				const inventories = document.querySelectorAll('#fullInventory')
				if (inventories.length > 0) {
					console.log(
						'[Persistence Fix] Cleaning inventory during menu navigation'
					)
					inventories.forEach(inv => inv.remove())
				}

				// Also close any crafting UI that might be open
				if (window.craftingUI && window.craftingUI.isCraftingOpen) {
					window.craftingUI.toggleCrafting()
				}
			})
		})

		// Special handler for the return-to-menu button
		const returnButton = document.getElementById('returnToMenuBtn')
		if (returnButton) {
			returnButton.addEventListener('click', function () {
				console.log('[Persistence Fix] Return to menu - cleaning up inventory')

				// Close any open UI elements first
				if (
					window.player &&
					window.player.inventory &&
					window.player.inventory.isFullInventoryOpen
				) {
					window.player.inventory.toggleFullInventory()
				}

				if (window.craftingUI && window.craftingUI.isCraftingOpen) {
					window.craftingUI.toggleCrafting()
				}

				// Force cleanup of inventory when exiting to menu
				setTimeout(function () {
					const inventories = document.querySelectorAll('#fullInventory')
					inventories.forEach(inv => inv.remove())
				}, 100)
			})
		}
	}

	// Fix direct modification of Player.inventory to catch any bypass
	if (typeof Player === 'function') {
		// Add a special descriptor for the inventory property
		try {
			const playerProto = Player.prototype

			// Store the original behavior
			const originalDescriptor = Object.getOwnPropertyDescriptor(
				playerProto,
				'inventory'
			)

			// Only proceed if we don't break existing functionality
			if (!originalDescriptor || !originalDescriptor.configurable) return

			// Track inventory changes
			Object.defineProperty(playerProto, '_rawInventory', {
				writable: true,
				configurable: true,
				value: null,
			})

			// Set up getter/setter for inventory
			Object.defineProperty(playerProto, 'inventory', {
				configurable: true,
				get: function () {
					return this._rawInventory
				},
				set: function (newInventory) {
					console.log(
						'[Persistence Fix] Player inventory being set:',
						newInventory ? 'new inventory' : 'null'
					)
					this._rawInventory = newInventory
				},
			})

			console.log('[Persistence Fix] Enhanced Player.inventory tracking')
		} catch (e) {
			console.error('[Persistence Fix] Error enhancing Player.inventory:', e)
		}
	}

	// Initialize when page loads
	if (document.readyState === 'complete') {
		fixMenuTransitions()
	} else {
		window.addEventListener('load', fixMenuTransitions)
	}

	console.log('[Persistence Fix] Additional safeguards installed')
})()
