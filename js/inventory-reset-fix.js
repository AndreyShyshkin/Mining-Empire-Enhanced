/**
 * Comprehensive inventory persistence fix
 *
 * This fixes several issues:
 * 1. Inventory incorrectly showing up in the game menu
 * 2. Inventory not opening after returning to menu and entering a world
 * 3. New worlds inheriting inventory from old games
 * 4. Inventory state issues when switching between worlds
 */

console.log('Loading inventory-reset-fix.js')

// Fix the issue with inventory persisting incorrectly between game sessions
;(function () {
	// Store original functions that we'll override
	const originalStartGame = window.startGame
	const originalStopGame = window.stopGame
	const originalInitializeGame = window.initializeGame

	// Track if we're currently in a game
	window.isInGame = false

	// Enhancement for the World constructor
	// Ensure each new world starts with a fresh inventory
	if (typeof World === 'function') {
		const originalWorld = World

		window.World = function (width, height, existingData = null) {
			// Call original World constructor
			const worldInstance = new originalWorld(width, height, existingData)

			// Mark if this is a new world (no existing data) or a loaded world
			worldInstance.isNewWorld = !existingData || !existingData.tiles

			console.log(
				`World created: ${width}x${height}, isNewWorld: ${worldInstance.isNewWorld}`
			)

			return worldInstance
		}

		// Copy prototype properties
		for (const prop of Object.getOwnPropertyNames(originalWorld.prototype)) {
			if (prop !== 'constructor') {
				window.World.prototype[prop] = originalWorld.prototype[prop]
			}
		}

		// Enhance saveData method to ensure inventory is included
		const originalSaveData = World.prototype.saveData

		World.prototype.saveData = function () {
			const baseData = originalSaveData
				? originalSaveData.call(this)
				: {
						tiles: this.tiles,
						walls: this.walls,
						width: this.width,
						height: this.height,
				  }

			// Always get the latest inventory from the player if available
			if (window.player && window.player.inventory) {
				baseData.inventory = window.player.inventory.getSaveData()
				console.log('Saved current inventory state with world data')
			}

			return baseData
		}

		console.log('Enhanced World constructor for proper inventory management')
	}

	// Enhancement for the Player constructor
	// Reset inventory for new worlds
	if (typeof Player === 'function') {
		const originalPlayer = Player

		window.Player = function (x, y, world) {
			// Call original constructor
			const player = new originalPlayer(x, y, world)

			// Force new inventory for new worlds
			if (world && world.isNewWorld) {
				console.log('New world detected - resetting player inventory')
				player.inventory = new Inventory([])
			}

			return player
		}

		// Copy prototype properties
		for (const prop of Object.getOwnPropertyNames(originalPlayer.prototype)) {
			if (prop !== 'constructor') {
				window.Player.prototype[prop] = originalPlayer.prototype[prop]
			}
		}

		console.log('Enhanced Player constructor for inventory reset')
	}

	// Override startGame to handle inventory cleanup
	window.startGame = function (
		worldMeta,
		currentWorldId,
		worldManagerInstance
	) {
		console.log('Starting game with inventory persistence fix')

		// Remove any existing inventory UI to prevent duplicates
		cleanupInventoryUI()

		// Reset game state
		window.isInGame = true
		window.gameIsPaused = false

		// Call the original function
		originalStartGame(worldMeta, currentWorldId, worldManagerInstance)

		// Make sure crafting UI is closed when starting a game
		if (window.craftingUI && window.craftingUI.isCraftingOpen) {
			window.craftingUI.toggleCrafting()
		}
	}

	// Override stopGame to ensure proper inventory saving and cleanup
	window.stopGame = function () {
		console.log('Stopping game with inventory persistence fix')

		if (
			window.world &&
			window.worldId &&
			window.worldManager &&
			window.player &&
			window.player.inventory
		) {
			console.log('Saving inventory state before exiting')

			try {
				// Close any open UI elements
				if (window.player.inventory.isFullInventoryOpen) {
					window.player.inventory.toggleFullInventory()
				}

				if (window.craftingUI && window.craftingUI.isCraftingOpen) {
					window.craftingUI.toggleCrafting()
				}

				// Reset the inventory state directly to be safe
				window.player.inventory.isFullInventoryOpen = false
				if (window.player.inventory.fullInventoryElement) {
					window.player.inventory.fullInventoryElement.style.display = 'none'
				}

				// Ensure world has the latest inventory data
				const worldData = window.world.saveData()

				// Save the world
				window.worldManager.saveWorld(window.world, window.worldId)
				console.log('World saved with current inventory state')
			} catch (error) {
				console.error('Error saving inventory state:', error)
			}
		}

		// Call original function
		originalStopGame()

		// Update game state
		window.isInGame = false
		window.gameIsPaused = false

		// Clean up inventory UI when exiting
		cleanupInventoryUI()
	}

	// Override initializeGame to fix inventory event handling
	window.initializeGame = function (worldMeta) {
		console.log('Initializing game with inventory persistence fix')

		// Call original initialization
		originalInitializeGame(worldMeta)

		// Set up reliable inventory toggle handlers
		setTimeout(setupInventoryToggle, 500)
	}

	// Helper function to clean up inventory UI
	function cleanupInventoryUI() {
		const inventories = document.querySelectorAll('#fullInventory')
		if (inventories.length > 0) {
			console.log(`Cleaning up ${inventories.length} inventory elements`)
			inventories.forEach(inv => {
				try {
					// Make it invisible first to avoid flashes
					inv.style.display = 'none'
					// Then remove it
					inv.remove()
				} catch (e) {
					console.error('Error removing inventory element:', e)
				}
			})
		}

		// Also reset the player state if it exists
		if (window.player && window.player.inventory) {
			window.player.inventory.isFullInventoryOpen = false
			window.player.inventory.fullInventoryElement = null
		}
	}

	// Helper function to set up reliable inventory toggle
	function setupInventoryToggle() {
		// First, clean up any existing handlers
		if (window._inventoryToggleHandler) {
			window.removeEventListener('keydown', window._inventoryToggleHandler)
			console.log('Removed old inventory toggle handler')
		}

		// Set up new handler
		window._inventoryToggleHandler = function (e) {
			// Skip if the UI keyboard control handler is active
			if (window._uiKeyboardHandler) return

			if (!window.player || !window.player.inventory || !window.isInGame) return

			if (e.key.toLowerCase() === 'e' || e.key === 'Tab') {
				// Prevent default Tab behavior
				if (e.key === 'Tab') {
					e.preventDefault()
				}

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
					} else {
						// Toggle just the inventory
						const isOpen = window.player.inventory.toggleFullInventory()

						// If closing inventory, also close crafting if it's open
						if (
							!isOpen &&
							window.craftingUI &&
							window.craftingUI.isCraftingOpen
						) {
							window.craftingUI.toggleCrafting()
						}

						// Update game pause state
						window.gameIsPaused = isOpen
					}

					console.log('Inventory toggled via E key')
				} catch (error) {
					console.error('Error toggling inventory:', error)
				}
			} else if (e.key.toLowerCase() === 'c') {
				// C key behavior for crafting
				if (window.craftingUI) {
					try {
						// Check current state
						const isInventoryOpen = window.player.inventory.isFullInventoryOpen
						const isCraftingOpen = window.craftingUI.isCraftingOpen

						if (isInventoryOpen && isCraftingOpen) {
							// If both are open, close both
							window.player.inventory.toggleFullInventory()
							window.craftingUI.toggleCrafting()
							window.gameIsPaused = false
						} else if (isInventoryOpen && !isCraftingOpen) {
							// If inventory is open but crafting is closed, just open crafting
							window.craftingUI.toggleCrafting()
							window.gameIsPaused = true
						} else {
							// If inventory is closed, open both
							window.player.inventory.toggleFullInventory()
							window.craftingUI.toggleCrafting()
							window.gameIsPaused = true
						}

						console.log('Crafting toggled via C key')
					} catch (error) {
						console.error('Error toggling crafting:', error)
					}
				}
			}
		}

		// Add the handler
		window.addEventListener('keydown', window._inventoryToggleHandler)
		console.log('Added new inventory toggle handler')
	}

	// Set up observers to monitor and fix UI issues
	function setupObservers() {
		// Monitor for inventory duplication
		const observer = new MutationObserver(function (mutations) {
			if (!document.body.contains(document.getElementById('gameCanvas'))) {
				// We're in the menu - make sure inventory is hidden
				cleanupInventoryUI()
			}

			// Check for multiple inventories
			const inventories = document.querySelectorAll('#fullInventory')
			if (inventories.length > 1) {
				console.log(
					`Detected ${inventories.length} inventory elements, cleaning up duplicates`
				)
				// Remove all but the last inventory element
				for (let i = 0; i < inventories.length - 1; i++) {
					inventories[i].remove()
				}
			}
		})

		// Start observing
		observer.observe(document.body, { childList: true, subtree: true })
		console.log('Inventory observer started')
	}

	// Handle menu transitions
	function setupMenuHandlers() {
		// When clicking on menu buttons, ensure inventory is cleaned up
		document.addEventListener('click', function (e) {
			if (
				e.target.tagName === 'BUTTON' &&
				(e.target.closest('#mainMenu') ||
					e.target.closest('#worldSelectionMenu') ||
					e.target.closest('#createWorldMenu'))
			) {
				// Only clean up when not in a game
				if (!window.isInGame) {
					cleanupInventoryUI()
				}
			}

			// Special handling for the return to menu button
			if (e.target.id === 'returnToMenuBtn') {
				// Mark that we're exiting to menu
				console.log('Return to menu clicked - cleaning up inventory')
			}
		})
	}

	// Fix WorldManager.loadWorld to handle inventory correctly
	if (typeof WorldManager === 'function' && WorldManager.prototype.loadWorld) {
		const originalLoadWorld = WorldManager.prototype.loadWorld

		WorldManager.prototype.loadWorld = function (worldId) {
			console.log(`Loading world ${worldId} with inventory persistence fix`)

			// Call original method
			const worldData = originalLoadWorld.call(this, worldId)

			// Log inventory data for debugging
			if (worldData && worldData.inventory) {
				console.log(
					'Loaded world has inventory data:',
					worldData.inventory.length
				)
			} else {
				console.log('Loaded world has no inventory data')
			}

			// Make sure to properly restore the player's inventory when the world loads
			if (
				window.player &&
				window.player.inventory &&
				worldData &&
				worldData.inventory
			) {
				setTimeout(() => {
					// Give time for the player to initialize fully
					if (window.player && window.player.inventory) {
						console.log('Restoring player inventory from saved world data')
						window.player.inventory.loadFromSaveData(worldData.inventory)
					}
				}, 500)
			}

			return worldData
		}
	}

	// Set everything up when the page loads
	if (document.readyState === 'complete') {
		setupObservers()
		setupMenuHandlers()
	} else {
		window.addEventListener('load', function () {
			setupObservers()
			setupMenuHandlers()
		})
	}

	console.log('Inventory persistence fix installed')
})()
