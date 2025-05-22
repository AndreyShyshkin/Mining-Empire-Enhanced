// Complete rewrite of the CraftingSystem implementation
console.log('Loading crafting-system-fix.js')

// First, ensure that all required globals are defined
if (typeof window.BLOCK_TYPES === 'undefined') {
	console.error('BLOCK_TYPES is not defined! Creating empty object as fallback')
	window.BLOCK_TYPES = {}
}

if (typeof window.BLOCKS === 'undefined') {
	console.error('BLOCKS is not defined! Creating empty object as fallback')
	window.BLOCKS = {}
}

if (typeof window.BLOCK_SIZE === 'undefined') {
	console.warn('BLOCK_SIZE is not defined! Setting to default value 32')
	window.BLOCK_SIZE = 32
}

// Make sure CRAFTING_STATIONS is defined
window.CRAFTING_STATIONS = window.CRAFTING_STATIONS || {
	NONE: 0,
	WORKBENCH: 1,
	FURNACE: 2,
	ANVIL: 3,
}

// Make sure CRAFTING_RECIPES is defined
window.CRAFTING_RECIPES = window.CRAFTING_RECIPES || []

if (window.CRAFTING_RECIPES.length === 0) {
	console.warn('CRAFTING_RECIPES is empty! Adding basic fallback recipes')

	// Add some basic recipes as fallback
	if (window.BLOCK_TYPES.WOOD && window.BLOCK_TYPES.TORCH) {
		window.CRAFTING_RECIPES.push({
			result: { itemType: window.BLOCK_TYPES.TORCH, count: 4 },
			ingredients: [{ itemType: window.BLOCK_TYPES.WOOD, count: 1 }],
			station: window.CRAFTING_STATIONS.NONE,
		})
	}
}

// Define or redefine CraftingSystem
function FixedCraftingSystem(player) {
	this.player = player
	this.availableStations = new Set([window.CRAFTING_STATIONS.NONE])
	this.recipes = window.CRAFTING_RECIPES
	this.nearbyStations = new Set([window.CRAFTING_STATIONS.NONE])

	console.log('FixedCraftingSystem initialized with player:', player)
	console.log('Recipes count:', this.recipes.length)
}

// Define all required methods
FixedCraftingSystem.prototype.updateNearbyCraftingStations = function () {
	console.log('FixedCraftingSystem.updateNearbyCraftingStations called')
	this.scanForCraftingStations()
}

FixedCraftingSystem.prototype.scanForCraftingStations = function () {
	console.log('FixedCraftingSystem.scanForCraftingStations called')

	// Reset available stations except NONE which is always available
	this.availableStations = new Set([window.CRAFTING_STATIONS.NONE])

	if (!this.player || !this.player.world) {
		console.warn('Player or world not available for scanning stations')
		return
	}

	console.log('Scanning for crafting stations around player')

	// Scan around the player for crafting stations
	const playerTileX = Math.floor(this.player.x / window.BLOCK_SIZE)
	const playerTileY = Math.floor(this.player.y / window.BLOCK_SIZE)
	const scanRange = 5 // Blocks away from player

	console.log(`Player position: ${playerTileX}, ${playerTileY}`)

	try {
		for (let x = playerTileX - scanRange; x <= playerTileX + scanRange; x++) {
			for (let y = playerTileY - scanRange; y <= playerTileY + scanRange; y++) {
				if (
					x < 0 ||
					y < 0 ||
					x >= this.player.world.width ||
					y >= this.player.world.height
				) {
					continue
				}

				const blockType = this.player.world.getTile(x, y)

				// Debug info for non-air blocks
				if (blockType !== window.BLOCK_TYPES.AIR && blockType !== 0) {
					console.log(`Found block at ${x},${y}: ${blockType}`)
				}

				// Check for crafting stations
				if (blockType === window.BLOCK_TYPES.WORKBENCH) {
					console.log('Found workbench!')
					this.availableStations.add(window.CRAFTING_STATIONS.WORKBENCH)
				} else if (blockType === window.BLOCK_TYPES.FURNACE) {
					console.log('Found furnace!')
					this.availableStations.add(window.CRAFTING_STATIONS.FURNACE)
				} else if (blockType === window.BLOCK_TYPES.ANVIL) {
					console.log('Found anvil!')
					this.availableStations.add(window.CRAFTING_STATIONS.ANVIL)
				}
			}
		}

		console.log(
			'Available stations:',
			Array.from(this.availableStations).map(station => {
				switch (station) {
					case window.CRAFTING_STATIONS.NONE:
						return 'Basic'
					case window.CRAFTING_STATIONS.WORKBENCH:
						return 'Workbench'
					case window.CRAFTING_STATIONS.FURNACE:
						return 'Furnace'
					case window.CRAFTING_STATIONS.ANVIL:
						return 'Anvil'
					default:
						return 'Unknown'
				}
			})
		)
	} catch (error) {
		console.error('Error scanning for crafting stations:', error)
	}
}

