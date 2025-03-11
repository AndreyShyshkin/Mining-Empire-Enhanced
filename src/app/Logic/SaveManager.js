import { Player } from '../Entities/Player'
import { Vector2 } from '../Math/Vector2'
import resurse from './inventory'
import { SceneManager } from './SceneManager'
import { WorldManager } from './WorldManager'

export class SaveManager {
	static SAVES_KEY = 'mining-empire-worlds' // Key for the index of all saves
	static CURRENT_WORLD_KEY = 'mining-empire-current-world' // Key for current world
	static AUTO_SAVE_INTERVAL = 60000 // Auto-save every minute
	static isAutoSaveEnabled = true
	static autoSaveTimer = null
	static currentWorldId = null

	/**
	 * Start auto-saving the current world
	 */
	static startAutoSave() {
		if (this.isAutoSaveEnabled && !this.autoSaveTimer) {
			this.autoSaveTimer = setInterval(() => {
				this.saveGame()
				this.showNotification('Game auto-saved')
			}, this.AUTO_SAVE_INTERVAL)
		}
	}

	/**
	 * Stop auto-saving
	 */
	static stopAutoSave() {
		if (this.autoSaveTimer) {
			clearInterval(this.autoSaveTimer)
			this.autoSaveTimer = null
		}
	}

	/**
	 * Toggle auto-save functionality
	 */
	static toggleAutoSave() {
		this.isAutoSaveEnabled = !this.isAutoSaveEnabled
		if (this.isAutoSaveEnabled) {
			this.startAutoSave()
			return true
		} else {
			this.stopAutoSave()
			return false
		}
	}

	/**
	 * Create a new world with the given name and seed
	 */
	static createNewWorld(worldName, seed = null) {
		try {
			// Generate a unique ID for this world
			const worldId =
				Date.now().toString(36) + Math.random().toString(36).slice(2)

			// Set up world manager with seed
			const worldManager = WorldManager.getInstance()
			if (seed) {
				worldManager.worldSeed = Number(seed)
				worldManager.seedGenerator.setSeed(Number(seed))
			} else {
				worldManager.newWorld()
			}

			// Create the initial world data
			const worldData = {
				id: worldId,
				name: worldName || `World ${worldId.substr(0, 5)}`,
				seed: worldManager.worldSeed,
				resources: {
					money: 0,
					res1: 0,
					res2: 0,
					res3: 0,
					res4: 0,
					res5: 0,
					res6: 0,
					lvlPick: 1,
				},
				player: {
					position: {
						x: 920,
						y: 500,
					},
					currentScene: 'town',
					damage: 1,
				},
				world: worldManager.getWorldData(),
				created: Date.now(),
				lastPlayed: Date.now(),
			}

			// Save this world in our worlds collection
			const worlds = this.getAllWorlds()
			worlds[worldId] = worldData
			localStorage.setItem(this.SAVES_KEY, JSON.stringify(worlds))

			// Set as current world
			this.currentWorldId = worldId
			localStorage.setItem(this.CURRENT_WORLD_KEY, worldId)

			console.log(
				`Created new world: ${worldName} (ID: ${worldId}, Seed: ${worldManager.worldSeed})`
			)
			return worldData
		} catch (error) {
			console.error('Failed to create new world:', error)
			return null
		}
	}

	/**
	 * Save the current game state to the current world
	 */
	static saveGame() {
		try {
			// Don't save if no world is loaded
			if (!this.currentWorldId) {
				console.warn('No world is currently loaded, nothing to save')
				return false
			}

			console.log('Saving game to world ID:', this.currentWorldId)
			const worldManager = WorldManager.getInstance()

			// Get all worlds
			const worlds = this.getAllWorlds()

			// Get current world data or initialize if not found
			const worldData = worlds[this.currentWorldId] || {
				id: this.currentWorldId,
				name: `World ${this.currentWorldId.substr(0, 5)}`,
				seed: worldManager.worldSeed,
				created: Date.now(),
			}

			// Update the world data
			worldData.resources = {
				money: resurse.money,
				res1: resurse.res1,
				res2: resurse.res2,
				res3: resurse.res3,
				res4: resurse.res4,
				res5: resurse.res5,
				res6: resurse.res6,
				lvlPick: resurse.lvlPick || 1,
			}

			worldData.player = {
				position: {
					x: Player.Instance.transform.Position.X,
					y: Player.Instance.transform.Position.Y,
				},
				currentScene: SceneManager.Instance.currentSceneType,
				damage: Player.Instance.damage,
			}

			worldData.world = worldManager.getWorldData()
			worldData.lastPlayed = Date.now()

			// Save back to storage
			worlds[this.currentWorldId] = worldData
			localStorage.setItem(this.SAVES_KEY, JSON.stringify(worlds))

			console.log(`World "${worldData.name}" saved successfully`)
			return true
		} catch (error) {
			console.error('Failed to save game:', error)
			return false
		}
	}

