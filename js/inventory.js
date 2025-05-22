class Inventory {
	constructor(initialItems = null) {
		// If initialItems is provided, use it; otherwise start with an empty inventory
		this.slots = initialItems || []
		this.selectedSlot = 0
		this.maxSlots = 5 // Slots in hotbar
		this.totalSlots = 20 // Total slots in full inventory

		// Expand slots array to match total slots
		while (this.slots.length < this.totalSlots) {
			this.slots.push(null)
		}

		this.hotbarElement = document.getElementById('inventoryBar')
		this.fullInventoryElement = null // Will be created when needed
		this.isFullInventoryOpen = false

		// Create the full inventory container
		this.createFullInventoryUI()

		// Render the hotbar initially
		this.renderHotbar()
	}

	createFullInventoryUI() {
		// Check if full inventory container already exists
		let fullInventory = document.getElementById('fullInventory')

		if (!fullInventory) {
			fullInventory = document.createElement('div')
			fullInventory.id = 'fullInventory'
			fullInventory.className = 'full-inventory'

			// Create inventory header
			const header = document.createElement('div')
			header.className = 'inventory-header'
			header.textContent = 'Инвентарь'
			fullInventory.appendChild(header)

			// Create slots container
			const slotsContainer = document.createElement('div')
			slotsContainer.className = 'inventory-slots-container'
			fullInventory.appendChild(slotsContainer)

			// Hide by default
			fullInventory.style.display = 'none'

			document.body.appendChild(fullInventory)
		} else {
			// If it exists but is orphaned (not attached to document), reattach it
			if (
				!fullInventory.parentNode ||
				fullInventory.parentNode !== document.body
			) {
				console.log(
					'Reattaching orphaned inventory UI element to document body'
				)
				document.body.appendChild(fullInventory)
			}

			// Make sure it's hidden initially
			fullInventory.style.display = 'none'
		}

		this.fullInventoryElement = fullInventory
	}

	renderHotbar() {
		if (!this.hotbarElement) return

		this.hotbarElement.innerHTML = ''

		for (let i = 0; i < this.maxSlots; i++) {
			const slot = document.createElement('div')
			slot.className = 'inventory-slot'
			slot.dataset.slotIndex = i

			if (i === this.selectedSlot) {
				slot.className += ' selected'
			}

			if (i < this.slots.length && this.slots[i]) {
				const itemType = this.slots[i].itemType
				const count = this.slots[i].count

				// Create item display (in a full game this would be an image)
				const itemDisplay = document.createElement('div')
				itemDisplay.style.width = '30px'
				itemDisplay.style.height = '30px'
				itemDisplay.style.backgroundColor = ITEM_TEXTURES[itemType]

				// Create item count
				const itemCount = document.createElement('div')
				itemCount.className = 'item-count'
				itemCount.textContent = count

				slot.appendChild(itemDisplay)
				slot.appendChild(itemCount)
			}

			// Add click event for slot selection in hotbar
			slot.addEventListener('click', () => {
				this.selectSlot(i)
			})

			this.hotbarElement.appendChild(slot)
		}
	}

	renderFullInventory() {
		if (!this.fullInventoryElement) return

		const slotsContainer = this.fullInventoryElement.querySelector(
			'.inventory-slots-container'
		)
		if (!slotsContainer) return

		slotsContainer.innerHTML = ''

		// Render all inventory slots
		for (let i = 0; i < this.totalSlots; i++) {
			const slot = document.createElement('div')
			slot.className = 'inventory-slot'
			slot.dataset.slotIndex = i

			// Highlight hotbar slots
			if (i < this.maxSlots) {
				slot.className += ' hotbar-slot'
			}

			// Mark selected slot
			if (i === this.selectedSlot) {
				slot.className += ' selected'
			}

			if (i < this.slots.length && this.slots[i]) {
				const itemType = this.slots[i].itemType
				const count = this.slots[i].count

				// Create item display
				const itemDisplay = document.createElement('div')
				itemDisplay.className = 'item-display'
				itemDisplay.draggable = true
				itemDisplay.style.width = '30px'
				itemDisplay.style.height = '30px'
				itemDisplay.style.backgroundColor = ITEM_TEXTURES[itemType]
				itemDisplay.dataset.slotIndex = i
				itemDisplay.dataset.itemType = itemType
				itemDisplay.dataset.count = count

				// Create item count
				const itemCount = document.createElement('div')
				itemCount.className = 'item-count'
				itemCount.textContent = count

				slot.appendChild(itemDisplay)
				slot.appendChild(itemCount)

				// Add drag events
				itemDisplay.addEventListener('dragstart', e => {
					// Store which slot we're dragging from
					e.dataTransfer.setData(
						'text/plain',
						JSON.stringify({
							sourceSlotIndex: i,
							itemType: itemType,
							count: count,
						})
					)

					// Store if we're doing a split operation (shift key)
					if (e.shiftKey) {
						itemDisplay.dataset.splitStack = 'true'
					} else {
						itemDisplay.dataset.splitStack = 'false'
					}
				})

				// Add right-click event for splitting stack in half
				itemDisplay.addEventListener('contextmenu', e => {
					e.preventDefault()
					// Only split if more than 1 item
					if (count > 1) {
						this.splitStack(i)
					}
					return false
				})
			}

			// Add drag and drop events to slots
			slot.addEventListener('dragover', e => {
				e.preventDefault() // Allow drop
				slot.classList.add('drag-over')
			})

			slot.addEventListener('dragleave', () => {
				slot.classList.remove('drag-over')
			})

			slot.addEventListener('drop', e => {
				e.preventDefault()
				slot.classList.remove('drag-over')

				const data = JSON.parse(e.dataTransfer.getData('text/plain'))
				const sourceSlotIndex = data.sourceSlotIndex
				const targetSlotIndex = i

				// Don't do anything if dropping on the same slot
				if (sourceSlotIndex === targetSlotIndex) return

				const splitStack = e.shiftKey

				// Handle the move/stack logic
				this.moveItem(sourceSlotIndex, targetSlotIndex, splitStack)
			})

			// Add click event to select this slot
			slot.addEventListener('click', () => {
				this.selectSlot(i)
			})

			slotsContainer.appendChild(slot)
		}
	}

	toggleFullInventory() {
		this.isFullInventoryOpen = !this.isFullInventoryOpen

		// Make sure the fullInventoryElement exists
		if (!this.fullInventoryElement) {
			console.log('Inventory element missing during toggle, recreating')
			this.createFullInventoryUI()
		}

		if (this.isFullInventoryOpen) {
			// Ensure inventory is properly rendered before showing
			this.renderFullInventory()

			// Make it visible
			this.fullInventoryElement.style.display = 'flex'

			// Log for debugging
			console.log(
				'Inventory opened, element display:',
				this.fullInventoryElement.style.display
			)
		} else {
			// Hide the inventory
			this.fullInventoryElement.style.display = 'none'

			// Log for debugging
			console.log(
				'Inventory closed, element display:',
				this.fullInventoryElement.style.display
			)
		}

		return this.isFullInventoryOpen
	}

	isInventoryOpen() {
		return this.isFullInventoryOpen
	}

	selectSlot(index) {
		if (index >= 0 && index < this.totalSlots) {
			this.selectedSlot = index
			this.renderHotbar()

			if (this.isFullInventoryOpen) {
				this.renderFullInventory()
			}
		}
	}

	getSelectedItem() {
		if (this.selectedSlot < this.slots.length) {
			return this.slots[this.selectedSlot]
		}
		return null
	}

	addItem(itemType, count = 1) {
		// Check if we already have this item type
		for (let i = 0; i < this.slots.length; i++) {
			const slot = this.slots[i]
			if (slot && slot.itemType === itemType) {
				slot.count += count
				this.renderHotbar()
				if (this.isFullInventoryOpen) {
					this.renderFullInventory()
				}
				// Update crafting UI if it's open
				if (window.craftingUI && window.craftingUI.isCraftingOpen) {
					window.craftingUI.updateRecipeList()
				}

				// Sync inventory in multiplayer
				if (
					window.inventorySyncSystem &&
					window.multiplayerSystem &&
					window.multiplayerSystem.isInMultiplayerGame() &&
					window.player
				) {
					window.inventorySyncSystem.syncInventory(window.player)
				}

				return true
			}
		}

		// Find first empty slot (prioritize hotbar)
		for (let i = 0; i < this.maxSlots; i++) {
			if (!this.slots[i]) {
				this.slots[i] = { itemType, count }
				this.renderHotbar()
				if (this.isFullInventoryOpen) {
					this.renderFullInventory()
				}
				return true
			}
		}

		// If hotbar is full, try remaining inventory slots
		for (let i = this.maxSlots; i < this.totalSlots; i++) {
			if (!this.slots[i]) {
				this.slots[i] = { itemType, count }
				if (this.isFullInventoryOpen) {
					this.renderFullInventory()
				}
				return true
			}
		}

		return false // Inventory completely full
	}

	useSelectedItem() {
		const selectedItem = this.getSelectedItem()
		if (selectedItem && selectedItem.count > 0) {
			selectedItem.count--
			if (selectedItem.count <= 0) {
				// Remove the item if count reaches 0
				this.slots.splice(this.selectedSlot, 1)
			}
			this.renderHotbar()

			// Update crafting UI if it's open after using an item
			if (window.craftingUI && window.craftingUI.isCraftingOpen) {
				window.craftingUI.updateRecipeList()
			}

			// Sync inventory in multiplayer when using an item
			if (
				window.inventorySyncSystem &&
				window.multiplayerSystem &&
				window.multiplayerSystem.isInMultiplayerGame() &&
				window.player
			) {
				window.inventorySyncSystem.syncInventory(window.player)
			}

			return selectedItem.itemType
		}
		return null
	}

	// Split a stack into two equal parts
	splitStack(slotIndex) {
		const stack = this.slots[slotIndex]
		if (!stack || stack.count <= 1) return false

		// Calculate how many to move (half, rounded down)
		const amountToSplit = Math.floor(stack.count / 2)

		// Find the first empty slot
		let emptySlot = -1
		for (let i = 0; i < this.totalSlots; i++) {
			if (!this.slots[i]) {
				emptySlot = i
				break
			}
		}

		if (emptySlot === -1) {
			// No empty slots available
			return false
		}

		// Create new stack in the empty slot
		this.slots[emptySlot] = {
			itemType: stack.itemType,
			count: amountToSplit,
		}

		// Reduce the original stack
		stack.count -= amountToSplit

		// Re-render
		this.renderHotbar()
		if (this.isFullInventoryOpen) {
			this.renderFullInventory()
		}

		// Update crafting UI if it's open after splitting stack
		if (window.craftingUI && window.craftingUI.isCraftingOpen) {
			window.craftingUI.updateRecipeList()
		}

		// Sync inventory in multiplayer when splitting stacks
		if (
			window.inventorySyncSystem &&
			window.multiplayerSystem &&
			window.multiplayerSystem.isInMultiplayerGame() &&
			window.player
		) {
			window.inventorySyncSystem.syncInventory(window.player)
		}

		return true
	}

	// Move an item between slots with stacking or splitting
	moveItem(sourceSlotIndex, targetSlotIndex, split = false) {
		const sourceItem = this.slots[sourceSlotIndex]
		const targetItem = this.slots[targetSlotIndex]

		// Can't move what isn't there
		if (!sourceItem) return false

		// If target slot has the same item type, stack them
		if (
			targetItem &&
			sourceItem &&
			targetItem.itemType === sourceItem.itemType
		) {
			// If splitting, move half (or 1 if only 1 item)
			if (split) {
				const amountToMove = Math.max(1, Math.floor(sourceItem.count / 2))
				targetItem.count += amountToMove
				sourceItem.count -= amountToMove

				// Remove source item if empty
				if (sourceItem.count <= 0) {
					this.slots[sourceSlotIndex] = null
				}
			} else {
				// Full stack move
				targetItem.count += sourceItem.count
				this.slots[sourceSlotIndex] = null
			}
		} else {
			// No stacking possible
			if (split && sourceItem.count > 1) {
				// If splitting, create a new stack with half the items
				const amountToMove = Math.max(1, Math.floor(sourceItem.count / 2))

				// Create new target stack
				this.slots[targetSlotIndex] = {
					itemType: sourceItem.itemType,
					count: amountToMove,
				}

				// Reduce source stack
				sourceItem.count -= amountToMove
			} else {
				// Simple swap
				this.slots[targetSlotIndex] = sourceItem
				this.slots[sourceSlotIndex] = targetItem
			}
		}

		// Re-render inventory
		this.renderHotbar()
		if (this.isFullInventoryOpen) {
			this.renderFullInventory()
		}

		// Update crafting UI if it's open after moving items
		if (window.craftingUI && window.craftingUI.isCraftingOpen) {
			window.craftingUI.updateRecipeList()
		}

		// Sync inventory in multiplayer when moving items
		if (
			window.inventorySyncSystem &&
			window.multiplayerSystem &&
			window.multiplayerSystem.isInMultiplayerGame() &&
			window.player
		) {
			window.inventorySyncSystem.syncInventory(window.player)
		}

		return true
	}

	// Get inventory data for saving
	getSaveData() {
		return this.slots.map(slot => {
			if (!slot) return null
			return {
				itemType: slot.itemType,
				count: slot.count,
			}
		})
	}

	// Load inventory data
	loadFromSaveData(savedData) {
		if (!savedData || !Array.isArray(savedData)) return

		// Reset slots and load from saved data
		this.slots = []

		// Copy saved data
		savedData.forEach((slotData, index) => {
			if (slotData) {
				this.slots[index] = {
					itemType: slotData.itemType,
					count: slotData.count,
				}
			} else {
				this.slots[index] = null
			}
		})

		// Ensure we have enough slots
		while (this.slots.length < this.totalSlots) {
			this.slots.push(null)
		}

		this.renderHotbar()
		if (this.isFullInventoryOpen) {
			this.renderFullInventory()
		}
	}

	// Check if the inventory has enough of the specified item
	hasItem(itemType, requiredCount = 1) {
		let totalCount = 0

		for (const slot of this.slots) {
			if (slot && slot.itemType === itemType) {
				totalCount += slot.count
				if (totalCount >= requiredCount) {
					return true
				}
			}
		}

		return false
	}

	// Get the total count of a specific item type in the inventory
	getItemCount(itemType) {
		let totalCount = 0

		for (const slot of this.slots) {
			if (slot && slot.itemType === itemType) {
				totalCount += slot.count
			}
		}

		return totalCount
	}

	// Remove an item from inventory (used by crafting)
	removeItem(itemType, count = 1) {
		let remainingToRemove = count

		// Loop through all slots to find the item
		for (let i = 0; i < this.slots.length && remainingToRemove > 0; i++) {
			const slot = this.slots[i]

			if (slot && slot.itemType === itemType) {
				// Calculate how many to remove from this slot
				const removeAmount = Math.min(slot.count, remainingToRemove)
				slot.count -= removeAmount
				remainingToRemove -= removeAmount

				// If slot is now empty, set it to null
				if (slot.count <= 0) {
					this.slots[i] = null
				}
			}
		}

		// Update UI
		this.renderHotbar()
		if (this.isFullInventoryOpen) {
			this.renderFullInventory()
		}

		// Sync inventory in multiplayer
		if (
			window.inventorySyncSystem &&
			window.multiplayerSystem &&
			window.multiplayerSystem.isInMultiplayerGame() &&
			window.player
		) {
			window.inventorySyncSystem.syncInventory(window.player)
		}

		return remainingToRemove === 0 // Return true if we removed all requested items
	}
}