FixedCraftingSystem.prototype.hasIngredients = function (recipe) {
	console.log('FixedCraftingSystem.hasIngredients called')

	if (!this.player || !this.player.inventory) {
		console.warn('Player or inventory not available to check ingredients')
		return false
	}

	// Check each ingredient
	for (const ingredient of recipe.ingredients) {
		if (!this.player.inventory.hasItem(ingredient.itemType, ingredient.count)) {
			return false
		}
	}

	return true
}

FixedCraftingSystem.prototype.hasRequiredStation = function (recipe) {
	console.log('FixedCraftingSystem.hasRequiredStation called')

	// No station needed
	if (recipe.station === window.CRAFTING_STATIONS.NONE) {
		return true
	}

	// Check if the required station is available
	return this.availableStations.has(recipe.station)
}

FixedCraftingSystem.prototype.canCraft = function (recipe) {
	console.log('FixedCraftingSystem.canCraft called')
	return this.hasIngredients(recipe) && this.hasRequiredStation(recipe)
}

FixedCraftingSystem.prototype.getAvailableRecipes = function () {
	console.log('FixedCraftingSystem.getAvailableRecipes called')

	if (!this.recipes || !Array.isArray(this.recipes)) {
		console.error('Recipes is not an array:', this.recipes)
		return []
	}

	try {
		// Get all recipes and check which ones can be crafted
		return this.recipes.map(recipe => {
			const hasStation = this.hasRequiredStation(recipe)
			const hasIngredients = this.hasIngredients(recipe)

			return {
				...recipe,
				hasStation: hasStation,
				hasIngredients: hasIngredients,
				canCraft: hasStation && hasIngredients,
			}
		})
	} catch (error) {
		console.error('Error getting available recipes:', error)
		return []
	}
}

