// Inventory synchronization for multiplayer games
// This file handles synchronizing inventory data between players in multiplayer mode

class InventorySyncSystem {
	constructor(multiplayerSystem) {
		this.multiplayerSystem = multiplayerSystem
		this.lastInventorySync = 0
		this.syncInterval = 1000 // Less frequent than position updates
		this.inventoryListener = null
		this.isInitialized = false
	}

	// Initialize the inventory sync system
	initialize() {
		if (this.isInitialized) return

		// Setup inventory change listening when a player joins a multiplayer game
		if (
			this.multiplayerSystem &&
			this.multiplayerSystem.isInMultiplayerGame()
		) {
			this.startListeningForInventoryChanges()
			this.isInitialized = true
			console.log('Inventory sync system initialized')

			// Send an initial inventory snapshot if player exists
			// Give it a small delay to ensure everything is ready
			if (window.player) {
				setTimeout(() => {
					this.sendFullInventorySnapshot(window.player)
				}, 1000)
			}
		}
	}

	// Synchronize current player's inventory to the server
	syncInventory(player) {
		if (
			!this.multiplayerSystem ||
			!this.multiplayerSystem.isInMultiplayerGame() ||
			!this.multiplayerSystem.database ||
			!this.multiplayerSystem.currentGameId ||
			!this.multiplayerSystem.localPlayerId
		) {
			return
		}

		const now = Date.now()

		// Rate limit inventory updates to reduce database traffic
		if (now - this.lastInventorySync < this.syncInterval) {
			return
		}

		this.lastInventorySync = now

		if (player && player.inventory) {
			const inventoryData = player.inventory.getSaveData()

			// Store inventory data in the player's data in Firebase
			const playerRef = window.dbRef(
				this.multiplayerSystem.database,
				`games/${this.multiplayerSystem.currentGameId}/players/${this.multiplayerSystem.localPlayerId}`
			)

			window
				.dbUpdate(playerRef, {
					inventory: inventoryData,
					lastInventoryUpdate: now,
				})
				.catch(error => console.error('Error syncing inventory:', error))
		}
	}

	// Send a complete snapshot of the inventory
	// This is used when making significant changes to ensure full consistency
	sendFullInventorySnapshot(player) {
		if (
			!this.multiplayerSystem ||
			!this.multiplayerSystem.isInMultiplayerGame() ||
			!this.multiplayerSystem.database ||
			!this.multiplayerSystem.currentGameId ||
			!this.multiplayerSystem.localPlayerId ||
			!player ||
			!player.inventory
		) {
			return
		}

		const now = Date.now()
		this.lastInventorySync = now

		// Get complete inventory data
		const inventoryData = player.inventory.getSaveData()

		// Store inventory data with a special flag indicating it's a full sync
		const playerRef = window.dbRef(
			this.multiplayerSystem.database,
			`games/${this.multiplayerSystem.currentGameId}/players/${this.multiplayerSystem.localPlayerId}`
		)

		window
			.dbUpdate(playerRef, {
				inventory: inventoryData,
				lastInventoryUpdate: now,
				isFullInventorySync: true, // Flag to notify it's a complete inventory sync
			})
			.catch(error =>
				console.error('Error sending full inventory snapshot:', error)
			)

		console.log('Sent full inventory snapshot')
	}

	// Start listening for inventory changes from other players
	startListeningForInventoryChanges() {
		if (
			!this.multiplayerSystem ||
			!this.multiplayerSystem.database ||
			!this.multiplayerSystem.currentGameId
		) {
			return
		}

		// We use the same players reference that the multiplayer system uses
		const playersRef = window.dbRef(
			this.multiplayerSystem.database,
			`games/${this.multiplayerSystem.currentGameId}/players`
		)

		// Add a listener specifically for inventory changes
		this.inventoryListener = window.dbOnChildChanged(playersRef, snapshot => {
			if (snapshot.exists()) {
				const playerData = snapshot.val()

				// Skip processing our own inventory updates
				if (playerData.id === this.multiplayerSystem.localPlayerId) {
					return
				}

				// For all other players, we could update their inventory if needed
				// For this version, we'll just log the change since the inventory is
				// typically private per player
				if (playerData.inventory && playerData.lastInventoryUpdate) {
					console.log(`Player ${playerData.id} updated their inventory`)
				}
			}
		})
	}

	// Stop listening for inventory changes
	stopListening() {
		if (
			this.inventoryListener &&
			this.multiplayerSystem &&
			this.multiplayerSystem.database
		) {
			try {
				const playersRef = window.dbRef(
					this.multiplayerSystem.database,
					`games/${this.multiplayerSystem.currentGameId}/players`
				)

				window.dbOff(playersRef, 'child_changed', this.inventoryListener)
				this.inventoryListener = null
				console.log('Stopped listening for inventory changes')
			} catch (error) {
				console.error('Error stopping inventory listener:', error)
			}
		}

		this.isInitialized = false
	}
}

// Create a global instance when the DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
	window.inventorySyncSystem = new InventorySyncSystem(window.multiplayerSystem)
})
