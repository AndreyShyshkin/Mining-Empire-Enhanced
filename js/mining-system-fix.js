// Mining and Tool System Fix
console.log('Loading mining-system-fix.js')

// First, make sure all required values are defined in blocks
;(function () {
	// Add requiredMiningPower to ores if not defined
	const oreMiningPower = {
		[window.BLOCK_TYPES.COAL_ORE]: 1,
		[window.BLOCK_TYPES.COPPER_ORE]: 1,
		[window.BLOCK_TYPES.IRON_ORE]: 2,
		[window.BLOCK_TYPES.GOLD_ORE]: 4,
		[window.BLOCK_TYPES.DIAMOND_ORE]: 5,
		[window.BLOCK_TYPES.RUBY_ORE]: 5,
		[window.BLOCK_TYPES.SAPPHIRE_ORE]: 5,
		[window.BLOCK_TYPES.EMERALD_ORE]: 5,
		[window.BLOCK_TYPES.TITANIUM_ORE]: 6,
		[window.BLOCK_TYPES.PLATINUM_ORE]: 7,
		[window.BLOCK_TYPES.OBSIDIAN_ORE]: 9,
		[window.BLOCK_TYPES.MITHRIL_ORE]: 10,
	}

	// Add mining power requirements to ores
	Object.entries(oreMiningPower).forEach(([blockType, power]) => {
		blockType = parseInt(blockType)
		if (window.BLOCKS[blockType]) {
			if (window.BLOCKS[blockType].requiredMiningPower === undefined) {
				window.BLOCKS[blockType].requiredMiningPower = power
				console.log(
					`Added mining power ${power} requirement to ${window.BLOCKS[blockType].name}`
				)
			}
		}
	})

	// Make sure STONE has mining power requirement
	if (
		window.BLOCKS[window.BLOCK_TYPES.STONE] &&
		window.BLOCKS[window.BLOCK_TYPES.STONE].requiredMiningPower === undefined
	) {
		window.BLOCKS[window.BLOCK_TYPES.STONE].requiredMiningPower = 1 // Wooden pickaxe can mine stone
	}

	// Make sure all tools have miningPower defined
	const tools = Object.entries(window.BLOCKS).filter(
		([_, block]) => block.toolType === 'pickaxe' || block.toolType === 'axe'
	)

	tools.forEach(([_, block]) => {
		if (block.miningPower === undefined) {
			console.warn(
				`Tool ${block.name} has no mining power defined! Setting default value.`
			)
			if (block.name.includes('Wooden')) {
				block.miningPower = 1
			} else if (block.name.includes('Stone')) {
				block.miningPower = 2
			} else if (block.name.includes('Copper')) {
				block.miningPower = 3
			} else if (block.name.includes('Iron')) {
				block.miningPower = 4
			} else if (block.name.includes('Gold')) {
				block.miningPower = 5
			} else if (block.name.includes('Diamond')) {
				block.miningPower = 7
			} else if (block.name.includes('Titanium')) {
				block.miningPower = 8
			} else if (block.name.includes('Platinum')) {
				block.miningPower = 9
			} else if (block.name.includes('Obsidian')) {
				block.miningPower = 10
			} else if (block.name.includes('Mithril')) {
				block.miningPower = 11
			} else {
				block.miningPower = 1 // Default
			}
		}
	})
})()