FixedCraftingSystem.prototype.craftItem = function (recipeIndex, quantity = 1) {
	console.log(
		'FixedCraftingSystem.craftItem called with index:',
		recipeIndex,
		'quantity:',
		quantity
	)

	// Validate recipe index
	if (
		recipeIndex < 0 ||
		recipeIndex >= this.recipes.length ||
		!this.player ||
		!this.player.inventory
	) {
		console.log('Invalid recipe index or missing player/inventory')
		this.showCraftingMessage('Error: Unable to craft item')
		return false
	}

	const recipe = this.recipes[recipeIndex]
	console.log('Attempting to craft recipe:', recipe)

	// Check if we can craft this recipe
	if (!this.canCraft(recipe)) {
		console.log('Cannot craft this recipe')

		// Check why we can't craft it
		if (!this.hasIngredients(recipe)) {
			this.showCraftingMessage('Missing ingredients for this recipe')
		} else if (!this.hasRequiredStation(recipe)) {
			let stationName = 'Unknown Station'
			if (recipe.station === window.CRAFTING_STATIONS.WORKBENCH) {
				stationName = 'Workbench'
			} else if (recipe.station === window.CRAFTING_STATIONS.FURNACE) {
				stationName = 'Furnace'
			} else if (recipe.station === window.CRAFTING_STATIONS.ANVIL) {
				stationName = 'Anvil'
			}
			this.showCraftingMessage(`Need to be near a ${stationName}`)
		} else {
			this.showCraftingMessage('Cannot craft this item')
		}
		return false
	}

	// Ensure quantity is valid and at least 1
	quantity = Math.max(1, parseInt(quantity) || 1)
	console.log(`Using quantity: ${quantity}`)

	// Calculate maximum craftable quantity based on available ingredients
	let maxCraftable = Infinity
	recipe.ingredients.forEach(ingredient => {
		const availableCount = this.player.inventory.getItemCount(
			ingredient.itemType
		)
		const possibleCrafts = Math.floor(availableCount / ingredient.count)
		maxCraftable = Math.min(maxCraftable, possibleCrafts)
	})

	console.log(`Max craftable items: ${maxCraftable}`)

	// Limit quantity to what's possible
	if (quantity > maxCraftable) {
		quantity = maxCraftable
		this.showCraftingMessage(`Only able to craft ${quantity} items`, 'warning')
	}

	// If we can't craft any, return false
	if (quantity <= 0) {
		this.showCraftingMessage('Not enough ingredients to craft')
		return false
	}

	try {
		// Remove ingredients from inventory (adjusted for quantity)
		recipe.ingredients.forEach(ingredient => {
			const totalNeeded = ingredient.count * quantity
			console.log(
				`Removing ${totalNeeded}x ${ingredient.itemType} from inventory`
			)
			this.player.inventory.removeItem(ingredient.itemType, totalNeeded)
		})

		// Add crafted item to inventory (adjusted for quantity)
		const totalCrafted = recipe.result.count * quantity
		console.log(
			`Adding ${totalCrafted}x ${recipe.result.itemType} to inventory`
		)
		this.player.inventory.addItem(recipe.result.itemType, totalCrafted)

		const itemName = window.BLOCKS[recipe.result.itemType]
			? window.BLOCKS[recipe.result.itemType].name
			: `Item #${recipe.result.itemType}`

		console.log(`Crafted: ${totalCrafted}x ${itemName}`)
		this.showCraftingMessage(`Crafted: ${totalCrafted}x ${itemName}`, 'success')
		return true
	} catch (error) {
		console.error('Error crafting item:', error)
		this.showCraftingMessage('Error while crafting item')
		return false
	}
}

// Add method to show crafting messages
FixedCraftingSystem.prototype.showCraftingMessage = function (
	message,
	type = 'error'
) {
	console.log(`Crafting message: ${message} (${type})`)

	// Log to game monitor if available
	if (window.gameMonitor) {
		if (type === 'success') {
			window.gameMonitor.success(message)
		} else if (type === 'warning') {
			window.gameMonitor.warn(message)
		} else {
			window.gameMonitor.error(message)
		}
	}

	// Show visual message
	let messageElement = document.getElementById('crafting-message')

	if (!messageElement) {
		messageElement = document.createElement('div')
		messageElement.id = 'crafting-message'
		messageElement.style.position = 'fixed'
		messageElement.style.bottom = '60px'
		messageElement.style.left = '50%'
		messageElement.style.transform = 'translateX(-50%)'
		messageElement.style.padding = '8px 15px'
		messageElement.style.borderRadius = '4px'
		messageElement.style.fontFamily = 'Arial, sans-serif'
		messageElement.style.fontSize = '14px'
		messageElement.style.fontWeight = 'bold'
		messageElement.style.zIndex = '1000'
		messageElement.style.pointerEvents = 'none'
		document.body.appendChild(messageElement)
	}

	// Set style based on message type
	if (type === 'success') {
		messageElement.style.backgroundColor = 'rgba(76, 175, 80, 0.9)'
		messageElement.style.color = 'white'
	} else if (type === 'warning') {
		messageElement.style.backgroundColor = 'rgba(255, 152, 0, 0.9)'
		messageElement.style.color = 'white'
	} else {
		messageElement.style.backgroundColor = 'rgba(244, 67, 54, 0.9)'
		messageElement.style.color = 'white'
	}

	messageElement.textContent = message
	messageElement.style.display = 'block'

	// Clear any existing timeout
	if (this.messageTimeout) {
		clearTimeout(this.messageTimeout)
	}

	// Hide after 3 seconds
	this.messageTimeout = setTimeout(() => {
		messageElement.style.display = 'none'
	}, 3000)
}

// Make the fixed CraftingSystem available globally
window.CraftingSystem = FixedCraftingSystem
console.log('Fixed CraftingSystem has been registered globally')
