// Глобальные переменные для игры
let canvas, ctx
let world, player, renderer
let keys = {}
let mouseX, mouseY
let gameTime = 0
let gameInitialized = false
let gameLoop
let worldId = null
let worldManager = null
let autosaveInterval = null
// Track if the game is paused (inventory open)
window.gameIsPaused = false

// Инициализация игры
function startGame(worldMeta, currentWorldId, worldManagerInstance) {
	// Сохраняем идентификатор мира и менеджер миров
	worldId = currentWorldId
	worldManager = worldManagerInstance

	// Настраиваем canvas
	canvas = document.getElementById('gameCanvas')

	// Установка размера canvas на полный экран
	function resizeCanvas() {
		const gameContainer = document.getElementById('gameContainer')
		canvas.width = gameContainer.clientWidth
		canvas.height = gameContainer.clientHeight

		// Если renderer уже создан, обновим его view размеры
		if (window.renderer) {
			window.renderer.updateViewport(canvas.width, canvas.height)
		}

		console.log(`Canvas resized to ${canvas.width}x${canvas.height}`)
	}

	// Вызываем сразу и добавляем слушатель изменения размера окна
	resizeCanvas()
	window.addEventListener('resize', resizeCanvas)

	ctx = canvas.getContext('2d')

	// Показываем сообщение о загрузке
	ctx.fillStyle = '#000'
	ctx.fillRect(0, 0, canvas.width, canvas.height)
	ctx.fillStyle = '#fff'
	ctx.font = '24px Arial'
	ctx.textAlign = 'center'
	ctx.fillText('Загрузка мира...', canvas.width / 2, canvas.height / 2)

	// Начинаем инициализацию игры асинхронно
	setTimeout(() => initializeGame(worldMeta), 100)
}

// Инициализация игровых компонентов
function initializeGame(worldMeta) {
	// Загружаем или создаем мир
	const worldData = worldManager.loadWorld(worldId)

	if (worldData && worldData.tiles) {
		// Загружаем существующий мир
		world = new World(worldMeta.width, worldMeta.height, worldData)
	} else {
		// Создаем новый мир с указанными размерами
		world = new World(worldMeta.width, worldMeta.height)
	}

	// Экспортируем мир в глобальную область для доступа из меню
	window.world = world

	// Создаем игрока (спавним в средней части мира, над поверхностью)
	const spawnX = Math.floor(world.width / 2) * BLOCK_SIZE
	const spawnY = Math.floor(world.height * 0.35) * BLOCK_SIZE
	player = new Player(spawnX, spawnY, world)

	// Load inventory data if available in saved world
	if (worldData && worldData.inventory && player.inventory) {
		player.inventory.loadFromSaveData(worldData.inventory)
		console.log('Loaded saved inventory data')
	}

	// Инициализируем систему крафтинга
	if (typeof window.CraftingSystem === 'function') {
		console.log('Initializing CraftingSystem...')
		const craftingSystem = new window.CraftingSystem(player)

		// Make sure the prototype methods are correctly attached
		console.log(
			'CraftingSystem prototype methods:',
			'scanForCraftingStations:',
			typeof CraftingSystem.prototype.scanForCraftingStations,
			'getAvailableRecipes:',
			typeof CraftingSystem.prototype.getAvailableRecipes,
			'canCraft:',
			typeof CraftingSystem.prototype.canCraft
		)

		// Set the instance to window for global access
		window.craftingSystem = craftingSystem

		// Инициализируем UI крафтинга
		const craftingUI = new CraftingUI(craftingSystem)
		window.craftingUI = craftingUI
	} else {
		console.error('CraftingSystem is not defined or not a function')
	}

	// Создаем рендерер
	renderer = new Renderer(canvas, world)

	// Загружаем настройки рендеринга
	loadRenderSettings()

	// Экспортируем рендерер для доступа из меню
	window.renderer = renderer

	// Настраиваем обработчики событий
	setupEventListeners()

	gameInitialized = true

	// Настраиваем автосохранение каждые 2 минуты
	autosaveInterval = setInterval(() => {
		if (world && worldId) {
			worldManager.saveWorld(world, worldId)
			console.log('Автосохранение завершено')
		}
	}, 120000) // 2 минуты

	// Запускаем игровой цикл
	gameLoop = requestAnimationFrame(gameLoopFn)
}

// Загрузка настроек рендеринга
function loadRenderSettings() {
	if (renderer && localStorage) {
		const settingsRaw = localStorage.getItem('game_settings')
		if (settingsRaw) {
			try {
				const settings = JSON.parse(settingsRaw)
				if (settings.renderDistance) {
					renderer.renderDistance = parseInt(settings.renderDistance)
				}
			} catch (e) {
				console.error('Ошибка загрузки настроек рендеринга:', e)
			}
		}
	}
}

