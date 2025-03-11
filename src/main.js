import { Player } from './app/Entities/Player'
import { Canvas } from './app/Graphics/Canvas/Canvas'
import { Images } from './app/Graphics/Images'
import { Game } from './app/Logic/Game'
import { CreateImageByPath } from './app/Logic/RenderImage'
import { SceneManager } from './app/Logic/SceneManager'
import resurse from './app/Logic/inventory'
import cave from './app/Map/cave'
import village from './app/Map/village'
import { Vector2 } from './app/Math/Vector2'

let startGame = document.querySelector('#startGame')
let startScreen = document.querySelector('.startScreen')
let money = document.querySelector('.money')
let res1 = document.querySelector('.res1')
let res2 = document.querySelector('.res2')
let res3 = document.querySelector('.res3')
let res4 = document.querySelector('.res4')
let res5 = document.querySelector('.res5')
let res6 = document.querySelector('.res6')

// Popup elements
const controlsBtn = document.querySelector('#controlsBtn')
const resourcesBtn = document.querySelector('#resourcesBtn')
const controlsPopup = document.querySelector('#controlsPopup')
const resourcesPopup = document.querySelector('#resourcesPopup')
const closeButtons = document.querySelectorAll('.close-popup')

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

// Close popup when clicking outside of it
window.addEventListener('click', event => {
	if (event.target === controlsPopup) {
		controlsPopup.style.display = 'none'
	}
	if (event.target === resourcesPopup) {
		resourcesPopup.style.display = 'none'
	}
})

let game = new Game(
	Start,
	Update,
	() => {},
	() => {},
	() => {}
)

let SM = new SceneManager()

let playerImg = CreateImageByPath('./assets/img/player1.png')
let player = new Player(
	new Vector2(920, 500),
	new Vector2(80, 80),
	playerImg,
	3,
	Vector2.Zero,
	SM
)

village(SM.town.TC)
cave()

window.onbeforeunload = function () {
	return 'Are you sure?'
}

startGame.addEventListener('click', event => {
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
})

window.onload = () => game.Start()
function Start() {
	Canvas.Instance.updateSize()
	Canvas.Instance.GetLayerContext(0).drawImage(Images.back, 0, 0)
}
function Update() {
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

function drawText(context, text, x, y, font, color, align = 'left') {
	context.font = font
	context.fillStyle = color
	context.textAlign = align
	context.fillText(text, x, y)
}
