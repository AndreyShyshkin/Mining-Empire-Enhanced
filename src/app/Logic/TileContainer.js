export class TileContainer {
	constructor() {
		this.Layers = {}
		this.LoadedLayers = []
		this.tileSize = 100
		this.ViewDistance = 20
		console.log('TileContainer initialized')
	}

	GetLayer(y) {
		// Create the layer if it doesn't exist
		if (!this.Layers[y]) {
			this.Layers[y] = []
		}
		return this.Layers[y]
	}

	GetLayerByPos(y) {
		const layerIndex = Math.floor(y / this.tileSize)
		return this.GetLayer(layerIndex)
	}

	// Update which layers are loaded based on the camera position
	UpdateLoadted(cameraY) {
		this.LoadedLayers = []
		const centerLayer = Math.floor(cameraY / this.tileSize)

		for (let i = -this.ViewDistance; i <= this.ViewDistance; i++) {
			const layerIndex = centerLayer + i
			if (this.Layers[layerIndex]) {
				this.LoadedLayers.push(this.Layers[layerIndex])
			}
		}
	}

	// Clear all layers
	ClearLayers() {
		// Just create a new empty object to avoid any references to old layers
		this.Layers = {}
		this.LoadedLayers = []
		console.log('TileContainer layers cleared')
	}

	// Debug method to count the number of tiles
	countTiles() {
		let total = 0
		let broken = 0
		let solid = 0
		let background = 0

		for (const layerKey in this.Layers) {
			const layer = this.Layers[layerKey]
			total += layer.length

			for (const tile of layer) {
				if (tile.Type === 1) background++ // Assuming 1 is background
				else if (tile.curHp <= 0) broken++
				else solid++
			}
		}

		console.log(
			`TileContainer has ${total} tiles: ${solid} solid, ${broken} broken, ${background} background`
		)
	}
}
