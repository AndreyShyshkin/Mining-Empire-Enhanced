/**
 * Inventory Tooltips
 *
 * This file adds tooltip functionality to inventory items to show what each item is
 * when the mouse hovers over it.
 */

console.log('██████ Loading inventory-tooltips.js ██████')
;(function () {
	// Create a single tooltip element that will be reused
	const tooltip = document.createElement('div')
	tooltip.className = 'item-tooltip'
	tooltip.style.position = 'absolute'
	tooltip.style.backgroundColor = 'rgba(20, 20, 20, 0.9)'
	tooltip.style.color = 'white'
	tooltip.style.padding = '8px 12px'
	tooltip.style.borderRadius = '5px'
	tooltip.style.fontSize = '14px'
	tooltip.style.pointerEvents = 'none' // So it doesn't interfere with clicks
	tooltip.style.zIndex = '2000' // Much higher than both inventory and crafting UI
	tooltip.style.display = 'none'
	tooltip.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)'
	tooltip.style.border = '1px solid #666'
	tooltip.style.width = 'auto'
	tooltip.style.maxWidth = '220px'
	tooltip.style.transition = 'opacity 0.15s ease-in-out'
	tooltip.style.opacity = '0'
	document.body.appendChild(tooltip)

	console.log('Tooltip element created:', tooltip)

	// Function to get item name from its type
	function getItemName(itemType) {
		// Try to get name from BLOCKS definition
		if (
			window.BLOCKS &&
			window.BLOCKS[itemType] &&
			window.BLOCKS[itemType].name
		) {
			return window.BLOCKS[itemType].name
		}

		// Fallback for items not in BLOCKS
		const blockNames = {
			// Basic blocks (in case BLOCKS is not available)
			0: 'Воздух',
			1: 'Грязь',
			2: 'Камень',
			3: 'Трава',
			4: 'Дерево',
			5: 'Листва',
			6: 'Медная руда',
			7: 'Железная руда',
			8: 'Золотая руда',
			9: 'Алмаз',
			10: 'Факел',
			11: 'Кирпич',
			12: 'Обсидиан',
			13: 'Титановая руда',
			14: 'Платиновая руда',
			15: 'Мифриловая руда',
			16: 'Песок',
			17: 'Песчаник',
			18: 'Стекло',
			19: 'Сундук',

			// Processed ores
			20: 'Железный слиток',
			21: 'Золотой слиток',
			22: 'Медный слиток',
			23: 'Титановый слиток',
			24: 'Платиновый слиток',
			25: 'Обсидиановый слиток',
			26: 'Мифриловый слиток',

			// Tools
			30: 'Деревянная кирка',
			31: 'Деревянный топор',
			32: 'Каменная кирка',
			33: 'Каменный топор',
			34: 'Медная кирка',
			35: 'Медный топор',
			36: 'Железная кирка',
			37: 'Железный топор',
			38: 'Золотая кирка',
			39: 'Золотой топор',
			40: 'Алмазная кирка',
			41: 'Алмазный топор',
			42: 'Титановая кирка',
			43: 'Титановый топор',
			44: 'Платиновая кирка',
			45: 'Платиновый топор',
			46: 'Обсидиановая кирка',
			47: 'Обсидиановый топор',
			48: 'Мифриловая кирка',
			49: 'Мифриловый топор',

			// Other items
			50: 'Слизь',
			60: 'Деревянная платформа',
			61: 'Деревянная дверь',
			62: 'Стул',
			63: 'Стол',
			64: 'Цепь',
			70: 'Верстак',
			71: 'Плавильня',
			72: 'Наковальня',
			73: 'Мифриловая наковальня',
		}

		return blockNames[itemType] || `Предмет #${itemType}`
	}

	// Function to get additional item info
	function getItemInfo(itemType) {
		if (window.BLOCKS && window.BLOCKS[itemType]) {
			const block = window.BLOCKS[itemType]
			let info = ''

			// Add info about breakability and hardness
			if (block.breakable) {
				info += `Прочность: ${block.hardness || 1}\n`
			} else if (block.breakable === false) {
				info += 'Неразрушимый\n'
			}

			// Add info about light emission
			if (block.lightEmission > 0) {
				info += `Излучает свет (${block.lightEmission})\n`
			}

			// Add info if it's a crafting station
			if (block.isCraftingStation) {
				info += 'Станция крафта\n'
			}

			// Add info if it's climbable
			if (block.climbable) {
				info += 'Можно карабкаться\n'
			}

			// Add info about interaction type
			if (block.interactive) {
				info += 'Можно взаимодействовать\n'
			}

			// Add info about placement type
			if (block.background) {
				info += 'Фоновый блок\n'
			}

			// Add info for special materials
			if (itemType >= 6 && itemType <= 9) {
				info += 'Сырье для крафта\n'
			} else if (itemType >= 20 && itemType <= 26) {
				info += 'Слиток металла\n'
			}

			return info.trim()
		}

		// Tool info
		if (itemType >= 30 && itemType <= 49) {
			const toolType = itemType % 2 === 0 ? 'Кирка' : 'Топор'
			const materialMap = {
				30: 'Деревянная',
				32: 'Каменная',
				34: 'Медная',
				36: 'Железная',
				38: 'Золотая',
				40: 'Алмазная',
				42: 'Титановая',
				44: 'Платиновая',
				46: 'Обсидиановая',
				48: 'Мифриловая',
			}

			const material = materialMap[itemType - (itemType % 2)]
			let power = 0

			// Determine tool power based on material
			if (material === 'Деревянная') power = 1
			else if (material === 'Каменная') power = 2
			else if (material === 'Медная') power = 3
			else if (material === 'Железная') power = 4
			else if (material === 'Золотая') power = 5
			else if (material === 'Алмазная') power = 6
			else if (material === 'Титановая') power = 7
			else if (material === 'Платиновая') power = 8
			else if (material === 'Обсидиановая') power = 9
			else if (material === 'Мифриловая') power = 10

			// Add more detail
			let info = ''

			if (toolType === 'Кирка') {
				info += `Сила добычи: ${power}\n`
				info += `Тип: ${toolType}\n`
				info += 'Используется для добычи камня и руд'
			} else {
				info += `Сила рубки: ${power}\n`
				info += `Тип: ${toolType}\n`
				info += 'Используется для рубки деревьев'
			}

			return info
		}

		// Special item info
		if (itemType === 50) {
			return 'Материал для крафта факелов и других предметов'
		} else if (itemType === 60) {
			return 'Можно стоять на платформе\nМожно прыгнуть вверх через платформу'
		} else if (itemType === 61) {
			return 'Позволяет открывать/закрывать проход'
		} else if (itemType === 70) {
			return 'Станция крафта\nПозволяет создавать базовые предметы'
		} else if (itemType === 71) {
			return 'Станция крафта\nПозволяет переплавлять руду в слитки'
		} else if (itemType === 72 || itemType === 73) {
			return 'Станция крафта\nПозволяет создавать инструменты из металла'
		}

		return ''
	}

	// Function to attach tooltip handlers to inventory items
	function attachTooltipHandlers() {
		// Wait for DOM to be fully loaded
		if (document.readyState !== 'complete') {
			window.addEventListener('load', attachTooltipHandlers)
			return
		}

		console.log('Attaching tooltip handlers to inventory items')

		// Observer to watch for new inventory items
		const observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				if (mutation.addedNodes.length) {
					mutation.addedNodes.forEach(node => {
						if (node.nodeType === Node.ELEMENT_NODE) {
							// Check if it's an inventory slot or crafting recipe item
							const isInventorySlot =
								node.classList && node.classList.contains('inventory-slot')
							const isCraftingItem =
								node.classList && node.classList.contains('recipe-item')

							if (isInventorySlot || isCraftingItem) {
								// Find item display inside slot
								const itemDisplay = node.querySelector('.item-display')
								if (itemDisplay) attachItemHandlers(itemDisplay)
							} else {
								// Also search for any item displays within the added node
								const itemDisplays = node.querySelectorAll('.item-display')
								itemDisplays.forEach(itemDisplay => {
									attachItemHandlers(itemDisplay)
								})
							}
						}
					})
				}
			})
		})

		// Start observing the document body for added nodes
		observer.observe(document.body, { childList: true, subtree: true })

		// Also attach handlers to any existing item displays
		const existingItemDisplays = document.querySelectorAll('.item-display')
		existingItemDisplays.forEach(itemDisplay => {
			attachItemHandlers(itemDisplay)
		})
	}

	// Function to attach mouseover/mouseout handlers to an item display
	function attachItemHandlers(itemDisplay) {
		if (!itemDisplay || itemDisplay._hasTooltip) return

		// Mark this element as already having tooltip handlers
		itemDisplay._hasTooltip = true
		console.log(
			'Attaching tooltip handlers to item display:',
			itemDisplay.dataset.itemType
		)

		itemDisplay.addEventListener('mouseover', function (e) {
			const itemType = parseInt(this.dataset.itemType)
			const count = parseInt(this.dataset.count)

			if (!isNaN(itemType)) {
				const itemName = getItemName(itemType)
				const itemInfo = getItemInfo(itemType)

				// Set tooltip content
				let content = `<strong style="color: #FFF;">${itemName}</strong>`
				if (count > 1) {
					content += ` <span style="color: #AAA;">(${count})</span>`
				}

				if (itemInfo) {
					content += `<br><span style="font-size: 12px; color: #BBB;">${itemInfo.replace(
						/\n/g,
						'<br>'
					)}</span>`
				}

				tooltip.innerHTML = content

				// Position tooltip near cursor
				tooltip.style.left = e.clientX + 15 + 'px'
				tooltip.style.top = e.clientY + 15 + 'px'
				tooltip.style.display = 'block'
				setTimeout(() => {
					tooltip.style.opacity = '1'
				}, 10)
			}
		})

		itemDisplay.addEventListener('mousemove', function (e) {
			// Update tooltip position as mouse moves
			tooltip.style.left = e.clientX + 15 + 'px'
			tooltip.style.top = e.clientY + 15 + 'px'
		})

		itemDisplay.addEventListener('mouseout', function () {
			// Hide tooltip with fade out
			tooltip.style.opacity = '0'
			setTimeout(() => {
				tooltip.style.display = 'none'
			}, 150)
		})

		// Also hide tooltip when leaving inventory container
		const inventoryContainer = document.getElementById('fullInventory')
		if (inventoryContainer && !inventoryContainer._hasTooltipOutHandler) {
			inventoryContainer._hasTooltipOutHandler = true
			inventoryContainer.addEventListener('mouseleave', function () {
				tooltip.style.display = 'none'
			})
		}

		// Also handle crafting container
		const craftingContainer = document.querySelector('.crafting-container')
		if (craftingContainer && !craftingContainer._hasTooltipOutHandler) {
			craftingContainer._hasTooltipOutHandler = true
			craftingContainer.addEventListener('mouseleave', function () {
				tooltip.style.display = 'none'
			})
		}
	}

	// Expose the attachItemHandlers function for other modules
	window.attachItemHandlers = attachItemHandlers

	// Initialize tooltip system
	attachTooltipHandlers()

	// Also make sure the tooltip handlers are attached when inventory is rendered
	if (window.Inventory && Inventory.prototype) {
		// Hook into inventory rendering function
		const originalRenderFullInventory = Inventory.prototype.renderFullInventory
		Inventory.prototype.renderFullInventory = function () {
			// Call the original method
			const result = originalRenderFullInventory.apply(this, arguments)

			// Attach tooltip handlers after a short delay to ensure DOM is updated
			setTimeout(() => {
				console.log('Attaching tooltips after inventory render')
				const itemDisplays = document.querySelectorAll('.item-display')
				itemDisplays.forEach(itemDisplay => {
					attachItemHandlers(itemDisplay)
				})
			}, 100)

			return result
		}

		// Also hook into hotbar rendering
		const originalRenderHotbar = Inventory.prototype.renderHotbar
		Inventory.prototype.renderHotbar = function () {
			// Call the original method
			const result = originalRenderHotbar.apply(this, arguments)

			// Attach tooltip handlers to hotbar items
			setTimeout(() => {
				const hotbarItemDisplays = document.querySelectorAll(
					'.inventory-bar .item-display'
				)
				hotbarItemDisplays.forEach(itemDisplay => {
					attachItemHandlers(itemDisplay)
				})
			}, 100)

			return result
		}

		// Hook into any methods that update items
		if (Inventory.prototype.updateSlot) {
			const originalUpdateSlot = Inventory.prototype.updateSlot
			Inventory.prototype.updateSlot = function (slotIndex) {
				// Call the original method
				const result = originalUpdateSlot.apply(this, arguments)

				// Find and update tooltip handlers for this slot
				setTimeout(() => {
					const slot = document.querySelector(
						`.inventory-slot[data-slot-index="${slotIndex}"]`
					)
					if (slot) {
						const itemDisplay = slot.querySelector('.item-display')
						if (itemDisplay) {
							attachItemHandlers(itemDisplay)
						}
					}
				}, 50)

				return result
			}
		}
	}

	// Also hook into crafting UI if it exists
	if (window.CraftingUI && CraftingUI.prototype) {
		const originalRenderRecipes = CraftingUI.prototype.renderRecipes
		if (originalRenderRecipes) {
			CraftingUI.prototype.renderRecipes = function () {
				// Call the original method
				const result = originalRenderRecipes.apply(this, arguments)

				// Attach tooltip handlers to recipe items
				setTimeout(() => {
					const recipeItemDisplays = document.querySelectorAll(
						'.recipe-item .item-display'
					)
					recipeItemDisplays.forEach(itemDisplay => {
						attachItemHandlers(itemDisplay)
					})
				}, 100)

				return result
			}
		}
	}

	// Initialize and periodically check for new items to attach tooltips to
	setInterval(() => {
		const itemDisplays = document.querySelectorAll(
			'.item-display:not([data-has-tooltip])'
		)
		if (itemDisplays.length > 0) {
			console.log(
				`Found ${itemDisplays.length} new item displays to attach tooltips to`
			)
			itemDisplays.forEach(itemDisplay => {
				attachItemHandlers(itemDisplay)
				itemDisplay.dataset.hasTooltip = 'true'
			})
		}
	}, 1000)

	console.log('████ Inventory tooltips initialized successfully ████')
})()
