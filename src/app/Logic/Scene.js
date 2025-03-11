import { Player } from '../Entities/Player'
import { Canvas } from '../Graphics/Canvas/Canvas'
import { TileContainer } from './TileContainer'

export class Scene {
	constructor() {
		this.Entities = []
		this.TC = new TileContainer() // Ensure TileContainer is properly initialized
	}

	Update() {
		this.Entities.forEach(entity => {
			entity.Update()
		})
	}

	Draw() {
		// Get the camera from Player class
		const camera = Player.Camera || { X: 0, Y: 0 }

		// Draw loaded tile layers
		this.TC.LoadedLayers.forEach(layer => {
			layer.forEach(tile => {
				// Pass the context and camera to the tile's Draw method
				try {
					const context = Canvas.Instance.GetLayerContext(tile.Layer)
					if (context) {
						tile.Draw(context, camera)
					}
				} catch (err) {
					console.error('Error drawing tile:', err)
				}
			})
		})

		// Draw entities
		this.Entities.forEach(entity => {
			try {
				const context = Canvas.Instance.GetLayerContext(entity.Layer)
				if (context) {
					entity.Draw(context, camera)
				}
			} catch (err) {
				console.error('Error drawing entity:', err)
			}
		})
	}
}
