// Fixes for crafting click handlers
console.log('Loading crafting-click-fix.js')

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
	// Apply a fix to ensure only the craft button triggers crafting
	setTimeout(function () {
		console.log('Applying crafting click fixes...')

		// Find all click handlers in the document
		const clickHandlers = []

		// Function to safely check if an element is the craft button
		function isCraftButton(element) {
			return (
				element &&
				element.classList &&
				element.classList.contains('craft-button') &&
				!element.closest('.quantity-container') &&
				!element.closest('.recipe-item')
			)
		}

		// Find the crafting UI element
		const craftingUI = document.querySelector('.crafting-ui')
		if (craftingUI) {
			// Add a click handler to the crafting UI to prevent clicks from bubbling up
			// if they aren't on the craft button
			craftingUI.addEventListener('click', function (event) {
				// If the click is not directly on the craft button, prevent it from bubbling up
				if (!isCraftButton(event.target)) {
					event.stopPropagation()
				}
			})

			// Find the craft button and ensure it has a proper click handler
			const craftButton = craftingUI.querySelector('.craft-button')
			if (craftButton) {
				// Make sure the craft button's click events bubble up
				craftButton.addEventListener('click', function (event) {
					console.log('Craft button clicked with explicit handler')
					// Let it bubble to be captured by other handlers
				})
			}
		}

		console.log('Crafting click fixes applied.')
	}, 2000) // Wait 2 seconds to ensure other scripts have loaded
})

console.log('Crafting click fix loaded')
