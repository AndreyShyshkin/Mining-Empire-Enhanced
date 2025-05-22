// Connect FixedCraftingSystem to the game
console.log('Loading crafting-connector.js')

// Make the FixedCraftingSystem available globally
window.FixedCraftingSystem = FixedCraftingSystem

// Override or assign the CraftingSystem constructor to use FixedCraftingSystem
window.CraftingSystem = FixedCraftingSystem

// Function to fix the crafting UI for existing players
function fixPlayerCraftingSystem() {
	console.log('Checking if player needs crafting system fix...')

	if (window.player) {
		console.log('Player found, checking crafting system')

		// Check if player has a crafting system but it's the old version
		if (window.player.craftingSystem) {
			console.log(
				'Current crafting system:',
				window.player.craftingSystem.constructor.name
			)

			// If the existing crafting system is not a FixedCraftingSystem
			if (!(window.player.craftingSystem instanceof FixedCraftingSystem)) {
				console.log('Replacing old crafting system with FixedCraftingSystem')

				// Create a new FixedCraftingSystem
				window.player.craftingSystem = new FixedCraftingSystem(window.player)

				// If there's a crafting UI, update its reference to use the new system
				if (window.player.craftingUI) {
					console.log('Updating crafting UI to use new crafting system')
					window.player.craftingUI.craftingSystem = window.player.craftingSystem
					window.player.craftingUI.player = window.player
				}

				console.log('Crafting system fixed!')
			} else {
				console.log('Player already has FixedCraftingSystem, no fix needed')
			}
		} else {
			console.log('Player has no crafting system, creating one')
			window.player.craftingSystem = new FixedCraftingSystem(window.player)
		}
	} else {
		console.log('No player found, will retry later')
		setTimeout(fixPlayerCraftingSystem, 1000)
	}
}

// Add debug log for crafting button to see if it's working
document.addEventListener('click', function (event) {
	// Only match elements that have EXACTLY the craft-button class and not within quantity controls
	if (
		event.target.className === 'craft-button' &&
		event.target.textContent === 'Craft' &&
		!event.target.closest('.quantity-container') &&
		!event.target.closest('.recipe-item')
	) {
		console.log('Craft button clicked via connector!')
	}
})

// Fix existing player crafting system
// Run after a delay to ensure player is initialized
setTimeout(fixPlayerCraftingSystem, 2000)

// Also check when the game is active (monitor for player changes)
setInterval(fixPlayerCraftingSystem, 10000)

console.log('CraftingSystem connector loaded!')
