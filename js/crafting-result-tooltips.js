/**
 * Crafting Result Tooltips
 *
 * This file enhances the crafting result items to show tooltips.
 */

console.log('Loading crafting-result-tooltips.js')

;(function () {
	// Wait for DOM to be fully loaded
	if (document.readyState !== 'complete') {
		window.addEventListener('load', initCraftingResultTooltips)
	} else {
		initCraftingResultTooltips()
	}

	function initCraftingResultTooltips() {
		// Set up a MutationObserver to watch for changes in the crafting UI
		const observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				if (mutation.addedNodes.length) {
					// Check for the crafting result element
					const craftResult = document.querySelector('.craft-result')
					if (craftResult) {
						// Get the item display inside
						const resultItemDisplay = craftResult.querySelector('.item-display')
						if (resultItemDisplay && !resultItemDisplay._hasTooltip) {
							console.log('Adding tooltip handler to crafting result item')

							// Add data attributes if they don't exist
							if (
								!resultItemDisplay.dataset.itemType &&
								craftResult.dataset.resultType
							) {
								resultItemDisplay.dataset.itemType =
									craftResult.dataset.resultType
							}

							if (
								!resultItemDisplay.dataset.count &&
								craftResult.dataset.resultCount
							) {
								resultItemDisplay.dataset.count =
									craftResult.dataset.resultCount
							}

							// If window.attachItemHandlers exists (from inventory-tooltips.js)
							if (window.attachItemHandlers) {
								window.attachItemHandlers(resultItemDisplay)
							}
						}
					}
				}
			})
		})

		// Start observing the document body for crafting UI changes
		observer.observe(document.body, { childList: true, subtree: true })

		console.log('Crafting result tooltips initialized')
	}
})()
