// filepath: /Users/andrewshyshkin/Documents/work/terraria clone/js/crafting.js
// Crafting system for Terraria clone
// Define crafting recipes similar to Terraria

// Recipe format:
// {
//   result: { itemType: BLOCK_TYPES.XXX, count: 1 },
//   ingredients: [
//     { itemType: BLOCK_TYPES.XXX, count: 2 },
//     { itemType: BLOCK_TYPES.XXX, count: 1 },
//   ],
//   station: CRAFTING_STATIONS.XXX (optional - if needed at specific station)
// }

// Crafting stations types - made global for access from blocks.js
window.CRAFTING_STATIONS = {
	NONE: 0, // Can craft anywhere (in inventory)
	WORKBENCH: 1, // Requires workbench
	FURNACE: 2, // Requires furnace
	ANVIL: 3, // Requires anvil
}

// Define all available recipes - made global for access from other files
window.CRAFTING_RECIPES = [
	// Basic recipes (no crafting station required)
	{
		result: { itemType: window.BLOCK_TYPES.WOOD_PLATFORM, count: 2 },
		ingredients: [{ itemType: window.BLOCK_TYPES.WOOD, count: 1 }],
		station: window.CRAFTING_STATIONS.NONE,
	},
	{
		result: { itemType: window.BLOCK_TYPES.TORCH, count: 16 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.WOOD, count: 1 },
			{ itemType: window.BLOCK_TYPES.COAL_ORE, count: 1 },
		],
		station: window.CRAFTING_STATIONS.NONE,
	},
	// Альтернативный рецепт для факела с использованием геля - increased output
	{
		result: { itemType: window.BLOCK_TYPES.TORCH, count: 16 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.WOOD, count: 1 },
			{ itemType: window.BLOCK_TYPES.GEL, count: 1 },
		],
		station: window.CRAFTING_STATIONS.NONE,
	},

	// Add basic torch recipe that only requires wood (for beginners)
	{
		result: { itemType: window.BLOCK_TYPES.TORCH, count: 4 },
		ingredients: [{ itemType: window.BLOCK_TYPES.WOOD, count: 1 }],
		station: window.CRAFTING_STATIONS.NONE,
	},

	// Workbench recipes
	{
		result: { itemType: window.BLOCK_TYPES.WORKBENCH, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.WOOD, count: 10 }],
		station: window.CRAFTING_STATIONS.NONE,
	},
	{
		result: { itemType: window.BLOCK_TYPES.WOODEN_DOOR, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.WOOD, count: 6 }],
		station: window.CRAFTING_STATIONS.WORKBENCH,
	},
	{
		result: { itemType: window.BLOCK_TYPES.CHAIR, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.WOOD, count: 4 }],
		station: window.CRAFTING_STATIONS.WORKBENCH,
	},
	{
		result: { itemType: window.BLOCK_TYPES.TABLE, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.WOOD, count: 8 }],
		station: window.CRAFTING_STATIONS.WORKBENCH,
	},
	// Tool recipes - wooden tools (can be made without crafting station)
	{
		result: { itemType: window.BLOCK_TYPES.WOODEN_PICKAXE, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.WOOD, count: 10 }],
		station: window.CRAFTING_STATIONS.NONE,
	},
	{
		result: { itemType: window.BLOCK_TYPES.WOODEN_AXE, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.WOOD, count: 8 }],
		station: window.CRAFTING_STATIONS.NONE,
	},

	// Stone tools (require workbench)
	{
		result: { itemType: window.BLOCK_TYPES.STONE_PICKAXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.STONE, count: 12 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 5 },
		],
		station: window.CRAFTING_STATIONS.WORKBENCH,
	},
	{
		result: { itemType: window.BLOCK_TYPES.STONE_AXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.STONE, count: 10 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 4 },
		],
		station: window.CRAFTING_STATIONS.WORKBENCH,
	},

	// Furnace recipes
	{
		result: { itemType: window.BLOCK_TYPES.FURNACE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.STONE, count: 20 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 4 },
			{ itemType: window.BLOCK_TYPES.TORCH, count: 3 },
		],
		station: window.CRAFTING_STATIONS.WORKBENCH,
	},
	// Metal smelting recipes
	{
		result: { itemType: window.BLOCK_TYPES.COPPER_BAR, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.COPPER_ORE, count: 3 }],
		station: window.CRAFTING_STATIONS.FURNACE,
	},
	{
		result: { itemType: window.BLOCK_TYPES.IRON_BAR, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.IRON_ORE, count: 4 }],
		station: window.CRAFTING_STATIONS.FURNACE,
	},
	{
		result: { itemType: window.BLOCK_TYPES.GOLD_BAR, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.GOLD_ORE, count: 5 }],
		station: window.CRAFTING_STATIONS.FURNACE,
	},
	{
		result: { itemType: window.BLOCK_TYPES.TITANIUM_BAR, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.TITANIUM_ORE, count: 5 }],
		station: window.CRAFTING_STATIONS.FURNACE,
	},
	{
		result: { itemType: window.BLOCK_TYPES.PLATINUM_BAR, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.PLATINUM_ORE, count: 6 }],
		station: window.CRAFTING_STATIONS.FURNACE,
	},
	{
		result: { itemType: window.BLOCK_TYPES.OBSIDIAN_BAR, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.OBSIDIAN_ORE, count: 6 }],
		station: window.CRAFTING_STATIONS.FURNACE,
	},
	{
		result: { itemType: window.BLOCK_TYPES.MITHRIL_BAR, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.MITHRIL_ORE, count: 7 }],
		station: window.CRAFTING_STATIONS.FURNACE,
	},

	// Anvil recipes
	{
		result: { itemType: window.BLOCK_TYPES.ANVIL, count: 1 },
		ingredients: [{ itemType: window.BLOCK_TYPES.IRON_BAR, count: 5 }],
		station: window.CRAFTING_STATIONS.WORKBENCH,
	},
	{
		result: { itemType: window.BLOCK_TYPES.CHAIN, count: 10 },
		ingredients: [{ itemType: window.BLOCK_TYPES.IRON_BAR, count: 1 }],
		station: window.CRAFTING_STATIONS.ANVIL,
	},

	// Copper Tool Recipes
	{
		result: { itemType: window.BLOCK_TYPES.COPPER_PICKAXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.COPPER_BAR, count: 8 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 3 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},
	{
		result: { itemType: window.BLOCK_TYPES.COPPER_AXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.COPPER_BAR, count: 6 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 3 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},

	// Iron Tool Recipes
	{
		result: { itemType: window.BLOCK_TYPES.IRON_PICKAXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.IRON_BAR, count: 10 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 4 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},
	{
		result: { itemType: window.BLOCK_TYPES.IRON_AXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.IRON_BAR, count: 8 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 3 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},

	// Gold Tool Recipes
	{
		result: { itemType: window.BLOCK_TYPES.GOLD_PICKAXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.GOLD_BAR, count: 12 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 4 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},
	{
		result: { itemType: window.BLOCK_TYPES.GOLD_AXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.GOLD_BAR, count: 9 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 3 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},

	// Diamond Tool Recipes
	{
		result: { itemType: window.BLOCK_TYPES.DIAMOND_PICKAXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.DIAMOND_ORE, count: 8 },
			{ itemType: window.BLOCK_TYPES.IRON_BAR, count: 5 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 4 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},
	{
		result: { itemType: window.BLOCK_TYPES.DIAMOND_AXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.DIAMOND_ORE, count: 6 },
			{ itemType: window.BLOCK_TYPES.IRON_BAR, count: 4 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 3 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},

	// Titanium Tool Recipes
	{
		result: { itemType: window.BLOCK_TYPES.TITANIUM_PICKAXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.TITANIUM_BAR, count: 15 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 5 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},
	{
		result: { itemType: window.BLOCK_TYPES.TITANIUM_AXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.TITANIUM_BAR, count: 12 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 4 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},

	// Platinum Tool Recipes
	{
		result: { itemType: window.BLOCK_TYPES.PLATINUM_PICKAXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.PLATINUM_BAR, count: 18 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 5 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},
	{
		result: { itemType: window.BLOCK_TYPES.PLATINUM_AXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.PLATINUM_BAR, count: 15 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 4 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},

	// Obsidian Tool Recipes
	{
		result: { itemType: window.BLOCK_TYPES.OBSIDIAN_PICKAXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.OBSIDIAN_BAR, count: 20 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 6 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},
	{
		result: { itemType: window.BLOCK_TYPES.OBSIDIAN_AXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.OBSIDIAN_BAR, count: 16 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 5 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},

	// Mithril Tool Recipes
	{
		result: { itemType: window.BLOCK_TYPES.MITHRIL_PICKAXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.MITHRIL_BAR, count: 25 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 6 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},
	{
		result: { itemType: window.BLOCK_TYPES.MITHRIL_AXE, count: 1 },
		ingredients: [
			{ itemType: window.BLOCK_TYPES.MITHRIL_BAR, count: 20 },
			{ itemType: window.BLOCK_TYPES.WOOD, count: 5 },
		],
		station: window.CRAFTING_STATIONS.ANVIL,
	},
]

// Make CraftingSystem available globally
function CraftingSystem(player) {
	this.player = player
	this.availableStations = new Set([window.CRAFTING_STATIONS.NONE]) // Always can craft basic recipes
	this.recipes = window.CRAFTING_RECIPES
	this.nearbyStations = new Set([window.CRAFTING_STATIONS.NONE])
}

// Make CraftingSystem available in the window object
window.CraftingSystem = CraftingSystem

// Define CraftingSystem methods
CraftingSystem.prototype.scanForCraftingStations = function () {
	// Reset available stations except NONE which is always available
	this.availableStations = new Set([window.CRAFTING_STATIONS.NONE])

	if (!this.player || !this.player.world) return

	console.log('Scanning for crafting stations')

	// Scan around the player for crafting stations
	const playerTileX = Math.floor(this.player.x / window.BLOCK_SIZE)
	const playerTileY = Math.floor(this.player.y / window.BLOCK_SIZE)
	const scanRange = 5 // Blocks away from player

	console.log(`Player position: ${playerTileX}, ${playerTileY}`)

	for (let x = playerTileX - scanRange; x <= playerTileX + scanRange; x++) {
		for (let y = playerTileY - scanRange; y <= playerTileY + scanRange; y++) {
			if (
				x < 0 ||
				y < 0 ||
				x >= this.player.world.width ||
				y >= this.player.world.height
			)
				continue

			const blockType = this.player.world.getTile(x, y)

			// Debug info
			if (blockType !== window.BLOCK_TYPES.AIR) {
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
}

// Method to update nearby crafting stations - used by CraftingUI
CraftingSystem.prototype.updateNearbyCraftingStations = function () {
	console.log('updateNearbyCraftingStations called')
	if (typeof this.scanForCraftingStations === 'function') {
		this.scanForCraftingStations()
	} else {
		console.error(
			'Error: scanForCraftingStations not available on this instance'
		)
	}
}

// Check if player has enough of all ingredients for a recipe
CraftingSystem.prototype.hasIngredients = function (recipe) {
	if (!this.player || !this.player.inventory) return false

	// Check each ingredient
	for (const ingredient of recipe.ingredients) {
		if (!this.player.inventory.hasItem(ingredient.itemType, ingredient.count)) {
			return false
		}
	}

	return true
}

// Check if required station is available
CraftingSystem.prototype.hasRequiredStation = function (recipe) {
	// No station needed
	if (recipe.station === window.CRAFTING_STATIONS.NONE) {
		return true
	}

	// Check if the required station is available
	return this.availableStations.has(recipe.station)
}

// Check if player can craft a recipe
CraftingSystem.prototype.canCraft = function (recipe) {
	return this.hasIngredients(recipe) && this.hasRequiredStation(recipe)
}

// Get the count of a specific ingredient in player's inventory
CraftingSystem.prototype.getIngredientCount = function (itemType) {
	let count = 0

	// Iterate through inventory slots
	for (const slot of this.player.inventory.slots) {
		if (slot && slot.itemType === itemType) {
			count += slot.count
		}
	}

	return count
}

// Get available recipes based on player's inventory and nearby crafting stations
CraftingSystem.prototype.getAvailableRecipes = function () {
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
}

// Craft an item by recipe index
CraftingSystem.prototype.craftItem = function (recipeIndex) {
	// Validate recipe index
	if (
		recipeIndex < 0 ||
		recipeIndex >= this.recipes.length ||
		!this.player ||
		!this.player.inventory
	) {
		console.log('Invalid recipe index or missing player/inventory')
		return false
	}

	const recipe = this.recipes[recipeIndex]

	// Check if we can craft this recipe
	if (!this.canCraft(recipe)) {
		console.log('Cannot craft this recipe')
		return false
	}

	// Remove ingredients from inventory
	recipe.ingredients.forEach(ingredient => {
		this.player.inventory.removeItem(ingredient.itemType, ingredient.count)
	})

	// Add crafted item to inventory
	this.player.inventory.addItem(recipe.result.itemType, recipe.result.count)

	console.log(
		`Crafted: ${recipe.result.count}x ${
			window.BLOCKS[recipe.result.itemType].name
		}`
	)
	return true
}

// Make absolutely sure updateNearbyCraftingStations is defined
if (
	typeof CraftingSystem.prototype.updateNearbyCraftingStations !== 'function'
) {
	console.log('Adding updateNearbyCraftingStations method at end of file')
	CraftingSystem.prototype.updateNearbyCraftingStations = function () {
		console.log(
			'updateNearbyCraftingStations called from end of file definition'
		)
		this.scanForCraftingStations()
	}
}