// Настройка обработчиков событий
function setupEventListeners() {
	// Управление с клавиатуры
	window.addEventListener('keydown', e => {
		keys[e.key] = true
	})

	window.addEventListener('keyup', e => {
		keys[e.key] = false
	})

	// Управление мышью
	canvas.addEventListener('mousemove', e => {
		const rect = canvas.getBoundingClientRect()
		mouseX = e.clientX - rect.left
		mouseY = e.clientY - rect.top
	})

	canvas.addEventListener('mousedown', e => {
		const rect = canvas.getBoundingClientRect()
		const clickX = e.clientX - rect.left
		const clickY = e.clientY - rect.top

		// Переводим координаты экрана в координаты мира
		const worldCoords = Utils.screenToWorld(clickX, clickY, renderer.camera)
		const tileCoords = Utils.worldToTile(worldCoords.x, worldCoords.y)

		// Check if we're in multiplayer mode
		const isMultiplayer =
			window.multiplayerSystem && window.multiplayerSystem.isInMultiplayerGame()

		if (e.button === 0) {
			// Левая кнопка мыши - добыча блока
			player.startMining(tileCoords.x, tileCoords.y)
		} else if (e.button === 2) {
			// Правая кнопка мыши - размещение блока
			player.placeBlock(tileCoords.x, tileCoords.y)
		}
	})

	// Предотвращаем появление контекстного меню при правом клике
	canvas.addEventListener('contextmenu', e => {
		e.preventDefault()
	})

	// Выбор слота инвентаря с помощью цифровых клавиш и открытие инвентаря клавишей E
	window.addEventListener('keydown', e => {
		if (!player || !player.inventory) return

		if (e.key >= '1' && e.key <= '5') {
			const slotIndex = parseInt(e.key) - 1
			player.inventory.selectSlot(slotIndex)
		} else if (
			(e.key.toLowerCase() === 'e' || e.key === 'Tab') &&
			!window._uiKeyboardHandler
		) {
			// Only handle E/Tab if the ui-keyboard-control.js handler is not available
			// Prevent default action for Tab key
			if (e.key === 'Tab') {
				e.preventDefault()
			}

			// Check if both inventory and crafting are open
			const isInventoryOpen = player.inventory.isFullInventoryOpen
			const isCraftingOpen = window.craftingUI
				? window.craftingUI.isCraftingOpen
				: false

			if (isInventoryOpen && isCraftingOpen) {
				// If both are open, close both
				player.inventory.toggleFullInventory()
				window.craftingUI.toggleCrafting()
				window.gameIsPaused = false
			} else {
				// Toggle just the inventory
				const isOpen = player.inventory.toggleFullInventory()

				// If closing inventory, also close crafting if it's open
				if (!isOpen && window.craftingUI && window.craftingUI.isCraftingOpen) {
					window.craftingUI.toggleCrafting()
				}

				// Update game pause state
				window.gameIsPaused = isOpen
			}
		} else if (e.key.toLowerCase() === 'c' && !window._uiKeyboardHandler) {
			// Only handle C if the ui-keyboard-control.js handler is not available
			// C key behavior for crafting
			if (window.craftingUI) {
				// Check current state
				const isInventoryOpen = player.inventory.isFullInventoryOpen
				const isCraftingOpen = window.craftingUI.isCraftingOpen

				if (isInventoryOpen && isCraftingOpen) {
					// If both are open, close both
					player.inventory.toggleFullInventory()
					window.craftingUI.toggleCrafting()
					window.gameIsPaused = false
				} else if (isInventoryOpen && !isCraftingOpen) {
					// If inventory is open but crafting is closed, just open crafting
					window.craftingUI.toggleCrafting()
					window.gameIsPaused = true
				} else {
					// If inventory is closed, open both
					player.inventory.toggleFullInventory()
					window.craftingUI.toggleCrafting()
					window.gameIsPaused = true
				}
			}
		}
	})
}

// Основной игровой цикл
function gameLoopFn() {
	if (!gameInitialized) {
		// Ждем завершения инициализации
		gameLoop = requestAnimationFrame(gameLoopFn)
		return
	}

	gameTime++

	// Only update player if game is not paused (inventory closed)
	if (!window.gameIsPaused) {
		// Обновляем состояние
		player.update(keys)
	}

	// Рендерим (even when paused)
	renderer.centerCameraOnPlayer(player)
	renderer.render(player, gameTime)

	// Рендерим других игроков в мультиплеере
	renderMultiplayerPlayers()

	// Продолжаем цикл
	gameLoop = requestAnimationFrame(gameLoopFn)
}

