// Tool Progression and Crafting Recipes Fix
console.log('Loading tool-progression-fix.js')

// Add missing crafting recipes for tools and make sure they follow a logical progression
;(function () {
	// Define tool progression recipes
	const toolRecipes = [
		// WOODEN TOOLS - No station required
		{
			result: { itemType: window.BLOCK_TYPES.WOODEN_PICKAXE, count: 1 },
			ingredients: [{ itemType: window.BLOCK_TYPES.WOOD, count: 3 }],
			station: window.CRAFTING_STATIONS.NONE,
		},
		{
			result: { itemType: window.BLOCK_TYPES.WOODEN_AXE, count: 1 },
			ingredients: [{ itemType: window.BLOCK_TYPES.WOOD, count: 3 }],
			station: window.CRAFTING_STATIONS.NONE,
		},

		// STONE TOOLS - Require workbench
		{
			result: { itemType: window.BLOCK_TYPES.STONE_PICKAXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.STONE, count: 3 },
				{ itemType: window.BLOCK_TYPES.WOOD, count: 2 },
			],
			station: window.CRAFTING_STATIONS.WORKBENCH,
		},
		{
			result: { itemType: window.BLOCK_TYPES.STONE_AXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.STONE, count: 3 },
				{ itemType: window.BLOCK_TYPES.WOOD, count: 2 },
			],
			station: window.CRAFTING_STATIONS.WORKBENCH,
		},

		// COPPER TOOLS - Require anvil
		{
			result: { itemType: window.BLOCK_TYPES.COPPER_PICKAXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.COPPER_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.WOOD, count: 2 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},
		{
			result: { itemType: window.BLOCK_TYPES.COPPER_AXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.COPPER_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.WOOD, count: 2 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},

		// IRON TOOLS - Require anvil
		{
			result: { itemType: window.BLOCK_TYPES.IRON_PICKAXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.IRON_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.WOOD, count: 2 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},
		{
			result: { itemType: window.BLOCK_TYPES.IRON_AXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.IRON_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.WOOD, count: 2 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},

		// GOLD TOOLS - Require anvil
		{
			result: { itemType: window.BLOCK_TYPES.GOLD_PICKAXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.GOLD_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.WOOD, count: 2 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},
		{
			result: { itemType: window.BLOCK_TYPES.GOLD_AXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.GOLD_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.WOOD, count: 2 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},

		// DIAMOND TOOLS - Require anvil
		{
			result: { itemType: window.BLOCK_TYPES.DIAMOND_PICKAXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.DIAMOND_ORE, count: 3 },
				{ itemType: window.BLOCK_TYPES.GOLD_BAR, count: 2 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},
		{
			result: { itemType: window.BLOCK_TYPES.DIAMOND_AXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.DIAMOND_ORE, count: 3 },
				{ itemType: window.BLOCK_TYPES.GOLD_BAR, count: 2 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},

		// HIGH-TIER TOOLS

		// TITANIUM TOOLS - Require anvil
		{
			result: { itemType: window.BLOCK_TYPES.TITANIUM_PICKAXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.TITANIUM_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.DIAMOND_ORE, count: 1 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},
		{
			result: { itemType: window.BLOCK_TYPES.TITANIUM_AXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.TITANIUM_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.DIAMOND_ORE, count: 1 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},

		// PLATINUM TOOLS - Require anvil
		{
			result: { itemType: window.BLOCK_TYPES.PLATINUM_PICKAXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.PLATINUM_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.TITANIUM_BAR, count: 1 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},
		{
			result: { itemType: window.BLOCK_TYPES.PLATINUM_AXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.PLATINUM_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.TITANIUM_BAR, count: 1 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},

		// OBSIDIAN TOOLS - Require anvil
		{
			result: { itemType: window.BLOCK_TYPES.OBSIDIAN_PICKAXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.OBSIDIAN_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.PLATINUM_BAR, count: 1 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},
		{
			result: { itemType: window.BLOCK_TYPES.OBSIDIAN_AXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.OBSIDIAN_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.PLATINUM_BAR, count: 1 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},

		// MITHRIL TOOLS - Require anvil (highest tier)
		{
			result: { itemType: window.BLOCK_TYPES.MITHRIL_PICKAXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.MITHRIL_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.OBSIDIAN_BAR, count: 1 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},
		{
			result: { itemType: window.BLOCK_TYPES.MITHRIL_AXE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.MITHRIL_BAR, count: 3 },
				{ itemType: window.BLOCK_TYPES.OBSIDIAN_BAR, count: 1 },
			],
			station: window.CRAFTING_STATIONS.ANVIL,
		},

		// SMELTING RECIPES (FURNACE)

		// ORE TO BAR RECIPES
		{
			result: { itemType: window.BLOCK_TYPES.COPPER_BAR, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.COPPER_ORE, count: 3 },
				{ itemType: window.BLOCK_TYPES.COAL_ORE, count: 1 },
			],
			station: window.CRAFTING_STATIONS.FURNACE,
		},
		{
			result: { itemType: window.BLOCK_TYPES.IRON_BAR, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.IRON_ORE, count: 3 },
				{ itemType: window.BLOCK_TYPES.COAL_ORE, count: 2 },
			],
			station: window.CRAFTING_STATIONS.FURNACE,
		},
		{
			result: { itemType: window.BLOCK_TYPES.GOLD_BAR, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.GOLD_ORE, count: 3 },
				{ itemType: window.BLOCK_TYPES.COAL_ORE, count: 3 },
			],
			station: window.CRAFTING_STATIONS.FURNACE,
		},
		{
			result: { itemType: window.BLOCK_TYPES.TITANIUM_BAR, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.TITANIUM_ORE, count: 3 },
				{ itemType: window.BLOCK_TYPES.COAL_ORE, count: 4 },
			],
			station: window.CRAFTING_STATIONS.FURNACE,
		},
		{
			result: { itemType: window.BLOCK_TYPES.PLATINUM_BAR, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.PLATINUM_ORE, count: 3 },
				{ itemType: window.BLOCK_TYPES.COAL_ORE, count: 5 },
			],
			station: window.CRAFTING_STATIONS.FURNACE,
		},
		{
			result: { itemType: window.BLOCK_TYPES.OBSIDIAN_BAR, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.OBSIDIAN_ORE, count: 3 },
				{ itemType: window.BLOCK_TYPES.COAL_ORE, count: 6 },
			],
			station: window.CRAFTING_STATIONS.FURNACE,
		},
		{
			result: { itemType: window.BLOCK_TYPES.MITHRIL_BAR, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.MITHRIL_ORE, count: 3 },
				{ itemType: window.BLOCK_TYPES.COAL_ORE, count: 8 },
			],
			station: window.CRAFTING_STATIONS.FURNACE,
		},
	]

	// Add crafting stations recipes if they don't exist
	const stationRecipes = [
		// CRAFTING STATIONS
		{
			result: { itemType: window.BLOCK_TYPES.WORKBENCH, count: 1 },
			ingredients: [{ itemType: window.BLOCK_TYPES.WOOD, count: 10 }],
			station: window.CRAFTING_STATIONS.NONE,
		},
		{
			result: { itemType: window.BLOCK_TYPES.FURNACE, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.STONE, count: 20 },
				{ itemType: window.BLOCK_TYPES.COAL_ORE, count: 5 },
			],
			station: window.CRAFTING_STATIONS.WORKBENCH,
		},
		{
			result: { itemType: window.BLOCK_TYPES.ANVIL, count: 1 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.IRON_BAR, count: 5 },
				{ itemType: window.BLOCK_TYPES.STONE, count: 10 },
			],
			station: window.CRAFTING_STATIONS.WORKBENCH,
		},
	]

	// Function to add recipes if they don't exist
	function addMissingRecipes(recipesToAdd) {
		if (!window.CRAFTING_RECIPES) {
			console.error('CRAFTING_RECIPES is not defined!')
			return
		}

		let addedCount = 0

		recipesToAdd.forEach(newRecipe => {
			// Check if this recipe already exists
			const exists = window.CRAFTING_RECIPES.some(existingRecipe => {
				return existingRecipe.result.itemType === newRecipe.result.itemType
			})

			if (!exists) {
				window.CRAFTING_RECIPES.push(newRecipe)
				addedCount++
			}
		})

		console.log(`Added ${addedCount} new crafting recipes`)
	}

	// Add all recipes
	addMissingRecipes(stationRecipes)
	addMissingRecipes(toolRecipes)
})()

console.log('Tool progression system loaded successfully!')
