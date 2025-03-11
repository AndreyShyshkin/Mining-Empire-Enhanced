import { Player } from './app/Entities/Player'
import { Canvas } from './app/Graphics/Canvas/Canvas'
import { Images } from './app/Graphics/Images'
import { Game } from './app/Logic/Game'
import { CreateImageByPath } from './app/Logic/RenderImage'
import { SaveManager } from './app/Logic/SaveManager'
import { SceneManager } from './app/Logic/SceneManager'
import resurse from './app/Logic/inventory'
import cave from './app/Map/cave'
import village from './app/Map/village'
import { Vector2 } from './app/Math/Vector2'

// DOM elements
const startScreen = document.querySelector('.startScreen')
const money = document.querySelector('.money')
const res1 = document.querySelector('.res1')
const res2 = document.querySelector('.res2')
const res3 = document.querySelector('.res3')
const res4 = document.querySelector('.res4')
const res5 = document.querySelector('.res5')
const res6 = document.querySelector('.res6')

// New Game Start Options
const newGameBtn = document.querySelector('#newGameBtn')
const loadGameBtn = document.querySelector('#loadGameBtn')
const newGamePopup = document.querySelector('#newGamePopup')
const seedInput = document.querySelector('#seedInput')
const startWithSeedBtn = document.querySelector('#startWithSeed')
const cancelSeedBtn = document.querySelector('.cancel-seed')
const loadSaveStartPopup = document.querySelector('#loadSaveStartPopup')
const loadSaveStartConfirm = document.querySelector('#loadSaveStartConfirm')
const saveStartTimestamp = document.querySelector('#saveStartTimestamp')

// Popup elements
const controlsBtn = document.querySelector('#controlsBtn')
const resourcesBtn = document.querySelector('#resourcesBtn')
const controlsPopup = document.querySelector('#controlsPopup')
const resourcesPopup = document.querySelector('#resourcesPopup')
const closeButtons = document.querySelectorAll('.close-popup')

// Settings elements
const settingsButton = document.querySelector('.settings-button')
const settingsPopup = document.querySelector('.settings-popup')
const closeSettings = document.querySelector('.close-settings')
const mainMenuButton = document.querySelector('.main-menu-button')
const autoSaveToggle = document.querySelector('.auto-save-toggle')
const saveButton = document.querySelector('.save-button')

// World selection elements
const worldSelectionPopup = document.querySelector('#worldSelectionPopup')
const worldsList = document.querySelector('#worldsList')
const noWorldsMessage = document.querySelector('#noWorldsMessage')
const closeWorldSelection = document.querySelector('.close-world-selection')
const worldNameInput = document.querySelector('#worldNameInput')
const selectedWorldName = document.querySelector('#selectedWorldName')

// Add references to the seed display
const seedDisplay = document.querySelector('#seed-value')

// Game state
let game = new Game(
	Start,
	Update,
	() => {},
	() => {},
	() => {}
)
let SM = new SceneManager()
let player

// Initialize just enough for the start screen, but don't create the world yet
function initGame() {
	Canvas.Instance.updateSize()
	Canvas.Instance.GetLayerContext(0).drawImage(Images.back, 0, 0)
}

// Create a new game world with name and optional seed
function startNewGame(worldName, seed = null) {
	if (!worldName || worldName.trim() === '') {
		alert('Please enter a world name')
		return
	}

	// Create new world in SaveManager
	const worldData = SaveManager.createNewWorld(worldName, seed)

	if (!worldData) {
		alert('Failed to create new world')
		return
	}

	// Initialize the player
	let playerImg = CreateImageByPath('./assets/img/player1.png')
	player = new Player(
		new Vector2(920, 500),
		new Vector2(80, 80),
		playerImg,
		3,
		Vector2.Zero,
		SM
	)

	// Generate the village and cave
	village(SM.town.TC)
	cave()

	// Start auto-save
	SaveManager.startAutoSave()

	// Update seed display
	updateSeedDisplay(worldData.seed)

	// Close the start screen and go fullscreen
	closeStartScreen()
}