// Функция для рендеринга других игроков в мультиплеере
function renderMultiplayerPlayers() {
	if (!window.multiplayerSystem || !renderer) {
		return
	}

	// Получаем всех других игроков
	const otherPlayers = window.multiplayerSystem.getOtherPlayers()

	// Рендерим каждого игрока
	otherPlayers.forEach(otherPlayer => {
		// Вычисляем координаты на экране
		const screenX = otherPlayer.x - renderer.camera.x
		const screenY = otherPlayer.y - renderer.camera.y

		// Если игрок вне видимой области - пропускаем
		if (
			screenX < -50 ||
			screenX > canvas.width + 50 ||
			screenY < -50 ||
			screenY > canvas.height + 50
		) {
			return
		}

		// Рисуем тело игрока
		ctx.fillStyle = '#FF0000'
		ctx.fillRect(
			screenX - 10, // Половина ширины игрока
			screenY - 20, // Половина высоты игрока
			20, // Ширина игрока
			40 // Высота игрока
		)

		// Глаза игрока
		ctx.fillStyle = 'white'
		const eyeSize = 4
		const eyeY = screenY - 5
		const eyeOffset = otherPlayer.direction === 'right' ? 5 : -5
		ctx.fillRect(screenX + eyeOffset, eyeY, eyeSize, eyeSize)

		// Рисуем эффект добычи блока если игрок добывает
		if (
			otherPlayer.isMining &&
			otherPlayer.miningTargetX !== null &&
			otherPlayer.miningTargetY !== null
		) {
			const targetX = otherPlayer.miningTargetX * BLOCK_SIZE - renderer.camera.x
			const targetY = otherPlayer.miningTargetY * BLOCK_SIZE - renderer.camera.y

			// Линия от игрока к блоку
			ctx.strokeStyle = 'white'
			ctx.lineWidth = 2
			ctx.beginPath()
			ctx.moveTo(screenX, screenY)
			ctx.lineTo(targetX + BLOCK_SIZE / 2, targetY + BLOCK_SIZE / 2)
			ctx.stroke()

			// Прогресс добычи
			ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
			const block =
				BLOCKS[
					world.getTile(otherPlayer.miningTargetX, otherPlayer.miningTargetY)
				]
			// Calculate adjusted duration considering block hardness
			let adjustedDuration = 45 // Base duration matches player.js
			if (block && block.hardness) {
				adjustedDuration = 45 * block.hardness
			}
			const progress = otherPlayer.miningProgress / adjustedDuration
			ctx.fillRect(targetX, targetY, BLOCK_SIZE * progress, BLOCK_SIZE)
		}
	})
}

// Функция для остановки игры (вызывается при выходе в меню)
function stopGame() {
	console.log('Stopping game and cleaning up UI elements')

	// Сохраняем мир перед выходом
	if (world && worldId && worldManager) {
		worldManager.saveWorld(world, worldId)
	}

	// Reset inventory UI state
	if (player && player.inventory) {
		// Force close inventory if it's open
		if (player.inventory.isFullInventoryOpen) {
			player.inventory.isFullInventoryOpen = false

			// Make sure the UI element is hidden
			if (player.inventory.fullInventoryElement) {
				player.inventory.fullInventoryElement.style.display = 'none'
			}
		}

		// Remove the full inventory UI element completely
		if (player.inventory.fullInventoryElement) {
			player.inventory.fullInventoryElement.remove()
			player.inventory.fullInventoryElement = null
		}
	}

	// Reset crafting UI state
	if (window.craftingUI) {
		window.craftingUI.isCraftingOpen = false

		// Hide and remove the crafting UI if it exists
		if (window.craftingUI.uiElement) {
			window.craftingUI.uiElement.style.display = 'none'
			window.craftingUI.uiElement.remove()
			window.craftingUI.uiElement = null
		}

		// Also explicitly check and clean up the crafting container
		if (window.craftingUI.craftingContainer) {
			window.craftingUI.craftingContainer.style.display = 'none'
			window.craftingUI.craftingContainer.remove()
			window.craftingUI.craftingContainer = null
		}
	}

	// Clean up any orphaned UI elements
	const inventories = document.querySelectorAll('#fullInventory')
	inventories.forEach(element => {
		console.log('Removing orphaned inventory element during game stop')
		element.remove()
	})

	const craftingUIs = document.querySelectorAll(
		'.crafting-ui, .crafting-container'
	)
	craftingUIs.forEach(element => {
		console.log('Removing orphaned crafting UI element during game stop')
		element.remove()
	})

	// Reset game pause state
	window.gameIsPaused = false

	// Очищаем автосохранение
	if (autosaveInterval) {
		clearInterval(autosaveInterval)
	}

	// Останавливаем игровой цикл
	if (gameLoop) {
		cancelAnimationFrame(gameLoop)
	}

	// Сбрасываем переменные
	gameInitialized = false
	keys = {}
}

// Экспортируем функцию для вызова из меню
window.stopGame = stopGame
