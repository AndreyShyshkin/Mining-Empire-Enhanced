// Multiplayer UI components and management
// Initialize game paused state for multiplayer
if (window.gameIsPaused === undefined) {
	window.gameIsPaused = false
}

document.addEventListener('DOMContentLoaded', function () {
	// DOM Elements
	const multiplayerPanel = document.getElementById('multiplayerPanel')
	const activeGamesContainer = document.getElementById('activeGamesContainer')
	const createGameBtn = document.getElementById('createGameBtn')
	const refreshGamesBtn = document.getElementById('refreshGamesBtn')
	const backFromMultiplayerBtn = document.getElementById(
		'backFromMultiplayerBtn'
	)
	const useExistingWorldSelectMP = document.getElementById('useExistingWorldMP')
	const newWorldSettingsMP = document.getElementById('newWorldSettingsMP')
	const worldSizeSettingMP = document.getElementById('worldSizeSettingMP')
	const worldSizeSelectMP = document.getElementById('worldSizeMP')
	const worldNameInputMP = document.getElementById('worldNameMP')
	const noGamesMessage = document.getElementById('noGamesMessage')
	const multiplayerStatusBar = document.getElementById('multiplayerStatusBar')
	const playersList = document.getElementById('playersList')

	// Event listeners
	if (createGameBtn) {
		createGameBtn.addEventListener('click', handleCreateGame)
	}

	if (refreshGamesBtn) {
		refreshGamesBtn.addEventListener('click', loadActiveGames)
	}

	if (backFromMultiplayerBtn) {
		backFromMultiplayerBtn.addEventListener('click', () => {
			if (window.gameMenu) {
				window.gameMenu.showMainMenu()
			}
		})
	}

	// Handle world selection change
	if (useExistingWorldSelectMP) {
		loadSavedWorldsForMultiplayer()
		useExistingWorldSelectMP.addEventListener('change', function () {
			const selectedOption = this.value
			if (selectedOption === 'new') {
				// Show new world settings
				if (newWorldSettingsMP) newWorldSettingsMP.style.display = 'block'
				if (worldSizeSettingMP) worldSizeSettingMP.style.display = 'block'
			} else {
				// Hide new world settings for existing worlds
				if (newWorldSettingsMP) newWorldSettingsMP.style.display = 'none'
				if (worldSizeSettingMP) worldSizeSettingMP.style.display = 'none'
			}
		})
	}

	// Listen for authentication changes
	window.onAuthStateChanged(window.firebaseAuth, async user => {
		if (user && multiplayerPanel) {
			loadActiveGames()
		}
	})

	// Create a new multiplayer game
	async function handleCreateGame() {
		if (!window.multiplayerSystem) {
			showMessage('Система мультиплеера не инициализирована', 'error')
			return
		}

		try {
			// Show loading indicator
			showLoading('Подготовка мультиплеерной игры...')

			let completeWorldData
			let worldId = null

			// Check if using existing world or creating new one
			if (
				useExistingWorldSelectMP &&
				useExistingWorldSelectMP.value !== 'new'
			) {
				// Use existing world
				worldId = useExistingWorldSelectMP.value

				if (!window.worldManager) {
					throw new Error('Система управления мирами не инициализирована')
				}

				// Load the world data from storage
				const savedWorldData = window.worldManager.loadWorld(worldId)
				if (!savedWorldData) {
					throw new Error('Не удалось загрузить выбранный мир')
				}

				// Get world metadata
				const worldMeta = window.worldManager.getWorldMeta(worldId)

				// Use the loaded world data
				completeWorldData = {
					...savedWorldData,
					name: worldMeta ? worldMeta.name : 'Загруженный мир',
				}

				showLoading(`Загрузка существующего мира: ${completeWorldData.name}...`)
			} else {
				// Create a new world
				const worldName = worldNameInputMP.value.trim() || 'Мультиплеер мир'
				const worldSize = worldSizeSelectMP.value || 'medium'

				// Get world size parameters
				const sizes = {
					small: { width: 80, height: 50 },
					medium: { width: 120, height: 70 },
					large: { width: 200, height: 100 },
				}
				const worldSizeParams = sizes[worldSize] || sizes.medium

				showLoading(`Создание нового мира: ${worldName}...`)

				// Create a new world
				const worldData = {
					width: worldSizeParams.width,
					height: worldSizeParams.height,
					name: worldName,
				}

				// Create temporary world for generation
				const tempWorld = new World(worldData.width, worldData.height)
				tempWorld.generate()

				// Get the complete world data including walls
				completeWorldData = tempWorld.saveData()
			}

			// Create new multiplayer game
			const gameId = await window.multiplayerSystem.createGame(
				completeWorldData,
				worldId
			)

			// Start the game
			startMultiplayerGame(completeWorldData, gameId, worldId)
		} catch (error) {
			hideLoading()
			showMessage(`Ошибка создания игры: ${error.message}`, 'error')
		}
	}

	// Join an existing multiplayer game
	async function joinGame(gameId) {
		if (!window.multiplayerSystem) {
			showMessage('Система мультиплеера не инициализирована', 'error')
			return
		}

		try {
			// Show loading indicator
			showLoading('Присоединение к игре...')

			// Join the game and get the world data
			const worldData = await window.multiplayerSystem.joinGame(gameId)

			// Start the game
			startMultiplayerGame(worldData, gameId)
		} catch (error) {
			hideLoading()
			showMessage(`Ошибка присоединения к игре: ${error.message}`, 'error')
		}
	}

	// Start a multiplayer game
	function startMultiplayerGame(worldData, gameId, worldId = null) {
		// Hide the menu
		if (window.gameMenu) {
			window.gameMenu.mainMenu.style.display = 'none'
			window.gameMenu.gameContainer.style.display = 'block'

			// Handle the case where controlsInfo was removed in settings-menu.js
			if (window.gameMenu.controlsInfo) {
				window.gameMenu.controlsInfo.style.display = 'block'
			}
		}

		// Trigger canvas resize to ensure correct display
		if (typeof window.resizeGameCanvas === 'function') {
			window.resizeGameCanvas()
		} else if (typeof window.resizeCanvas === 'function') {
			window.resizeCanvas()
		}

		// Create fullscreen and settings buttons with retry logic
		let attempts = 0
		const maxAttempts = 5
		const createUIButtons = () => {
			console.log(
				'Attempting to create UI buttons for multiplayer mode, attempt:',
				attempts + 1
			)
			attempts++

			// Try to create fullscreen button directly
			if (typeof window.createFullscreenButton === 'function') {
				window.createFullscreenButton()
				console.log('Called createFullscreenButton function')
			} else {
				console.warn('createFullscreenButton function not available')
			}

			// Try to initialize settings menu
			if (typeof window.initSettingsMenu === 'function') {
				window.initSettingsMenu()
				console.log('Called initSettingsMenu function')
			} else if (typeof window.createSettingsButton === 'function') {
				// Try direct button creation if initSettingsMenu is not available
				window.createSettingsButton()
				console.log('Called createSettingsButton function directly')
			} else {
				console.warn(
					'Neither initSettingsMenu nor createSettingsButton function is available'
				)
			}

			// Check if buttons are present
			const fullscreenBtn = document.getElementById('fullscreenBtn')
			const settingsBtn = document.getElementById('gameSettingsBtn')

			// If buttons are not created yet and we haven't exceeded max attempts, try again
			if ((!fullscreenBtn || !settingsBtn) && attempts < maxAttempts) {
				console.log('UI buttons not found, retrying in 500ms...')
				setTimeout(createUIButtons, 500)
			} else {
				// Ensure buttons are visible if they exist
				if (fullscreenBtn) {
					fullscreenBtn.style.display = 'flex'
					console.log('Fullscreen button found and made visible')
				} else {
					console.error(
						'Fullscreen button not found after',
						attempts,
						'attempts'
					)
				}

				if (settingsBtn) {
					settingsBtn.style.display = 'flex'
					console.log('Settings button found and made visible')
				} else {
					console.error('Settings button not found after', attempts, 'attempts')
				}
			}
		}

		// Start the button creation process
		createUIButtons()

		// Force another resize after a short delay to ensure the browser has updated dimensions
		setTimeout(() => {
			if (typeof window.resizeGameCanvas === 'function') {
				window.resizeGameCanvas()
			} else if (typeof window.resizeCanvas === 'function') {
				window.resizeCanvas()
			}

			// Double-check that buttons are visible
			const fullscreenBtn = document.getElementById('fullscreenBtn')
			const settingsBtn = document.getElementById('gameSettingsBtn')

			// Ensure buttons are visible and properly styled
			if (fullscreenBtn) {
				fullscreenBtn.style.display = 'flex'
				fullscreenBtn.style.zIndex = '1000' // Make sure it's above other elements
				console.log('Ensuring fullscreen button visibility')
			} else if (typeof window.createFullscreenButton === 'function') {
				// Try to create it again if it doesn't exist
				window.createFullscreenButton()
				console.log('Attempting to recreate fullscreen button')
			}

			if (settingsBtn) {
				settingsBtn.style.display = 'flex'
				settingsBtn.style.zIndex = '1000' // Make sure it's above other elements
				console.log('Ensuring settings button visibility')
			} else if (typeof window.initSettingsMenu === 'function') {
				// Try to create it again if it doesn't exist
				window.initSettingsMenu()
				console.log('Attempting to recreate settings button')
			}
		}, 500) // Increased delay to give more time for other scripts to initialize

		// Show multiplayer status bar
		if (multiplayerStatusBar) {
			multiplayerStatusBar.style.display = 'block'
			updateMultiplayerUI()
		}

		// Create world instance from data
		const world = new World(worldData.width, worldData.height, worldData)

		// Store the worldId for saving if this is a hosted game from existing world
		if (worldId) {
			world.originalWorldId = worldId
		}

		// Flag that this is a multiplayer world
		world.isMultiplayer = true
		world.isMultiplayerHost = true // Will be verified in the game setup

		// Set up game with this world
		const canvas = document.getElementById('gameCanvas')
		const gameContainer = document.getElementById('gameContainer')

		// Use container dimensions instead of hardcoded values
		canvas.width = gameContainer.clientWidth
		canvas.height = gameContainer.clientHeight
		const ctx = canvas.getContext('2d')

		// Create player
		const spawnX = Math.floor(world.width / 2) * BLOCK_SIZE
		const spawnY = Math.floor(world.height * 0.35) * BLOCK_SIZE
		const player = new Player(spawnX, spawnY, world)

		// Load inventory data if available in the world data
		if (worldData && worldData.inventory && player.inventory) {
			player.inventory.loadFromSaveData(worldData.inventory)
			console.log('Loaded saved inventory data for multiplayer')
		}

		// Initialize crafting system for multiplayer
		const craftingSystem = new CraftingSystem(player)
		window.craftingSystem = craftingSystem

		// Initialize crafting UI
		const craftingUI = new CraftingUI(craftingSystem)
		window.craftingUI = craftingUI

		// Initialize inventory synchronization
		if (window.inventorySyncSystem) {
			window.inventorySyncSystem.initialize()
		}

		// Create renderer
		const renderer = new Renderer(canvas, world)

		// Set up event listeners and export globals
		setupMultiplayerGame(world, player, renderer)

		// Start periodic saving for host (every 2 minutes)
		if (
			window.multiplayerSystem &&
			window.multiplayerSystem.isHost &&
			worldId
		) {
			window.multiplayerSystem.startPeriodicSaving(120000)
		}

		// Force canvas resize after a slight delay to ensure proper rendering
		setTimeout(() => {
			if (typeof window.resizeGameCanvas === 'function') {
				window.resizeGameCanvas()
				console.log('Forced canvas resize for multiplayer game')
			}
		}, 100)

		// Hide loading indicator
		hideLoading()
	}

	// Set up multiplayer game
	function setupMultiplayerGame(world, player, renderer) {
		// Export to window for access
		window.world = world
		window.player = player
		window.renderer = renderer

		// Make sure we have a window resize handler for multiplayer
		window.addEventListener('resize', () => {
			if (typeof window.resizeGameCanvas === 'function') {
				window.resizeGameCanvas()
			}
		})

		// Set up multiplayer update interval
		const multiplayerUpdateInterval = setInterval(() => {
			if (window.multiplayerSystem && window.player) {
				// Update our player position
				window.multiplayerSystem.updatePlayerState(player)

				// Periodically sync inventory in multiplayer
				if (
					window.inventorySyncSystem &&
					window.player &&
					window.player.inventory
				) {
					// Check if 10 seconds have passed (less frequent than position updates)
					if (gameTime % 600 === 0) {
						window.inventorySyncSystem.syncInventory(player)
					}
				}

				// Update UI with connected players
				updateMultiplayerUI()

				// Periodically check if UI buttons are visible
				if (gameTime % 300 === 0) {
					// Check every 5 seconds (assuming 60fps)
					const fullscreenBtn = document.getElementById('fullscreenBtn')
					const settingsBtn = document.getElementById('gameSettingsBtn')

					if (fullscreenBtn && fullscreenBtn.style.display !== 'flex') {
						fullscreenBtn.style.display = 'flex'
						console.log('Restored fullscreen button visibility')
					}

					if (settingsBtn && settingsBtn.style.display !== 'flex') {
						settingsBtn.style.display = 'flex'
						console.log('Restored settings button visibility')
					}
				}
			}
		}, 1000)

		// Set up basic event handling
		setupEventListeners()

		// Start the game loop
		startGameLoop()

		// Add disconnection handler
		window.onbeforeunload = function () {
			if (window.multiplayerSystem) {
				window.multiplayerSystem.disconnect()

				// Stop inventory sync system
				if (window.inventorySyncSystem) {
					window.inventorySyncSystem.stopListening()
				}
			}

			// Cancel animation frame and clear intervals
			if (currentAnimationFrame !== null) {
				window.cancelAnimationFrame(currentAnimationFrame)
				currentAnimationFrame = null
			}

			clearInterval(multiplayerUpdateInterval)
		}
	}

	// Track the current animation frame request ID
	let currentAnimationFrame = null

	// Start the game loop for multiplayer
	function startGameLoop() {
		// Cancel any existing game loop first
		if (currentAnimationFrame !== null) {
			window.cancelAnimationFrame(currentAnimationFrame)
			currentAnimationFrame = null
			console.log('Cancelled existing game loop')
		}

		let lastTime = 0
		let gameTime = 0

		function gameLoop(timestamp) {
			// Store the animation frame ID so we can cancel it later
			currentAnimationFrame = null

			const deltaTime = timestamp - lastTime
			lastTime = timestamp

			gameTime++

			// Update player only if the game is not paused (inventory is closed)
			if (window.player && window.keys && !window.gameIsPaused) {
				window.player.update(window.keys)
			}

			// Render everything
			if (window.renderer && window.player) {
				// Center camera on player
				window.renderer.centerCameraOnPlayer(window.player)

				// Render world and player
				window.renderer.render(window.player, gameTime)

				// Render other players
				if (window.multiplayerSystem) {
					renderOtherPlayers()
				}
			}

			// Only request next frame if we still have a player and world
			if (window.player && window.world) {
				currentAnimationFrame = window.requestAnimationFrame(gameLoop)
			}
		}

		currentAnimationFrame = window.requestAnimationFrame(gameLoop)
	}

	// Render other connected players
	function renderOtherPlayers() {
		if (!window.multiplayerSystem || !window.renderer || !window.player) {
			return
		}

		const otherPlayers = window.multiplayerSystem.getOtherPlayers()
		const ctx = window.renderer.ctx

		otherPlayers.forEach(otherPlayer => {
			// Calculate screen position
			const screenX = otherPlayer.x - window.renderer.camera.x
			const screenY = otherPlayer.y - window.renderer.camera.y

			// Skip if off screen
			if (
				screenX < -50 ||
				screenX > window.renderer.canvas.width + 50 ||
				screenY < -50 ||
				screenY > window.renderer.canvas.height + 50
			) {
				return
			}

			// Draw other player
			ctx.fillStyle = '#0000FF' // Blue color for other players
			ctx.fillRect(screenX - 10, screenY - 20, 20, 40)

			// Draw eyes in the direction they're facing
			ctx.fillStyle = 'white'
			const eyeSize = 4
			const eyeY = screenY - 5
			const eyeOffset = otherPlayer.direction === 'right' ? 5 : -5
			ctx.fillRect(screenX + eyeOffset, eyeY, eyeSize, eyeSize)

			// Draw player name
			ctx.fillStyle = 'white'
			ctx.font = '12px Arial'
			ctx.textAlign = 'center'
			ctx.fillText(otherPlayer.name || 'Player', screenX, screenY - 30)

			// Render mining animation if the player is mining
			if (
				otherPlayer.isMining &&
				otherPlayer.miningTargetX !== null &&
				otherPlayer.miningTargetY !== null
			) {
				const targetX =
					otherPlayer.miningTargetX * BLOCK_SIZE - window.renderer.camera.x
				const targetY =
					otherPlayer.miningTargetY * BLOCK_SIZE - window.renderer.camera.y

				// Draw mining beam
				ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
				ctx.lineWidth = 2
				ctx.beginPath()
				ctx.moveTo(screenX, screenY)
				ctx.lineTo(targetX + BLOCK_SIZE / 2, targetY + BLOCK_SIZE / 2)
				ctx.stroke()

				// Draw mining progress with block hardness
				// Get the block type to consider hardness
				const blockType = window.world.getTile(
					otherPlayer.miningTargetX,
					otherPlayer.miningTargetY
				)
				const block = BLOCKS[blockType]
				// Calculate adjusted duration considering block hardness
				let adjustedDuration = 45 // Base duration
				if (block && block.hardness) {
					adjustedDuration = 45 * block.hardness
				}
				const progress = otherPlayer.miningProgress / adjustedDuration
				ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
				ctx.fillRect(targetX, targetY, BLOCK_SIZE * progress, BLOCK_SIZE)
			}
		})
	}

	// Event handler references to allow removing them later
	const eventHandlers = {
		keydown: null,
		keyup: null,
		mousemove: null,
		mousedown: null,
		contextmenu: null,
		keydownNumbers: null,
		keydownEscape: null,
	}

	// Clean up existing event listeners
	function cleanupEventListeners() {
		// Clean up keyboard controls
		if (eventHandlers.keydown) {
			window.removeEventListener('keydown', eventHandlers.keydown)
		}

		if (eventHandlers.keyup) {
			window.removeEventListener('keyup', eventHandlers.keyup)
		}

		// Clean up mouse controls
		const canvas = document.getElementById('gameCanvas')
		if (canvas) {
			if (eventHandlers.mousemove) {
				canvas.removeEventListener('mousemove', eventHandlers.mousemove)
			}

			if (eventHandlers.mousedown) {
				canvas.removeEventListener('mousedown', eventHandlers.mousedown)
			}

			if (eventHandlers.contextmenu) {
				canvas.removeEventListener('contextmenu', eventHandlers.contextmenu)
			}
		}

		// Clean up number keys and escape handler
		if (eventHandlers.keydownNumbers) {
			window.removeEventListener('keydown', eventHandlers.keydownNumbers)
		}

		if (eventHandlers.keydownEscape) {
			window.removeEventListener('keydown', eventHandlers.keydownEscape)
		}

		// Reset event handlers
		Object.keys(eventHandlers).forEach(key => {
			eventHandlers[key] = null
		})
	}

	// Set up event listeners for the game
	function setupEventListeners() {
		// First remove any existing event listeners
		cleanupEventListeners()

		// Initialize keys object if not exists
		if (!window.keys) {
			window.keys = {}
		}

		// Keyboard controls
		eventHandlers.keydown = e => {
			window.keys[e.key.toLowerCase()] = true
		}

		eventHandlers.keyup = e => {
			window.keys[e.key.toLowerCase()] = false
		}

		window.addEventListener('keydown', eventHandlers.keydown)
		window.addEventListener('keyup', eventHandlers.keyup)

		// Mouse controls
		const canvas = document.getElementById('gameCanvas')

		if (canvas) {
			// Mouse move to track position
			eventHandlers.mousemove = e => {
				const rect = canvas.getBoundingClientRect()
				window.mouseX = e.clientX - rect.left
				window.mouseY = e.clientY - rect.top
			}
			canvas.addEventListener('mousemove', eventHandlers.mousemove)

			// Mouse clicks
			eventHandlers.mousedown = e => {
				e.preventDefault()

				if (!window.player || !window.renderer || !window.world) return

				const rect = canvas.getBoundingClientRect()
				const mouseX = e.clientX - rect.left
				const mouseY = e.clientY - rect.top

				// Convert mouse position to world coordinates
				const worldX = Math.floor(
					(mouseX + window.renderer.camera.x) / BLOCK_SIZE
				)
				const worldY = Math.floor(
					(mouseY + window.renderer.camera.y) / BLOCK_SIZE
				)

				if (e.button === 0) {
					// Left click - break blocks
					if (window.player.startMining) {
						const success = window.player.startMining(worldX, worldY)
						if (success) {
							// Начали копать успешно
						} else {
							showGameMessage(
								'Не удалось добыть блок (слишком далеко)',
								'error'
							)
						}
					}
				} else if (e.button === 2) {
					// Right click - place blocks
					if (window.player.placeBlock) {
						const success = window.player.placeBlock(worldX, worldY)
						if (success) {
							// Успешно разместили блок
						} else {
							showGameMessage(
								'Не удалось разместить блок (слишком далеко)',
								'error'
							)
						}
					}
				}
			}
			canvas.addEventListener('mousedown', eventHandlers.mousedown)

			// Prevent context menu on right click
			eventHandlers.contextmenu = e => {
				e.preventDefault()
				return false
			}
			canvas.addEventListener('contextmenu', eventHandlers.contextmenu)
		}

		// Inventory selection with number keys and inventory toggle
		eventHandlers.keydownHandler = e => {
			if (window.player && window.player.inventory) {
				if (e.key >= '1' && e.key <= '5') {
					const slotIndex = parseInt(e.key) - 1
					window.player.inventory.selectSlot(slotIndex)
				} else if (e.key.toLowerCase() === 'e' || e.key === 'Tab') {
					// Prevent default action for Tab key
					if (e.key === 'Tab') {
						e.preventDefault()
					}

					const isOpen = window.player.inventory.toggleFullInventory()

					// Pause the game when inventory is open
					if (isOpen) {
						window.gameIsPaused = true

						// Автоматически показываем крафтинг при открытии инвентаря
						if (window.craftingUI && !window.craftingUI.isCraftingOpen) {
							window.craftingUI.toggleCrafting()
						}
					} else {
						window.gameIsPaused = false

						// Если закрыли инвентарь, то автоматически закрываем и крафтинг
						if (window.craftingUI && window.craftingUI.isCraftingOpen) {
							window.craftingUI.toggleCrafting()
						}
					}
				}
			}
		}
		window.addEventListener('keydown', eventHandlers.keydownHandler)

		// ESC key to exit to menu
		eventHandlers.keydownEscape = e => {
			if (e.key === 'Escape' && window.multiplayerSystem) {
				if (confirm('Выйти из мультиплеера?')) {
					exitMultiplayerGame()
				}
			}
		}
		window.addEventListener('keydown', eventHandlers.keydownEscape)
	}

	// Exit multiplayer game
	async function exitMultiplayerGame() {
		showLoading('Сохранение и выход из игры...')

		try {
			// Save world first if we're the host
			if (
				window.multiplayerSystem &&
				window.multiplayerSystem.isHost &&
				window.multiplayerSystem.sourceWorldId
			) {
				const saveSuccess = window.multiplayerSystem.saveWorldToLocalStorage()
				if (saveSuccess) {
					console.log('Successfully saved world before exiting')
				}
			}

			// Disconnect from Firebase with proper cleanup
			if (window.multiplayerSystem) {
				await window.multiplayerSystem.disconnect()
			}

			// Cancel the animation frame if it exists
			if (typeof currentAnimationFrame === 'number') {
				window.cancelAnimationFrame(currentAnimationFrame)
				currentAnimationFrame = null
				console.log('Cancelled game loop during exit')
			}

			// Hide game elements
			if (window.gameMenu) {
				window.gameMenu.gameContainer.style.display = 'none'
				window.gameMenu.controlsInfo.style.display = 'none'
				window.gameMenu.mainMenu.style.display = 'flex'
			}

			// Hide multiplayer status bar
			if (multiplayerStatusBar) {
				multiplayerStatusBar.style.display = 'none'
			}

			// Clean up all event listeners to prevent duplicated controls
			cleanupEventListeners()

			// Reset game state
			window.world = null
			window.player = null
			window.renderer = null

			hideLoading()
		} catch (error) {
			console.error('Error exiting multiplayer game:', error)
			hideLoading()
			showGameMessage('Произошла ошибка при выходе из игры', 'error')
		}
	}

	// Update multiplayer UI with connected players
	function updateMultiplayerUI() {
		if (!playersList || !window.multiplayerSystem) {
			return
		}

		// Get connected players
		const allPlayers = window.multiplayerSystem.players

		if (!allPlayers) {
			playersList.innerHTML = '<li>Нет подключённых игроков</li>'
			return
		}

		// Update the players list
		playersList.innerHTML = ''

		Object.values(allPlayers).forEach(player => {
			const playerItem = document.createElement('li')

			// Show host icon for host
			if (player.isHost) {
				playerItem.innerHTML = `${player.name} 👑`
				playerItem.classList.add('host')
			} else {
				playerItem.textContent = player.name
			}

			// Highlight local player
			if (player.id === window.multiplayerSystem.localPlayerId) {
				playerItem.classList.add('local-player')
			}

			playersList.appendChild(playerItem)
		})
	}

	// Load and display active games
	async function loadActiveGames() {
		if (!window.multiplayerSystem || !activeGamesContainer) {
			return
		}

		try {
			activeGamesContainer.innerHTML = '<p>Загрузка списка игр...</p>'

			const games = await window.multiplayerSystem.getActiveGames()

			if (games.length === 0) {
				activeGamesContainer.innerHTML = ''
				if (noGamesMessage) {
					noGamesMessage.style.display = 'block'
				}
			} else {
				activeGamesContainer.innerHTML = ''
				if (noGamesMessage) {
					noGamesMessage.style.display = 'none'
				}

				games.forEach(game => {
					const gameItem = document.createElement('div')
					gameItem.className = 'game-item'

					const gameInfo = document.createElement('div')
					gameInfo.className = 'game-info'

					const gameName = document.createElement('div')
					gameName.className = 'game-name'
					gameName.textContent = game.worldName

					const gameMeta = document.createElement('div')
					gameMeta.className = 'game-meta'
					gameMeta.textContent = `Хост: ${game.hostName} · Игроков: ${game.playerCount} · Создана: ${game.created}`

					gameInfo.appendChild(gameName)
					gameInfo.appendChild(gameMeta)

					const joinButton = document.createElement('button')
					joinButton.className = 'menu-button'
					joinButton.textContent = 'Присоединиться'
					joinButton.addEventListener('click', () => joinGame(game.id))

					gameItem.appendChild(gameInfo)
					gameItem.appendChild(joinButton)

					activeGamesContainer.appendChild(gameItem)
				})
			}
		} catch (error) {
			showMessage(`Ошибка загрузки списка игр: ${error.message}`, 'error')
		}
	}

	// Load saved worlds for multiplayer selection
	function loadSavedWorldsForMultiplayer() {
		console.log('Loading saved worlds for multiplayer...')

		if (!useExistingWorldSelectMP) {
			console.error('useExistingWorldSelectMP element not found')
			return
		}

		if (!window.worldManager) {
			console.error('worldManager is not initialized yet, retrying in 500ms')
			setTimeout(loadSavedWorldsForMultiplayer, 500)
			return
		}

		const worldsList = window.worldManager.getWorldsList()
		console.log('Found worlds:', worldsList)

		// Clear existing options except the "new world" option
		while (useExistingWorldSelectMP.options.length > 1) {
			useExistingWorldSelectMP.remove(1)
		}

		if (worldsList.length === 0) {
			// No worlds to load
			console.log('No saved worlds found')
			return
		}

		// Add worlds to dropdown
		worldsList.forEach(world => {
			console.log('Adding world to dropdown:', world.name)
			const option = document.createElement('option')
			option.value = world.id
			option.textContent =
				world.name +
				' (' +
				window.worldManager.getSizeName(world.sizeType) +
				')'
			useExistingWorldSelectMP.appendChild(option)
		})
	}

	// Display a loading indicator
	function showLoading(message) {
		// Create loading screen if it doesn't exist
		let loadingScreen = document.getElementById('loadingScreen')

		if (!loadingScreen) {
			loadingScreen = document.createElement('div')
			loadingScreen.className = 'loading-screen'
			loadingScreen.id = 'loadingScreen'

			const loadingText = document.createElement('div')
			loadingText.className = 'loading-text'
			loadingText.textContent = message || 'Загрузка...'

			const spinner = document.createElement('div')
			spinner.className = 'spinner'

			loadingScreen.appendChild(loadingText)
			loadingScreen.appendChild(spinner)

			document.body.appendChild(loadingScreen)
		} else {
			const loadingText = loadingScreen.querySelector('.loading-text')
			if (loadingText) {
				loadingText.textContent = message || 'Загрузка...'
			}
			loadingScreen.style.display = 'flex'
		}
	}

	// Hide the loading indicator
	function hideLoading() {
		const loadingScreen = document.getElementById('loadingScreen')
		if (loadingScreen) {
			loadingScreen.style.display = 'none'
		}
	}

	// Display a message to the user
	function showMessage(message, type = 'info') {
		alert(message)
	}

	// Функция для показа игровых сообщений
	function showGameMessage(message, type = 'info', duration = 5000) {
		// Создаем элемент для сообщения
		const messageElement = document.createElement('div')
		messageElement.className = `game-message game-message-${type}`
		messageElement.textContent = message

		// Добавляем элемент в DOM
		document.body.appendChild(messageElement)

		// Позиционируем в центре нижней части экрана
		messageElement.style.position = 'fixed'
		messageElement.style.bottom = '100px'
		messageElement.style.left = '50%'
		messageElement.style.transform = 'translateX(-50%)'
		messageElement.style.backgroundColor =
			type === 'error' ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.7)'
		messageElement.style.color = 'white'
		messageElement.style.padding = '8px 16px'
		messageElement.style.borderRadius = '4px'
		messageElement.style.zIndex = '1000'

		// Удаляем сообщение через указанное время
		setTimeout(() => {
			if (document.body.contains(messageElement)) {
				document.body.removeChild(messageElement)
			}
		}, duration)
	}

	// Expose functions to window
	window.startMultiplayerGame = startMultiplayerGame
	window.loadActiveGames = loadActiveGames
	window.showLoading = showLoading
	window.hideLoading = hideLoading
	window.loadSavedWorldsForMultiplayer = loadSavedWorldsForMultiplayer
})