// Display the world selection UI
function showWorldSelection() {
	// Clear previous entries
	worldsList.innerHTML = ''

	// Get all saved worlds
	const worlds = SaveManager.getAllWorlds()
	const worldIds = Object.keys(worlds)

	if (worldIds.length === 0) {
		// No worlds found
		noWorldsMessage.style.display = 'block'
		worldsList.style.display = 'none'
	} else {
		// Sort worlds by last played time (most recent first)
		worldIds.sort((a, b) => worlds[b].lastPlayed - worlds[a].lastPlayed)

		// Display each world
		worldIds.forEach(worldId => {
			const world = worlds[worldId]

			const worldEntry = document.createElement('div')
			worldEntry.className = 'world-entry'
			worldEntry.dataset.worldId = worldId

			const lastPlayed = new Date(world.lastPlayed).toLocaleString()

			worldEntry.innerHTML = `
				<div class="world-entry-header">
					<div class="world-name">${world.name}</div>
					<button class="world-delete" data-world-id="${worldId}">✕</button>
				</div>
				<div class="world-seed">Seed: ${world.seed}</div>
				<div class="world-timestamp">Last played: ${lastPlayed}</div>
			`

			worldsList.appendChild(worldEntry)
		})

		// Add click handlers for world entries
		document.querySelectorAll('.world-entry').forEach(entry => {
			entry.addEventListener('click', e => {
				// Ignore clicks on the delete button
				if (e.target.classList.contains('world-delete')) {
					return
				}

				const worldId = entry.dataset.worldId
				const worldData = SaveManager.getWorldDetails(worldId)

				// Show confirmation dialog
				selectedWorldName.textContent = worldData.name
				worldSelectionPopup.style.display = 'none'
				loadSaveStartPopup.style.display = 'flex'
				loadSaveStartPopup.dataset.worldId = worldId
			})
		})

		// Add click handlers for delete buttons
		document.querySelectorAll('.world-delete').forEach(button => {
			button.addEventListener('click', e => {
				e.stopPropagation()

				const worldId = button.dataset.worldId
				const worldData = SaveManager.getWorldDetails(worldId)

				if (
					confirm(
						`Are you sure you want to delete the world "${worldData.name}"?`
					)
				) {
					SaveManager.deleteWorld(worldId)
					showWorldSelection() // Refresh the list
				}
			})
		})

		noWorldsMessage.style.display = 'none'
		worldsList.style.display = 'block'
	}

	worldSelectionPopup.style.display = 'flex'
}

// Load a saved game
function loadSavedGame(worldId) {
	console.log('Loading world:', worldId)

	// Initialize the player first
	let playerImg = CreateImageByPath('./assets/img/player1.png')
	player = new Player(
		new Vector2(920, 500),
		new Vector2(80, 80),
		playerImg,
		3,
		Vector2.Zero,
		SM
	)

	// Generate only the village initially - the cave will be regenerated when needed
	village(SM.town.TC)

	// Load the saved world
	if (SaveManager.loadWorld(worldId)) {
		SaveManager.showNotification('Game loaded successfully!')

		// Update seed display
		const worldManager = WorldManager.getInstance()
		updateSeedDisplay(worldManager.worldSeed)
	} else {
		SaveManager.showNotification('Failed to load game')
		return
	}

	// Start auto-save
	SaveManager.startAutoSave()

	// Close the start screen and go fullscreen
	closeStartScreen()
}

function closeStartScreen() {
	startScreen.style.display = 'none'

	let element = document.documentElement
	if (element.requestFullscreen) {
		element.requestFullscreen()
	} else if (element.webkitRequestFullscreen) {
		element.webkitRequestFullscreen()
	} else if (element.mozRequestFullScreen) {
		element.mozRequestFullScreen()
	} else if (element.msRequestFullscreen) {
		element.msRequestFullscreen()
	}
}

// Function to update the seed display
function updateSeedDisplay(seed) {
	if (seedDisplay) {
		seedDisplay.textContent = seed || 'N/A'
	}
}

// EVENT LISTENERS

// New Game button click
newGameBtn.addEventListener('click', () => {
	// Show seed input popup
	worldNameInput.value = ''
	seedInput.value = ''
	newGamePopup.style.display = 'flex'
})

// Start with seed button click
startWithSeedBtn.addEventListener('click', () => {
	const worldName = worldNameInput.value.trim()
	const seed = seedInput.value.trim() ? Number(seedInput.value) : null

	if (!worldName) {
		alert('Please enter a world name')
		return
	}

	newGamePopup.style.display = 'none'
	startNewGame(worldName, seed)
})

// Cancel seed button click
cancelSeedBtn.addEventListener('click', () => {
	newGamePopup.style.display = 'none'
})

// Load Game button click
loadGameBtn.addEventListener('click', () => {
	if (SaveManager.hasSavedWorlds()) {
		showWorldSelection()
	} else {
		alert('No saved worlds found!')
	}
})

// World selection close button
closeWorldSelection.addEventListener('click', () => {
	worldSelectionPopup.style.display = 'none'
})

// Load save confirmation on start screen
loadSaveStartConfirm.addEventListener('click', () => {
	const worldId = loadSaveStartPopup.dataset.worldId
	loadSaveStartPopup.style.display = 'none'
	loadSavedGame(worldId)
})

