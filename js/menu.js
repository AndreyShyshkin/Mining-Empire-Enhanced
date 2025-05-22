class GameMenu {
	constructor(worldManager) {
		this.worldManager = worldManager
		this.currentWorldId = null
		this.gameActive = false
		this.initializeMenuElements()
		this.bindEvents()
	}

	initializeMenuElements() {
		// Основные контейнеры
		this.mainMenu = document.getElementById('mainMenu')
		this.gameContainer = document.getElementById('gameContainer')
		// Controls info has been moved to in-game settings menu
		this.controlsInfo = document.getElementById('controlsInfo') // Keep this for backward compatibility, can be null

		// Панели меню
		this.newWorldPanel = document.getElementById('newWorldPanel')
		this.loadWorldPanel = document.getElementById('loadWorldPanel')
		this.settingsPanel = document.getElementById('settingsPanel')
		this.friendsPanel = document.getElementById('friendsPanel')
		this.multiplayerPanel = document.getElementById('multiplayerPanel')

		// Кнопки в главном меню
		this.newWorldBtn = document.getElementById('newWorldBtn')
		this.loadWorldBtn = document.getElementById('loadWorldBtn')
		this.multiplayerBtn = document.getElementById('multiplayerBtn')
		this.friendsBtn = document.getElementById('friendsBtn')
		this.settingsBtn = document.getElementById('settingsBtn')
		this.profileMenuBtn = document.getElementById('profileMenuBtn')
		this.logoutMenuBtn = document.getElementById('logoutMenuBtn')

		// Элементы в панели создания мира
		this.worldNameInput = document.getElementById('worldName')
		this.worldSizeSelect = document.getElementById('worldSize')
		this.createWorldBtn = document.getElementById('createWorldBtn')
		this.backFromNewBtn = document.getElementById('backFromNewBtn')

		// Элементы в панели загрузки мира
		this.worldsList = document.getElementById('worldsList')
		this.backFromLoadBtn = document.getElementById('backFromLoadBtn')

		// Элементы в панели настроек
		this.soundVolumeInput = document.getElementById('soundVolume')
		this.renderDistanceSelect = document.getElementById('renderDistance')
		this.saveSettingsBtn = document.getElementById('saveSettingsBtn')
		this.backFromSettingsBtn = document.getElementById('backFromSettingsBtn')

		// Кнопка возврата в меню из игры
		this.returnToMenuBtn = document.getElementById('returnToMenuBtn')
	}

	bindEvents() {
		// Кнопки главного меню
		this.newWorldBtn.addEventListener('click', () =>
			this.showPanel(this.newWorldPanel)
		)
		this.loadWorldBtn.addEventListener('click', () => this.loadWorldsList())
		if (this.multiplayerBtn) {
			this.multiplayerBtn.addEventListener('click', () => {
				this.showPanel(this.multiplayerPanel)
				// Загружаем список активных игр при открытии панели
				if (window.loadActiveGames) {
					window.loadActiveGames()
				}
				// Убедимся, что список миров загружен
				if (typeof loadSavedWorldsForMultiplayer === 'function') {
					loadSavedWorldsForMultiplayer()
				}
			})
		}
		if (this.friendsBtn) {
			this.friendsBtn.addEventListener('click', () => {
				this.showPanel(this.friendsPanel)
				// Загружаем список друзей при открытии панели
				if (window.loadFriendsList) {
					window.loadFriendsList()
				}
			})
		}
		this.settingsBtn.addEventListener('click', () =>
			this.showPanel(this.settingsPanel)
		)
		// Добавляем обработчики для профиля и выхода
		if (this.profileMenuBtn) {
			this.profileMenuBtn.addEventListener('click', () => {
				if (window.showProfilePanel) {
					window.showProfilePanel()
				} else {
					console.error('showProfilePanel function is not defined')
				}
			})
		}
		// Выход обрабатывается в firebase-auth.js

		// Кнопки панели создания мира
		this.createWorldBtn.addEventListener('click', () => this.createNewWorld())
		this.backFromNewBtn.addEventListener('click', () => this.showMainMenu())

		// Кнопки панели загрузки мира
		this.backFromLoadBtn.addEventListener('click', () => this.showMainMenu())

		// Кнопки панели настроек
		this.saveSettingsBtn.addEventListener('click', () => this.saveSettings())
		this.backFromSettingsBtn.addEventListener('click', () =>
			this.showMainMenu()
		)

		// Возврат в меню из игры
		this.returnToMenuBtn.addEventListener('click', () =>
			this.confirmExitToMenu()
		)

		// Клавиша Escape для возврата в меню
		document.addEventListener('keydown', e => {
			if (e.key === 'Escape' && this.gameActive) {
				this.confirmExitToMenu()
			}
		})
	}

	showPanel(panel) {
		// Скрываем все панели
		this.newWorldPanel.style.display = 'none'
		this.loadWorldPanel.style.display = 'none'
		this.settingsPanel.style.display = 'none'
		if (this.friendsPanel) {
			this.friendsPanel.style.display = 'none'
		}
		if (this.multiplayerPanel) {
			this.multiplayerPanel.style.display = 'none'
		}

		// Скрываем панель профиля если она существует
		const profilePanel = document.getElementById('profilePanel')
		if (profilePanel) {
			profilePanel.style.display = 'none'
		}

		// Отображаем выбранную панель
		if (panel) {
			panel.style.display = 'block'
		}
	}

	showMainMenu() {
		// Возвращаемся в главное меню
		this.showPanel(null)
	}

	createNewWorld() {
		const worldName = this.worldNameInput.value.trim() || 'Новый мир'
		const worldSize = this.worldSizeSelect.value

		// Создаём мир с помощью WorldManager
		this.showLoading('Создание мира...')

		setTimeout(() => {
			const worldMeta = this.worldManager.createWorld(worldName, worldSize)
			this.currentWorldId = worldMeta.id
			this.startGame(worldMeta)
		}, 500)
	}

	loadWorldsList() {
		// Получаем список миров и отображаем их
		const worlds = this.worldManager.getWorldsList()
		this.worldsList.innerHTML = ''

		if (worlds.length === 0) {
			this.worldsList.innerHTML =
				'<div class="world-item">Нет сохранённых миров</div>'
		} else {
			// Сортируем миры по дате последней игры (сначала новые)
			worlds.sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed))

			worlds.forEach(world => {
				const worldItem = document.createElement('div')
				worldItem.className = 'world-item'

				const worldInfo = document.createElement('div')
				worldInfo.className = 'world-info'

				const worldName = document.createElement('div')
				worldName.className = 'world-name'
				worldName.textContent = world.name

				const worldMeta = document.createElement('div')
				worldMeta.className = 'world-meta'
				worldMeta.textContent = `${this.getSizeName(
					world.sizeType
				)} · Последняя игра: ${this.worldManager.formatDate(world.lastPlayed)}`

				worldInfo.appendChild(worldName)
				worldInfo.appendChild(worldMeta)

				const worldActions = document.createElement('div')
				worldActions.className = 'world-actions'

				const playBtn = document.createElement('button')
				playBtn.textContent = 'Играть'
				playBtn.addEventListener('click', () => this.loadWorld(world.id))

				const deleteBtn = document.createElement('button')
				deleteBtn.textContent = 'Удалить'
				deleteBtn.className = 'delete-btn'
				deleteBtn.addEventListener('click', e => {
					e.stopPropagation()
					this.confirmDeleteWorld(world.id, world.name)
				})

				worldActions.appendChild(playBtn)
				worldActions.appendChild(deleteBtn)

				worldItem.appendChild(worldInfo)
				worldItem.appendChild(worldActions)

				// Добавляем элемент с миром в список
				this.worldsList.appendChild(worldItem)
			})
		}

		this.showPanel(this.loadWorldPanel)
	}

	getSizeName(sizeType) {
		const sizeNames = {
			small: 'Маленький',
			medium: 'Средний',
			large: 'Большой',
		}
		return sizeNames[sizeType] || 'Средний'
	}

	loadWorld(worldId) {
		this.showLoading('Загрузка мира...')

		setTimeout(() => {
			const worldMeta = this.worldManager.getWorldMeta(worldId)
			if (worldMeta) {
				this.currentWorldId = worldId
				this.startGame(worldMeta)
			} else {
				alert('Не удалось загрузить мир.')
				this.hideLoading()
			}
		}, 500)
	}

	confirmDeleteWorld(worldId, worldName) {
		if (confirm(`Вы уверены, что хотите удалить мир "${worldName}"?`)) {
			this.worldManager.deleteWorld(worldId)
			this.loadWorldsList() // Обновляем список миров
		}
	}

	startGame(worldMeta) {
		// Скрываем меню и показываем игру
		this.mainMenu.style.display = 'none'
		this.gameContainer.style.display = 'block'

		// Controls info has been moved to in-game settings menu
		// Only show it if it exists for backward compatibility
		if (this.controlsInfo) {
			this.controlsInfo.style.display = 'none'
		}

		// Устанавливаем состояние игры
		this.gameActive = true

		// Запускаем игру с выбранным миром
		startGame(worldMeta, this.currentWorldId, this.worldManager)

		this.hideLoading()
	}

	confirmExitToMenu() {
		// При выходе сохраняем мир, если игра активна
		if (this.gameActive) {
			if (confirm('Вернуться в главное меню? Прогресс будет сохранён.')) {
				this.exitToMenu()
			}
		} else {
			this.exitToMenu()
		}
	}

	exitToMenu() {
		// Если это мультиплеерная игра, сначала отключаемся от неё
		// для хоста это автоматически сохранит мир и удалит данные с сервера
		if (
			window.multiplayerSystem &&
			window.multiplayerSystem.isInMultiplayerGame()
		) {
			window.multiplayerSystem.disconnect()
		}
		// Иначе обычное сохранение для одиночной игры
		else if (this.gameActive && this.currentWorldId && window.world) {
			this.worldManager.saveWorld(window.world, this.currentWorldId)
		}

		// Сбрасываем состояние игры
		this.gameActive = false
		this.currentWorldId = null

		// Останавливаем игровой цикл (если возможно)
		if (window.stopGame && typeof window.stopGame === 'function') {
			window.stopGame()
		}

		// Показываем меню и скрываем игру
		this.mainMenu.style.display = 'flex'
		this.gameContainer.style.display = 'none'

		// Controls info has been moved to in-game settings menu
		// Only hide it if it exists for backward compatibility
		if (this.controlsInfo) {
			this.controlsInfo.style.display = 'none'
		}

		// Возвращаемся в главное меню
		this.showMainMenu()
	}

	saveSettings() {
		// Сохраняем настройки в localStorage
		if (this.worldManager.storageAvailable) {
			const settings = {
				soundVolume: this.soundVolumeInput.value,
				renderDistance: this.renderDistanceSelect.value,
			}

			localStorage.setItem('game_settings', JSON.stringify(settings))
			alert('Настройки сохранены!')
		}

		// Применяем настройки, если игра запущена
		if (window.renderer && settings.renderDistance) {
			window.renderer.renderDistance = parseInt(settings.renderDistance)
		}

		this.showMainMenu()
	}

	loadSettings() {
		// Загружаем настройки из localStorage
		if (this.worldManager.storageAvailable) {
			const settingsRaw = localStorage.getItem('game_settings')
			if (settingsRaw) {
				try {
					const settings = JSON.parse(settingsRaw)

					if (settings.soundVolume) {
						this.soundVolumeInput.value = settings.soundVolume
					}

					if (settings.renderDistance) {
						this.renderDistanceSelect.value = settings.renderDistance
					}
				} catch (e) {
					console.error('Ошибка загрузки настроек:', e)
				}
			}
		}
	}

	showLoading(message) {
		// Создаем экран загрузки
		const loadingScreen = document.createElement('div')
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
	}

	hideLoading() {
		const loadingScreen = document.getElementById('loadingScreen')
		if (loadingScreen) {
			loadingScreen.remove()
		}
	}
}

// Создаем экземпляры классов в window.onload
window.addEventListener('DOMContentLoaded', () => {
	// Инициализация менеджера миров
	window.worldManager = new WorldManager()

	// Инициализация главного меню
	window.gameMenu = new GameMenu(window.worldManager)

	// Загружаем настройки
	window.gameMenu.loadSettings()
})