	/**
	 * Load a specific world by ID
	 */
	static loadWorld(worldId) {
		try {
			console.log('Loading world with ID:', worldId)

			// Get all worlds
			const worlds = this.getAllWorlds()

			// Check if world exists
			if (!worlds[worldId]) {
				console.error('World not found:', worldId)
				return false
			}

			const worldData = worlds[worldId]

			// Reset scene state first to ensure clean world regeneration
			SceneManager.Instance.resetSceneState()

			// Load world data BEFORE scene switching (critical order)
			if (worldData.world) {
				const worldManager = WorldManager.getInstance()
				worldManager.loadWorld(worldData.world)

				// Explicitly verify broken blocks were loaded
				const loadedBlockCount = Object.keys(
					worldManager.worldChanges.brokenBlocks || {}
				).length
				console.log(`Loaded world with ${loadedBlockCount} broken blocks`)
			}

			// Load resources
			if (worldData.resources) {
				resurse.money = worldData.resources.money || 0
				resurse.res1 = worldData.resources.res1 || 0
				resurse.res2 = worldData.resources.res2 || 0
				resurse.res3 = worldData.resources.res3 || 0
				resurse.res4 = worldData.resources.res4 || 0
				resurse.res5 = worldData.resources.res5 || 0
				resurse.res6 = worldData.resources.res6 || 0
				resurse.lvlPick = worldData.resources.lvlPick || 1
			}

			// Switch to the correct scene
			if (worldData.player && worldData.player.currentScene) {
				if (worldData.player.currentScene === 'town') {
					console.log('Setting scene to town')
					SceneManager.Instance.SetScene(SceneManager.Instance.town)
				} else if (worldData.player.currentScene === 'mine') {
					console.log('Setting scene to mine')
					// SetScene will call cave() with the loaded seed
					SceneManager.Instance.SetScene(SceneManager.Instance.mine)
				}
			}

			// Debug the world state after loading to confirm all changes were applied
			WorldManager.getInstance().debugWorldState()

			// Load player position and attributes
			if (worldData.player) {
				if (worldData.player.position) {
					console.log('Setting player position to:', worldData.player.position)
					Player.Instance.transform.Position = new Vector2(
						worldData.player.position.x,
						worldData.player.position.y
					)
				}

				if (worldData.player.damage) {
					Player.Instance.damage = worldData.player.damage
				}
			}

			// Update last played timestamp
			worldData.lastPlayed = Date.now()
			worlds[worldId] = worldData
			localStorage.setItem(this.SAVES_KEY, JSON.stringify(worlds))

			// Set as current world
			this.currentWorldId = worldId
			localStorage.setItem(this.CURRENT_WORLD_KEY, worldId)

			console.log('Game load complete')
			return true
		} catch (error) {
			console.error('Failed to load game:', error)
			return false
		}
	}

	/**
	 * Get all saved worlds
	 */
	static getAllWorlds() {
		try {
			const worlds = JSON.parse(localStorage.getItem(this.SAVES_KEY)) || {}
			return worlds
		} catch (error) {
			console.error('Failed to get saved worlds:', error)
			return {}
		}
	}

	/**
	 * Check if there are any saved worlds
	 */
	static hasSavedWorlds() {
		return Object.keys(this.getAllWorlds()).length > 0
	}

	/**
	 * Delete a specific world by ID
	 */
	static deleteWorld(worldId) {
		try {
			// Get all worlds
			const worlds = this.getAllWorlds()

			// Check if world exists
			if (!worlds[worldId]) {
				console.warn('World not found:', worldId)
				return false
			}

			// Remove the world
			const worldName = worlds[worldId].name
			delete worlds[worldId]
			localStorage.setItem(this.SAVES_KEY, JSON.stringify(worlds))

			// If current world was deleted, clear current world ID
			if (this.currentWorldId === worldId) {
				this.currentWorldId = null
				localStorage.removeItem(this.CURRENT_WORLD_KEY)
			}

			console.log(`Deleted world "${worldName}" (ID: ${worldId})`)
			return true
		} catch (error) {
			console.error('Failed to delete world:', error)
			return false
		}
	}

	/**
	 * Get details of a specific world
	 */
	static getWorldDetails(worldId) {
		const worlds = this.getAllWorlds()
		return worlds[worldId] || null
	}

	/**
	 * Get current world ID
	 */
	static getCurrentWorldId() {
		// If already loaded in memory, return it
		if (this.currentWorldId) {
			return this.currentWorldId
		}

		// Otherwise check local storage
		const storedId = localStorage.getItem(this.CURRENT_WORLD_KEY)
		if (storedId && this.getWorldDetails(storedId)) {
			this.currentWorldId = storedId
			return storedId
		}

		return null
	}

	// Generic notification method
	static showNotification(message) {
		const notification = document.querySelector('.notification')
		const notificationText = notification.querySelector('p')

		notificationText.textContent = message
		notification.style.display = 'block'

		setTimeout(() => {
			notification.style.display = 'none'
		}, 3000)
	}
}
