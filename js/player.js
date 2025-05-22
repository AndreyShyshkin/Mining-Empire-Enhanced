class Player {
	constructor(x, y, world) {
		this.x = x
		this.y = y
		this.width = 20
		this.height = 40
		this.velocityX = 0
		this.velocityY = 0
		this.speed = 3 // Reduced from 5 to 3 for more appropriate multiplayer movement
		this.jumpForce = 12 // Reduced from 15 to 12
		this.gravity = 0.5
		this.friction = 0.8
		this.onGround = false
		this.direction = 'right'
		this.world = world

		// Initialize with an empty inventory for both single player and multiplayer
		// Players should collect resources by mining blocks
		this.inventory = new Inventory([])

		this.health = 100
		this.maxHealth = 100

		// Mining properties
		this.isMining = false
		this.miningTarget = { x: 0, y: 0 }
		this.miningProgress = 0
		this.miningDuration = 45 // Increased from 30 to 45 frames to break a block

		// Climbing properties
		this.isClimbing = false
	}

	update(keys) {
		// Ensure player's initial position is synced to multiplayer
		if (
			window.multiplayerSystem &&
			window.multiplayerSystem.isInMultiplayerGame()
		) {
			// Force sync player position on first update
			if (!this._hasSyncedInitialPosition) {
				window.multiplayerSystem.updatePlayerState(this)
				this._hasSyncedInitialPosition = true
			}
		}

		// Handle movement
		if (keys.a || keys.ArrowLeft) {
			this.velocityX = -this.speed
			this.direction = 'left'
		} else if (keys.d || keys.ArrowRight) {
			this.velocityX = this.speed
			this.direction = 'right'
		} else {
			this.velocityX *= this.friction
		}

		// Sync position with multiplayer system
		if (
			window.multiplayerSystem &&
			window.multiplayerSystem.isInMultiplayerGame()
		) {
			window.multiplayerSystem.updatePlayerState(this)
		}

		// Handle climbing rope
		const playerTile = Utils.worldToTile(this.x, this.y)
		const currentTile = this.world.getTile(playerTile.x, playerTile.y)

		if (currentTile === BLOCK_TYPES.ROPE) {
			this.isClimbing = true

			// Climbing controls
			if (keys.w || keys.ArrowUp) {
				this.velocityY = -this.speed * 0.7
			} else if (keys.s || keys.ArrowDown) {
				this.velocityY = this.speed * 0.7
			} else {
				this.velocityY = 0 // Stop on rope when not pressing keys
			}
		} else {
			this.isClimbing = false

			// Normal gravity when not climbing
			this.velocityY += this.gravity

			// Handle jumping
			if (this.onGround && (keys.w || keys.ArrowUp || keys.Space)) {
				this.velocityY = -this.jumpForce
				this.onGround = false
			}
		}

		// Apply velocity
		this.x += this.velocityX
		this.y += this.velocityY

		// World collision detection
		this.handleCollisions()

		// Update mining if active
		if (this.isMining) {
			const targetBlockType = this.world.getTile(
				this.miningTarget.x,
				this.miningTarget.y
			)

			if (targetBlockType === BLOCK_TYPES.AIR) {
				// Stop mining if block is already gone
				this.isMining = false
				this.miningProgress = 0
			} else {
				const targetBlock = BLOCKS[targetBlockType]

				// Check player's equipped tool and its mining power
				const equippedItemSlot =
					this.inventory.slots[this.inventory.selectedSlot]
				let canMine = true
				let miningSpeedMultiplier = 1.0

				if (targetBlock && targetBlock.hardness) {
					// Get the equipped tool mining power
					let equippedMiningPower = 1 // Default to hand mining power

					if (equippedItemSlot) {
						const equippedTool = BLOCKS[equippedItemSlot.itemType]
						if (equippedTool && equippedTool.toolType === 'pickaxe') {
							equippedMiningPower = equippedTool.miningPower || 1
							// If tool's mining power is higher, mining is faster
							miningSpeedMultiplier = equippedMiningPower / targetBlock.hardness
							// Cap speed multiplier
							miningSpeedMultiplier = Math.min(
								Math.max(miningSpeedMultiplier, 0.5),
								3.0
							)
						}
					}

					// Check if the mining power is sufficient for this block
					// Special case for tree blocks - they can be broken with bare hands
					if (
						targetBlockType === BLOCK_TYPES.WOOD ||
						targetBlockType === BLOCK_TYPES.LEAVES
					) {
						// Trees are breakable without tools, but slower
						miningSpeedMultiplier = 0.7 // Slower without proper tools
					} else if (equippedMiningPower < targetBlock.hardness) {
						canMine = false
						// Show message that player needs a better pickaxe
						if (window.showGameMessage) {
							window.showGameMessage('Нужна кирка получше!', 'error')
						}
						this.isMining = false
						this.miningProgress = 0
						return
					}
				}

				if (canMine) {
					this.miningProgress++
					// Use hardness to adjust mining duration
					let adjustedDuration = this.miningDuration
					if (targetBlock && targetBlock.hardness) {
						adjustedDuration =
							(this.miningDuration * targetBlock.hardness) /
							miningSpeedMultiplier
					}

					if (this.miningProgress >= adjustedDuration) {
						// Block is broken
						this.breakBlock(this.miningTarget.x, this.miningTarget.y)
						this.isMining = false
						this.miningProgress = 0
					}
				}

				// Sync more frequently when mining
				if (
					window.multiplayerSystem &&
					window.multiplayerSystem.isInMultiplayerGame() &&
					this.miningProgress % 3 === 0 // More frequent updates for smoother animation
				) {
					window.multiplayerSystem.updatePlayerState(this)
				}
			}
		}

		// Update health display
		const healthFill = document.getElementById('healthFill')
		healthFill.style.width = `${(this.health / this.maxHealth) * 100}%`
	}

	handleCollisions() {
		// Get surrounding tiles
		const playerWidth = this.width / 2
		const playerHeight = this.height / 2

		// Check feet
		const bottomTile = Utils.worldToTile(this.x, this.y + playerHeight)
		const bottomBlock = this.world.getTile(bottomTile.x, bottomTile.y)

		// Check left and right
		const leftTile = Utils.worldToTile(this.x - playerWidth, this.y)
		const rightTile = Utils.worldToTile(this.x + playerWidth, this.y)
		const leftBlock = this.world.getTile(leftTile.x, leftTile.y)
		const rightBlock = this.world.getTile(rightTile.x, rightTile.y)

		// Check head
		const topTile = Utils.worldToTile(this.x, this.y - playerHeight)
		const topBlock = this.world.getTile(topTile.x, topTile.y)

		// Reset onGround flag
		this.onGround = false

		// Handle vertical collisions
		if (this.velocityY > 0) {
			if (BLOCKS[bottomBlock] && BLOCKS[bottomBlock].solid) {
				this.y = bottomTile.y * BLOCK_SIZE - playerHeight
				this.velocityY = 0
				this.onGround = true
			}
		} else if (this.velocityY < 0) {
			if (BLOCKS[topBlock] && BLOCKS[topBlock].solid) {
				this.y = (topTile.y + 1) * BLOCK_SIZE + playerHeight
				this.velocityY = 0
			}
		}

		// Handle horizontal collisions
		if (this.velocityX < 0) {
			if (BLOCKS[leftBlock] && BLOCKS[leftBlock].solid) {
				this.x = (leftTile.x + 1) * BLOCK_SIZE + playerWidth
				this.velocityX = 0
			}
		} else if (this.velocityX > 0) {
			if (BLOCKS[rightBlock] && BLOCKS[rightBlock].solid) {
				this.x = rightTile.x * BLOCK_SIZE - playerWidth
				this.velocityX = 0
			}
		}

		// World boundaries
		if (this.x < playerWidth) {
			this.x = playerWidth
		} else if (this.x > this.world.width * BLOCK_SIZE - playerWidth) {
			this.x = this.world.width * BLOCK_SIZE - playerWidth
		}

		if (this.y < playerHeight) {
			this.y = playerHeight
		} else if (this.y > this.world.height * BLOCK_SIZE - playerHeight) {
			this.y = this.world.height * BLOCK_SIZE - playerHeight
			this.onGround = true
			this.velocityY = 0
		}
	}

	startMining(tileX, tileY) {
		// Don't start mining if inventory is open
		if (window.gameIsPaused) {
			return false
		}

		const blockType = this.world.getTile(tileX, tileY)
		const block = BLOCKS[blockType]

		// Always check distance regardless of multiplayer status
		const playerTileX = Math.floor(this.x / BLOCK_SIZE)
		const playerTileY = Math.floor(this.y / BLOCK_SIZE)
		const distance =
			Math.abs(playerTileX - tileX) + Math.abs(playerTileY - tileY)

		// Use the same max distance (5) as other interactions for consistency
		const maxDistance = 5

		if (distance > maxDistance) {
			// Block too far to interact with
			return false
		}

		if (blockType !== BLOCK_TYPES.AIR && block && block.breakable) {
			this.isMining = true
			this.miningTarget = { x: tileX, y: tileY }
			this.miningProgress = 0
			return true
		}

		return false
	}

	// Обновите метод breakBlock в классе Player
	breakBlock(tileX, tileY) {
		const blockType = this.world.getTile(tileX, tileY)

		if (blockType !== BLOCK_TYPES.AIR) {
			// Always check distance first
			const playerTileX = Math.floor(this.x / BLOCK_SIZE)
			const playerTileY = Math.floor(this.y / BLOCK_SIZE)
			const distance =
				Math.abs(playerTileX - tileX) + Math.abs(playerTileY - tileY)

			// Use the same max distance as other interactions for consistency
			const maxDistance = 5

			if (distance > maxDistance) {
				// Block too far to break
				this.isMining = false
				this.miningProgress = 0
				return false
			}

			// In multiplayer, update through Firebase
			if (
				window.multiplayerSystem &&
				window.multiplayerSystem.isInMultiplayerGame()
			) {
				// Get current wall type to maintain it in multiplayer sync
				const wallType = this.world.getWall(tileX, tileY)

				// Breaking block in multiplayer

				try {
					// Apply change locally for immediate feedback
					const oldBlockType = blockType // Save for inventory
					const wallType = this.world.getWall(tileX, tileY) // Explicitly get the wall type

					// Update local world immediately, but only the tile - preserve the wall
					this.world.setTile(tileX, tileY, BLOCK_TYPES.AIR)
					// Keep the wall intact - don't change it

					// Отмечаем блок как часть ямы, созданной игроком для визуального отображения
					if (window.renderer) {
						const key = `${tileX},${tileY}`
						window.renderer.playerDiggedAreas[key] = true
						window.renderer.lightingCache = {}
					}

					// Send update to server with explicit wallType to ensure it's preserved
					const success = window.multiplayerSystem.updateBlock(
						tileX,
						tileY,
						BLOCK_TYPES.AIR,
						wallType
					)

					// Check result
					if (success === false) {
						// Block breaking rejected
						// Restore the block if rejected
						this.world.setTile(tileX, tileY, oldBlockType)
						this.isMining = false
						this.miningProgress = 0
						return false
					} else {
						// Block breaking successfully sent
					}

					// Add the item to inventory
					this.inventory.addItem(oldBlockType, 1)
					return true
				} catch (error) {
					console.error('Error during block breaking:', error)
					this.isMining = false
					this.miningProgress = 0
					return false
				}
			}

			// Добавляем предмет в инвентарь (в одиночном режиме)
			this.inventory.addItem(blockType, 1)

			// Удаляем блок из мира
			this.world.setTile(tileX, tileY, BLOCK_TYPES.AIR)

			// Отмечаем блок как часть ямы, созданной игроком
			// и очищаем кэши освещения
			if (window.renderer) {
				const key = `${tileX},${tileY}`
				window.renderer.playerDiggedAreas[key] = true
				window.renderer.lightingCache = {}
			}

			return true
		}

		return false
	}

	// Проверяет, можно ли разместить факел в указанной позиции
	canPlaceTorch(tileX, tileY) {
		// Проверяем, что выбранная позиция в пределах мира
		if (
			tileX < 0 ||
			tileX >= this.world.width ||
			tileY < 0 ||
			tileY >= this.world.height
		) {
			return false
		}

		// Проверяем, что выбранная позиция - воздух
		if (this.world.getTile(tileX, tileY) !== BLOCK_TYPES.AIR) {
			return false
		}

		// Проверяем, есть ли под факелом твердый блок
		const hasSolidBelow =
			tileY < this.world.height - 1 && this.world.isSolidBlock(tileX, tileY + 1)

		// Проверяем, есть ли твердый блок слева
		const hasSolidLeft = tileX > 0 && this.world.isSolidBlock(tileX - 1, tileY)

		// Проверяем, есть ли твердый блок справа
		const hasSolidRight =
			tileX < this.world.width - 1 && this.world.isSolidBlock(tileX + 1, tileY)

		// Факел можно разместить, если есть опора снизу, слева или справа
		return hasSolidBelow || hasSolidLeft || hasSolidRight
	}

	// Метод для размещения блока
	placeBlock(tileX, tileY) {
		// Don't place blocks if inventory is open
		if (window.gameIsPaused) {
			return false
		}

		const selectedItem = this.inventory.getSelectedItem()

		// Always check distance first, using Manhattan distance
		const playerTileX = Math.floor(this.x / BLOCK_SIZE)
		const playerTileY = Math.floor(this.y / BLOCK_SIZE)
		const distance =
			Math.abs(playerTileX - tileX) + Math.abs(playerTileY - tileY)

		// Allow interaction up to 5 blocks away for better playability
		// This value is used consistently across all interactions (mining, breaking, placing)
		const maxDistance = 5

		if (distance > maxDistance) {
			// Cannot place block: too far away
			return false
		}

		if (selectedItem && this.world.getTile(tileX, tileY) === BLOCK_TYPES.AIR) {
			// Особая проверка для факелов
			if (
				selectedItem.itemType === BLOCK_TYPES.TORCH &&
				!this.canPlaceTorch(tileX, tileY)
			) {
				return false // Нельзя поставить факел без опоры
			}

			// Check if we have a valid item type
			const selectedItemType = selectedItem.itemType

			// Проверяем, можно ли разместить блок в мультиплеере
			if (
				window.multiplayerSystem &&
				window.multiplayerSystem.isInMultiplayerGame()
			) {
				// Get current wall type to maintain it in multiplayer sync
				const wallType = this.world.getWall(tileX, tileY)

				try {
					// Обновляем локальный мир сразу для лучшей обратной связи
					this.world.setTile(tileX, tileY, selectedItemType)

					// Мы уже проверили расстояние выше, поэтому просто отправляем обновление на сервер
					const success = window.multiplayerSystem.updateBlock(
						tileX,
						tileY,
						selectedItemType,
						wallType
					)

					// Check if the server update was successful
					if (success === false) {
						// Revert local change if server update failed
						this.world.setTile(tileX, tileY, BLOCK_TYPES.AIR)
						return false
					}

					// Просто используем предмет, так как блок уже был размещён локально
					this.inventory.useSelectedItem()
					return true
				} catch (error) {
					console.error('Error during block placement:', error)
					// Revert any local change on error
					this.world.setTile(tileX, tileY, BLOCK_TYPES.AIR)
					return false
				}
			} else {
				// Single player mode
				this.world.setTile(tileX, tileY, selectedItemType)
				this.inventory.useSelectedItem()
				return true
			}
		}

		return false
	}
}
