// Tool spawner for testing
console.log('Loading tool-spawner.js')

// Create a tool spawner UI
;(function () {
	let isSpawnerVisible = false
	let spawnerElement = null

	// Tool categories we want to offer
	const toolCategories = {
		Pickaxes: Object.entries(window.BLOCKS || {})
			.filter(([_, block]) => block.toolType === 'pickaxe')
			.map(([id]) => parseInt(id)),

		Axes: Object.entries(window.BLOCKS || {})
			.filter(([_, block]) => block.toolType === 'axe')
			.map(([id]) => parseInt(id)),

		Materials: [
			window.BLOCK_TYPES.WOOD,
			window.BLOCK_TYPES.STONE,
			window.BLOCK_TYPES.COAL_ORE,
			window.BLOCK_TYPES.COPPER_ORE,
			window.BLOCK_TYPES.IRON_ORE,
			window.BLOCK_TYPES.GOLD_ORE,
			window.BLOCK_TYPES.DIAMOND_ORE,
			window.BLOCK_TYPES.RUBY_ORE,
			window.BLOCK_TYPES.SAPPHIRE_ORE,
			window.BLOCK_TYPES.EMERALD_ORE,
			window.BLOCK_TYPES.TITANIUM_ORE,
			window.BLOCK_TYPES.PLATINUM_ORE,
			window.BLOCK_TYPES.OBSIDIAN_ORE,
			window.BLOCK_TYPES.MITHRIL_ORE,
		],

		Bars: [
			window.BLOCK_TYPES.COPPER_BAR,
			window.BLOCK_TYPES.IRON_BAR,
			window.BLOCK_TYPES.GOLD_BAR,
			window.BLOCK_TYPES.TITANIUM_BAR,
			window.BLOCK_TYPES.PLATINUM_BAR,
			window.BLOCK_TYPES.OBSIDIAN_BAR,
			window.BLOCK_TYPES.MITHRIL_BAR,
		],

		'Crafting Stations': [
			window.BLOCK_TYPES.WORKBENCH,
			window.BLOCK_TYPES.FURNACE,
			window.BLOCK_TYPES.ANVIL,
		],
	}

	// Create spawner UI
	function createSpawnerUI() {
		// Create main container
		spawnerElement = document.createElement('div')
		spawnerElement.id = 'tool-spawner'
		spawnerElement.style.position = 'fixed'
		spawnerElement.style.top = '50%'
		spawnerElement.style.left = '50%'
		spawnerElement.style.transform = 'translate(-50%, -50%)'
		spawnerElement.style.width = '400px'
		spawnerElement.style.maxHeight = '80vh'
		spawnerElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
		spawnerElement.style.color = '#fff'
		spawnerElement.style.borderRadius = '5px'
		spawnerElement.style.padding = '15px'
		spawnerElement.style.fontFamily = 'Arial, sans-serif'
		spawnerElement.style.fontSize = '14px'
		spawnerElement.style.zIndex = '1001'
		spawnerElement.style.display = 'none'
		spawnerElement.style.overflowY = 'auto'

		// Create header
		const header = document.createElement('div')
		header.style.display = 'flex'
		header.style.justifyContent = 'space-between'
		header.style.alignItems = 'center'
		header.style.marginBottom = '15px'
		header.style.borderBottom = '1px solid #666'
		header.style.paddingBottom = '10px'

		const title = document.createElement('h2')
		title.textContent = 'Tool Spawner'
		title.style.margin = '0'
		title.style.fontSize = '18px'
		title.style.color = '#4CAF50'

		const closeButton = document.createElement('button')
		closeButton.textContent = 'X'
		closeButton.style.backgroundColor = '#f44336'
		closeButton.style.color = 'white'
		closeButton.style.border = 'none'
		closeButton.style.borderRadius = '3px'
		closeButton.style.width = '25px'
		closeButton.style.height = '25px'
		closeButton.style.cursor = 'pointer'
		closeButton.style.fontSize = '14px'
		closeButton.style.fontWeight = 'bold'
		closeButton.addEventListener('click', toggleSpawner)

		header.appendChild(title)
		header.appendChild(closeButton)
		spawnerElement.appendChild(header)

		// Add description
		const description = document.createElement('p')
		description.textContent =
			'Click on an item to add it to your inventory. Use this to test tool progression.'
		description.style.marginBottom = '15px'
		description.style.color = '#ccc'
		spawnerElement.appendChild(description)

		// Create category tabs
		const categoriesContainer = document.createElement('div')
		categoriesContainer.style.display = 'flex'
		categoriesContainer.style.marginBottom = '10px'
		categoriesContainer.style.overflowX = 'auto'
		categoriesContainer.style.padding = '5px 0'

		const itemsContainer = document.createElement('div')
		itemsContainer.id = 'spawner-items'

		let isFirstTab = true

		// Create a tab for each category
		Object.keys(toolCategories).forEach(category => {
			const tab = document.createElement('div')
			tab.className = 'spawner-tab'
			tab.textContent = category
			tab.dataset.category = category
			tab.style.padding = '8px 12px'
			tab.style.marginRight = '5px'
			tab.style.borderRadius = '3px 3px 0 0'
			tab.style.cursor = 'pointer'
			tab.style.backgroundColor = isFirstTab ? '#4CAF50' : '#555'
			tab.style.color = '#fff'
			tab.style.whiteSpace = 'nowrap'

			tab.addEventListener('click', () => {
				// Deactivate all tabs
				document.querySelectorAll('.spawner-tab').forEach(t => {
					t.style.backgroundColor = '#555'
				})

				// Activate this tab
				tab.style.backgroundColor = '#4CAF50'

				// Show this category's items
				showCategoryItems(category)
			})

			categoriesContainer.appendChild(tab)

			if (isFirstTab) {
				// Show first category items by default
				setTimeout(() => showCategoryItems(category), 0)
				isFirstTab = false
			}
		})

		spawnerElement.appendChild(categoriesContainer)
		spawnerElement.appendChild(itemsContainer)

		// Add to document
		document.body.appendChild(spawnerElement)
	}

	// Show items for a specific category
	function showCategoryItems(category) {
		const container = document.getElementById('spawner-items')
		if (!container) return

		// Clear current items
		container.innerHTML = ''

		// Style for the items container
		container.style.display = 'grid'
		container.style.gridTemplateColumns =
			'repeat(auto-fill, minmax(120px, 1fr))'
		container.style.gap = '10px'
		container.style.padding = '10px'
		container.style.backgroundColor = '#333'
		container.style.borderRadius = '0 5px 5px 5px'

		const items = toolCategories[category] || []

		if (items.length === 0) {
			const emptyMsg = document.createElement('div')
			emptyMsg.textContent = 'No items in this category'
			emptyMsg.style.gridColumn = '1 / -1'
			emptyMsg.style.textAlign = 'center'
			emptyMsg.style.padding = '20px'
			emptyMsg.style.color = '#999'
			container.appendChild(emptyMsg)
			return
		}

		// Create a button for each item in the category
		items.forEach(itemType => {
			if (typeof window.BLOCKS !== 'object' || !window.BLOCKS[itemType]) {
				return // Skip if item doesn't exist
			}

			const item = window.BLOCKS[itemType]

			const itemButton = document.createElement('div')
			itemButton.className = 'item-button'
			itemButton.style.backgroundColor = '#444'
			itemButton.style.borderRadius = '5px'
			itemButton.style.padding = '8px'
			itemButton.style.display = 'flex'
			itemButton.style.flexDirection = 'column'
			itemButton.style.alignItems = 'center'
			itemButton.style.cursor = 'pointer'
			itemButton.style.transition = 'transform 0.1s'

			// Item icon
			const itemIcon = document.createElement('div')
			itemIcon.style.width = '32px'
			itemIcon.style.height = '32px'
			itemIcon.style.backgroundColor = item.texture || '#999'
			itemIcon.style.marginBottom = '5px'
			itemIcon.style.border = '1px solid #666'

			// Item name
			const itemName = document.createElement('div')
			itemName.textContent = item.name
			itemName.style.fontSize = '12px'
			itemName.style.textAlign = 'center'
			itemName.style.wordBreak = 'break-word'

			// Append to button
			itemButton.appendChild(itemIcon)
			itemButton.appendChild(itemName)

			// Add hover effect
			itemButton.addEventListener('mouseover', () => {
				itemButton.style.transform = 'scale(1.05)'
				itemButton.style.backgroundColor = '#555'
			})

			itemButton.addEventListener('mouseout', () => {
				itemButton.style.transform = 'scale(1)'
				itemButton.style.backgroundColor = '#444'
			})

			// Add click handler
			itemButton.addEventListener('click', () => {
				spawnItem(itemType)
			})

			container.appendChild(itemButton)
		})
	}

	// Toggle spawner visibility
	function toggleSpawner() {
		isSpawnerVisible = !isSpawnerVisible
		if (spawnerElement) {
			spawnerElement.style.display = isSpawnerVisible ? 'block' : 'none'
		}
	}

	// Spawn an item in the player's inventory
	function spawnItem(itemType) {
		if (!window.game || !window.game.player || !window.game.player.inventory) {
			console.error('Cannot spawn item: player or inventory not found')
			return false
		}

		try {
			// Add 10 of the item to inventory
			window.game.player.inventory.addItem(itemType, 10)

			const itemName = window.BLOCKS[itemType]?.name || `Item #${itemType}`
			console.log(`Spawned 10x ${itemName} in inventory`)

			if (window.gameMonitor) {
				window.gameMonitor.success(`Added 10x ${itemName} to inventory`)
			}

			return true
		} catch (err) {
			console.error('Error spawning item:', err)
			return false
		}
	}

	// Initialize when document is ready
	document.addEventListener('DOMContentLoaded', function () {
		// Wait a moment for the game to initialize
		setTimeout(() => {
			createSpawnerUI()

			// Add keyboard shortcut to toggle spawner
			document.addEventListener('keydown', function (e) {
				// Alt+T to toggle tool spawner
				if (e.altKey && e.key === 't') {
					toggleSpawner()
				}
			})

			console.log('Tool spawner initialized. Press Alt+T to open.')
			if (window.gameMonitor) {
				window.gameMonitor.log('Tool spawner ready. Press Alt+T to open.')
			}
		}, 2000)
	})
})()
