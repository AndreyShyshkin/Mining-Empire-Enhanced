// Fix torch crafting recipes
console.log('Loading torch-crafting-fix.js')
;(function () {
	// Make sure torch recipes are properly registered in the UI

	// Check if crafting system is loaded
	if (typeof window.CraftingSystem !== 'function') {
		console.error('CraftingSystem not defined!')
		return
	}

	// Ensure torch recipes are properly defined
	const torchRecipes = (window.CRAFTING_RECIPES || []).filter(recipe => {
		return recipe.result && recipe.result.itemType === window.BLOCK_TYPES.TORCH
	})

	if (torchRecipes.length === 0) {
		console.log('No torch recipes found, adding them now')

		// Add torch recipes if they don't exist
		window.CRAFTING_RECIPES = window.CRAFTING_RECIPES || []

		// Basic wood-only torch recipe (for beginners)
		window.CRAFTING_RECIPES.push({
			result: { itemType: window.BLOCK_TYPES.TORCH, count: 4 },
			ingredients: [{ itemType: window.BLOCK_TYPES.WOOD, count: 1 }],
			station: window.CRAFTING_STATIONS.NONE,
		})

		// Wood + Coal torch recipe (better yield)
		window.CRAFTING_RECIPES.push({
			result: { itemType: window.BLOCK_TYPES.TORCH, count: 16 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.WOOD, count: 1 },
				{ itemType: window.BLOCK_TYPES.COAL_ORE, count: 1 },
			],
			station: window.CRAFTING_STATIONS.NONE,
		})

		// Wood + Gel torch recipe (alternative)
		window.CRAFTING_RECIPES.push({
			result: { itemType: window.BLOCK_TYPES.TORCH, count: 16 },
			ingredients: [
				{ itemType: window.BLOCK_TYPES.WOOD, count: 1 },
				{ itemType: window.BLOCK_TYPES.GEL, count: 1 },
			],
			station: window.CRAFTING_STATIONS.NONE,
		})

		console.log('Added torch recipes:', torchRecipes.length)
	} else {
		console.log('Found existing torch recipes:', torchRecipes.length)
	}

	// Fix torch properties to ensure they emit light properly
	if (window.BLOCKS && window.BLOCKS[window.BLOCK_TYPES.TORCH]) {
		window.BLOCKS[window.BLOCK_TYPES.TORCH].lightEmission = 4 // Ensure torches emit light
		window.BLOCKS[window.BLOCK_TYPES.TORCH].hardness = 1 // Make them easy to break
		window.BLOCKS[window.BLOCK_TYPES.TORCH].solid = false // Can walk through torches
		window.BLOCKS[window.BLOCK_TYPES.TORCH].breakable = true // Can break them

		console.log('Updated torch block properties')
	}

	// Force refresh recipes in any existing crafting UI
	if (
		window.refreshCraftingUI &&
		typeof window.refreshCraftingUI === 'function'
	) {
		window.refreshCraftingUI()
		console.log('Refreshed crafting UI')
	}

	console.log('Torch recipe fix complete')
})()