// Override player mining methods to support mining power requirements
;(function () {
	// Save original methods
	const originalStartMining = window.Player.prototype.startMining
	const originalUpdateMining = window.Player.prototype.updateMining

	// Override startMining method
	window.Player.prototype.startMining = function (tileX, tileY) {
		// Call original method to get basic checks
		const canStartMining = originalStartMining.call(this, tileX, tileY)

		if (canStartMining) {
			const blockType = this.world.getTile(tileX, tileY)
			const block = window.BLOCKS[blockType]

			// Check if block requires a specific mining power
			if (block.requiredMiningPower !== undefined) {
				// Get the currently equipped pickaxe/axe power
				const equippedTool = this.inventory.hotbar[this.inventory.selectedSlot]

				if (!equippedTool) {
					console.log('No tool equipped!')
					// Add a visual warning near the player
					this.showToolWarning('Need a tool!')
					return false
				}

				const toolBlock = window.BLOCKS[equippedTool.itemType]

				if (!toolBlock || !toolBlock.toolType || !toolBlock.miningPower) {
					console.log('Not a mining tool!')
					// If it's wood or other resource, assume axe/pickaxe needed
					if (block.name.includes('Wood') || block.name.includes('Tree')) {
						this.showToolWarning('Need an axe!')
					} else {
						this.showToolWarning('Need a pickaxe!')
					}
					return false
				}

				// Check if tool type matches (pickaxe for ores, axe for wood)
				if (
					(block.name.includes('Wood') || block.name.includes('Tree')) &&
					toolBlock.toolType !== 'axe'
				) {
					console.log('Need an axe for wood!')
					this.showToolWarning('Need an axe!')
					return false
				}

				if (
					(block.name.includes('Ore') || block.name.includes('Stone')) &&
					toolBlock.toolType !== 'pickaxe'
				) {
					console.log('Need a pickaxe for ore/stone!')
					this.showToolWarning('Need a pickaxe!')
					return false
				}

				// Check mining power
				if (toolBlock.miningPower < block.requiredMiningPower) {
					console.log(
						`Tool power (${toolBlock.miningPower}) too weak for block (${block.requiredMiningPower})!`
					)
					this.showToolWarning(`Need stronger ${toolBlock.toolType}!`)
					return false
				}

				// Calculate mining speed multiplier based on tool power vs block requirement
				const powerDifference =
					toolBlock.miningPower - block.requiredMiningPower
				if (powerDifference >= 0) {
					// Tool is strong enough - add speed bonus based on how much stronger it is
					this.miningSpeedMultiplier = 1 + powerDifference * 0.2 // 20% faster per power level above requirement
					console.log(`Mining speed multiplier: ${this.miningSpeedMultiplier}`)
				} else {
					// This case should not happen due to previous check, but just to be safe
					this.miningSpeedMultiplier = 0.5 // 50% slower if tool is too weak
				}
			} else {
				this.miningSpeedMultiplier = 1 // Default speed
			}

			return true
		}

		return false
	}

	// Override updateMining method to use miningSpeedMultiplier
	window.Player.prototype.updateMining = function (deltaTime) {
		if (this.isMining && this.miningTarget) {
			const blockType = this.world.getTile(
				this.miningTarget.x,
				this.miningTarget.y
			)

			if (blockType !== window.BLOCK_TYPES.AIR) {
				const block = window.BLOCKS[blockType]
				// Apply mining speed multiplier to progress
				this.miningProgress +=
					(deltaTime / (block.hardness * 1000)) *
					(this.miningSpeedMultiplier || 1)

				if (this.miningProgress >= 1) {
					// Block is mined!
					this.inventory.addItem(blockType, 1)
					this.world.setTile(
						this.miningTarget.x,
						this.miningTarget.y,
						window.BLOCK_TYPES.AIR
					)
					this.isMining = false
					this.miningTarget = null
					this.miningProgress = 0

					// In multiplayer, notify other players via socket
					if (window.socket) {
						window.socket.emit('break-block', {
							x: this.miningTarget.x,
							y: this.miningTarget.y,
						})
					}
				}
			} else {
				// If block is already air (mined by someone else in multiplayer)
				this.isMining = false
				this.miningTarget = null
				this.miningProgress = 0
			}
		}
	}

	// Add method to display tool warning messages
	window.Player.prototype.showToolWarning = function (message) {
		console.log('Tool warning:', message)

		// Create warning element if doesn't exist
		if (!this.warningElement) {
			this.warningElement = document.createElement('div')
			this.warningElement.className = 'tool-warning'
			this.warningElement.style.position = 'absolute'
			this.warningElement.style.padding = '5px 10px'
			this.warningElement.style.background = 'rgba(255, 0, 0, 0.7)'
			this.warningElement.style.color = 'white'
			this.warningElement.style.borderRadius = '5px'
			this.warningElement.style.fontFamily = 'Arial, sans-serif'
			this.warningElement.style.fontSize = '14px'
			this.warningElement.style.fontWeight = 'bold'
			this.warningElement.style.pointerEvents = 'none'
			this.warningElement.style.zIndex = '1000'
			this.warningElement.style.display = 'none'
			document.body.appendChild(this.warningElement)
		}

		// Position above player's head
		const screenX = this.x - window.viewportOffsetX
		const screenY = this.y - window.viewportOffsetY - 50 // 50px above player

		this.warningElement.style.left = `${screenX}px`
		this.warningElement.style.top = `${screenY}px`
		this.warningElement.textContent = message
		this.warningElement.style.display = 'block'

		// Hide after 2 seconds
		if (this.warningTimeout) {
			clearTimeout(this.warningTimeout)
		}

		this.warningTimeout = setTimeout(() => {
			if (this.warningElement) {
				this.warningElement.style.display = 'none'
			}
		}, 2000)
	}
})()

console.log('Mining system fix loaded successfully!')
