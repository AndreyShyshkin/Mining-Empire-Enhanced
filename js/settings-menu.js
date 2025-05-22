/**
 * Settings Menu Manager
 *
 * This file adds an in-game settings button and menu with:
 * - Controls information
 * - Exit option
 * - Toggle fullscreen option
 */

console.log('Loading settings-menu.js')
;(function () {
	// DOM elements references
	let settingsButton
	let settingsMenu
	let controlsSection
	let controlsInfoElement

	// Initialize settings menu
	function initSettingsMenu() {
		console.log('Initializing in-game settings menu')

		// First, check for the old controls-info element from the bottom of the screen
		// But we won't remove it directly to prevent breaking references in menu.js
		const oldControlsInfo = document.getElementById('controlsInfo')
		if (oldControlsInfo) {
			// Instead of removing, just hide it permanently
			oldControlsInfo.style.display = 'none'
			console.log('Hid old controls info element')
		}

		// Create settings button if it doesn't exist
		createSettingsButton()

		// Create settings menu if it doesn't exist
		createSettingsMenu()

		// Add event listeners
		addEventListeners()
	}

	// Create the settings button
	function createSettingsButton() {
		if (document.getElementById('gameSettingsBtn')) return

		settingsButton = document.createElement('button')
		settingsButton.id = 'gameSettingsBtn'
		settingsButton.className = 'game-settings-button'
		settingsButton.innerHTML =
			'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>'
		settingsButton.title = 'Настройки'

		// Append to game container
		const gameContainer = document.getElementById('gameContainer')
		if (gameContainer) {
			gameContainer.appendChild(settingsButton)
			console.log('Settings button created and attached')
		} else {
			console.error('Game container not found, cannot attach settings button')
			// Try again later when game is loaded
			setTimeout(createSettingsButton, 1000)
		}
	}

	// Create the settings menu
	function createSettingsMenu() {
		if (document.getElementById('gameSettingsMenu')) return

		settingsMenu = document.createElement('div')
		settingsMenu.id = 'gameSettingsMenu'
		settingsMenu.className = 'game-settings-menu'
		settingsMenu.style.display = 'none'

		// Create menu content
		settingsMenu.innerHTML = `                <div class="settings-header">
                <h2>Настройки</h2>
                <span class="key-hint">ESC или M</span>
                <button class="close-settings-btn" id="closeSettingsBtn">×</button>
            </div>
            <div class="settings-content">
                <div class="settings-section controls-section" id="controlsSection">
                    <h3>Управление</h3>
                    <div class="controls-list">
                        <div class="control-item"><span class="key">A/D</span> - Перемещение влево/вправо</div>
                        <div class="control-item"><span class="key">W/Space</span> - Прыжок</div>
                        <div class="control-item"><span class="key">W/S</span> - Подъем/спуск по верёвке</div>
                        <div class="control-item"><span class="key">ЛКМ</span> - Ломать блоки</div>
                        <div class="control-item"><span class="key">ПКМ</span> - Ставить блоки</div>
                        <div class="control-item"><span class="key">1-5</span> - Выбор слота инвентаря</div>
                        <div class="control-item"><span class="key">E</span> - Открыть/закрыть инвентарь</div>
                        <div class="control-item"><span class="key">C</span> - Открыть/закрыть крафт</div>
                        <div class="control-item"><span class="key">M</span> - Открыть/закрыть настройки</div>
                        <div class="control-item"><span class="key">F11</span> - На весь экран</div>
                        <div class="control-item"><span class="key">ESC</span> - Меню</div>
                    </div>
                </div>
                <div class="settings-section">
                    <h3>Отображение</h3>
                    <div class="setting-option">
                        <button id="toggleFullscreenBtn" class="setting-button">На весь экран (F11)</button>
                    </div>
                </div>
                <div class="settings-section exit-section">
                    <button id="exitToMenuBtn" class="exit-button">Выйти в меню</button>
                </div>
            </div>
        `

		// Append to game container
		const gameContainer = document.getElementById('gameContainer')
		if (gameContainer) {
			gameContainer.appendChild(settingsMenu)
			console.log('Settings menu created and attached')
		} else {
			console.error('Game container not found, cannot attach settings menu')
			// Try again later when game is loaded
			setTimeout(createSettingsMenu, 1000)
		}
	}

	// Add event listeners
	function addEventListeners() {
		// Find all interactive elements
		const elements = {
			settingsButton: document.getElementById('gameSettingsBtn'),
			closeButton: document.getElementById('closeSettingsBtn'),
			fullscreenButton: document.getElementById('toggleFullscreenBtn'),
			exitButton: document.getElementById('exitToMenuBtn'),
		}

		// Settings button click
		if (elements.settingsButton) {
			elements.settingsButton.addEventListener('click', toggleSettingsMenu)
		}

		// Close button click
		if (elements.closeButton) {
			elements.closeButton.addEventListener('click', closeSettingsMenu)
		}

		// Fullscreen button click
		if (elements.fullscreenButton) {
			elements.fullscreenButton.addEventListener('click', function () {
				closeSettingsMenu()
				if (typeof window.toggleFullscreen === 'function') {
					window.toggleFullscreen()
				}
			})
		}

		// Exit button click
		if (elements.exitButton) {
			elements.exitButton.addEventListener('click', function () {
				closeSettingsMenu()
				exitToMainMenu()
			})
		}

		// Add ESC key handler
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') {
				// If settings menu is open, close it
				if (isSettingsMenuOpen()) {
					closeSettingsMenu()
					e.preventDefault()
					e.stopPropagation()
				}
				// Otherwise let the game handle ESC normally
			}
		})
	}

	// Toggle settings menu visibility
	function toggleSettingsMenu() {
		const menu = document.getElementById('gameSettingsMenu')
		if (menu) {
			if (menu.style.display === 'none') {
				menu.style.display = 'block'
				window.gameIsPaused = true
			} else {
				menu.style.display = 'none'
				// Only unpause if inventory and crafting are not open
				const isInventoryOpen =
					window.player && window.player.inventory
						? window.player.inventory.isFullInventoryOpen
						: false
				const isCraftingOpen = window.craftingUI
					? window.craftingUI.isCraftingOpen
					: false

				if (!isInventoryOpen && !isCraftingOpen) {
					window.gameIsPaused = false
				}
			}
		}
	}

	// Close settings menu
	function closeSettingsMenu() {
		const menu = document.getElementById('gameSettingsMenu')
		if (menu) {
			menu.style.display = 'none'

			// Only unpause if inventory and crafting are not open
			const isInventoryOpen =
				window.player && window.player.inventory
					? window.player.inventory.isFullInventoryOpen
					: false
			const isCraftingOpen = window.craftingUI
				? window.craftingUI.isCraftingOpen
				: false

			if (!isInventoryOpen && !isCraftingOpen) {
				window.gameIsPaused = false
			}
		}
	}

	// Check if settings menu is open
	function isSettingsMenuOpen() {
		const menu = document.getElementById('gameSettingsMenu')
		return menu && menu.style.display !== 'none'
	}

	// Exit to main menu
	function exitToMainMenu() {
		if (typeof window.returnToMainMenu === 'function') {
			window.returnToMainMenu()
		} else {
			// Fallback if returnToMainMenu function is not available
			const gameContainer = document.getElementById('gameContainer')
			const mainMenu = document.getElementById('mainMenu')

			if (gameContainer && mainMenu) {
				gameContainer.style.display = 'none'
				mainMenu.style.display = 'block'

				// Reset game state if necessary
				if (window.player) {
					window.isInGame = false
					window.gameIsPaused = false
				}
			}
		}
	}

	// Patch the startGame function to initialize settings menu
	function patchGameFunctions() {
		const originalStartGame = window.startGame

		if (originalStartGame) {
			window.startGame = function (...args) {
				// Call original function
				originalStartGame.apply(this, args)

				// Initialize settings menu after game starts
				setTimeout(initSettingsMenu, 500)
			}
		}
	}

	// Initialize settings functionality
	function init() {
		if (document.readyState === 'complete') {
			patchGameFunctions()

			// If game is already running, initialize right away
			if (window.isInGame) {
				initSettingsMenu()
			}
		} else {
			window.addEventListener('load', function () {
				patchGameFunctions()

				// If game is already running, initialize right away
				if (window.isInGame) {
					initSettingsMenu()
				}
			})
		}
	}

	// Start initialization
	init()

	// Expose functions globally
	window.toggleSettingsMenu = toggleSettingsMenu
	window.closeSettingsMenu = closeSettingsMenu
	window.initSettingsMenu = initSettingsMenu
})()