// Popup event listeners
controlsBtn.addEventListener('click', () => {
	controlsPopup.style.display = 'flex'
})

resourcesBtn.addEventListener('click', () => {
	resourcesPopup.style.display = 'flex'
})

closeButtons.forEach(button => {
	button.addEventListener('click', () => {
		controlsPopup.style.display = 'none'
		resourcesPopup.style.display = 'none'
	})
})

// Settings Button Event Listeners
settingsButton.addEventListener('click', () => {
	settingsPopup.style.display = 'flex'
})

// Close settings when clicking X
closeSettings.addEventListener('click', () => {
	settingsPopup.style.display = 'none'
})

// Close settings when clicking outside the popup
window.addEventListener('click', event => {
	if (event.target === settingsPopup) {
		settingsPopup.style.display = 'none'
	}
	// Keep existing window click handlers
	if (event.target === deleteSavePopup) {
		deleteSavePopup.style.display = 'none'
	}
	if (event.target === loadSavePopup) {
		loadSavePopup.style.display = 'none'
	}
	if (event.target === controlsPopup) {
		controlsPopup.style.display = 'none'
	}
	if (event.target === resourcesPopup) {
		resourcesPopup.style.display = 'none'
	}
	if (event.target === newGamePopup) {
		newGamePopup.style.display = 'none'
	}

	if (event.target === loadSaveStartPopup) {
		loadSaveStartPopup.style.display = 'none'
	}
})

// Main menu button - simply reload the page instead of trying to reset game state
mainMenuButton.addEventListener('click', () => {
	// Hide settings popup
	settingsPopup.style.display = 'none'

	// Save current world before reloading
	if (SaveManager.getCurrentWorldId()) {
		SaveManager.saveGame()
	}

	// Reload the entire page - this ensures clean state
	window.location.reload()
})

// Auto-save toggle
autoSaveToggle.addEventListener('click', () => {
	const isEnabled = SaveManager.toggleAutoSave()
	autoSaveToggle.textContent = `Автосохранение: ${isEnabled ? 'ВКЛ' : 'ВЫКЛ'}`
	if (isEnabled) {
		autoSaveToggle.classList.remove('disabled')
	} else {
		autoSaveToggle.classList.add('disabled')
	}
	SaveManager.showNotification(
		`Автосохранение ${isEnabled ? 'включено' : 'выключено'}`
	)
})

// Save button
saveButton.addEventListener('click', () => {
	if (SaveManager.saveGame()) {
		SaveManager.showNotification('Игра сохранена!')
		settingsPopup.style.display = 'none'
	} else {
		SaveManager.showNotification('Ошибка сохранения')
	}
})

window.onbeforeunload = function () {
	// Save game before unloading if auto-save is enabled
	if (SaveManager.isAutoSaveEnabled && player) {
		SaveManager.saveGame()
	}
	return 'Are you sure?'
}

window.onload = () => {
	game.Start()
	initGame()

	// Check if there are saved worlds
	if (SaveManager.hasSavedWorlds()) {
		loadGameBtn.style.opacity = '1'
	} else {
		loadGameBtn.style.opacity = '0.5'
	}
}

function Start() {
	Canvas.Instance.updateSize()
	Canvas.Instance.GetLayerContext(0).drawImage(Images.back, 0, 0)
}

function Update() {
	// Only update the game if we're no longer on the start screen
	if (startScreen.style.display === 'none' && player) {
		let entities = []
		SceneManager.Instance.currentScene.Entities.forEach(element => {
			entities.push(element)
		})

		SM.currentScene.TC.LoadedLayers.forEach(layer => {
			layer.forEach(entity => {
				entities.push(entity)
			})
		})

		SM.currentScene.TC.UpdateLoadted(Player.Camera.Y)
		player.Update(entities)

		Canvas.Instance.GetLayerContext(1).clearRect(0, 0, 1920, 1080)
		Canvas.Instance.GetLayerContext(2).clearRect(0, 0, 1920, 1080)
		Canvas.Instance.GetLayerContext(3).clearRect(0, 0, 1920, 1080)

		SM.currentScene.Draw()
		player.Draw(Canvas.Instance.GetLayerContext(player.Layer), Player.Camera)

		money.innerHTML = resurse.money
		res1.innerHTML = resurse.res1
		res2.innerHTML = resurse.res2
		res3.innerHTML = resurse.res3
		res4.innerHTML = resurse.res4
		res5.innerHTML = resurse.res5
		res6.innerHTML = resurse.res6
	}
}

function drawText(context, text, x, y, font, color, align = 'left') {
	context.font = font
	context.fillStyle = color
	context.textAlign = align
	context.fillText(text, x, y)
}
