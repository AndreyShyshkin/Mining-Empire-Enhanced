import cave from '../Map/cave'
import { Scene } from './Scene'

export class SceneManager {
	town = new Scene()
	mine = new Scene()
	currentScene = this.town
	currentSceneType = 'town' // Add this to track current scene type
	static Instance

	// Track scene initialization status
	mineInitialized = false

	constructor() {
		SceneManager.Instance = this
	}

	ChangeScene() {
		const newLocation = Object.is(this.currentScene, this.town)
			? 'cave'
			: 'village'

		if (newLocation === 'cave') {
			this.currentScene = this.mine
			this.currentSceneType = 'mine'

			// Initialize mine if needed
			if (!this.mineInitialized) {
				console.log('Initializing mine on scene change')
				cave()
				this.mineInitialized = true
			}
		} else {
			this.currentScene = this.town
			this.currentSceneType = 'town'
		}
		console.log(
			'Changed scene to:',
			this.currentSceneType,
			'with location:',
			newLocation
		)

		// Dispatch a custom event so the GameSynchronizer can detect location changes
		const event = new CustomEvent('locationChange', {
			detail: { location: newLocation },
		})
		document.dispatchEvent(event)
	}

	SetScene(scene) {
		const newLocation = scene === this.town ? 'village' : 'cave'
		this.currentScene = scene
		this.currentSceneType = scene === this.town ? 'town' : 'mine'

		console.log(
			'Set scene to:',
			this.currentSceneType,
			'with location:',
			newLocation
		)

		// Initialize mine if needed
		if (scene === this.mine && !this.mineInitialized) {
			console.log('Initializing mine on scene set')
			cave()
			this.mineInitialized = true
		}

		// Dispatch a custom event so the GameSynchronizer can detect location changes
		const event = new CustomEvent('locationChange', {
			detail: { location: newLocation },
		})
		document.dispatchEvent(event)
	}

	// Reset scene initialization state (used when loading saves)
	resetSceneState() {
		console.log('Resetting scene state')
		this.mineInitialized = false
	}
}
