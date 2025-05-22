class World {
	constructor(width, height, existingData = null) {
		this.width = width
		this.height = height

		// Если есть существующие данные, используем их
		if (
			existingData &&
			existingData.tiles &&
			existingData.tiles.length === width * height
		) {
			this.tiles = existingData.tiles
			this.walls =
				existingData.walls || new Array(width * height).fill(WALL_TYPES.NONE)
		} else {
			// Иначе создаем новый мир
			this.tiles = new Array(width * height).fill(BLOCK_TYPES.AIR)
			this.walls = new Array(width * height).fill(WALL_TYPES.NONE)
			this.generate()
		}
	}

	generate() {
		// Упрощенная генерация мира
		const groundLevel = Math.floor(this.height * 0.4)

		// Create terrain surface (simplified)
		let currentHeight = groundLevel

		// First pass - basic terrain
		for (let x = 0; x < this.width; x++) {
			// Simpler terrain generation
			if (x % 8 === 0) {
				// Only change height every 8 blocks
				const change = Utils.randomInt(-2, 2)
				currentHeight += change
			}

			// Keep height within bounds
			currentHeight = Math.max(
				groundLevel - 10,
				Math.min(currentHeight, groundLevel + 5)
			)

			// Fill ground
			for (let y = currentHeight; y < this.height; y++) {
				if (y === currentHeight) {
					this.setTile(x, y, BLOCK_TYPES.GRASS)
					this.setWall(x, y, WALL_TYPES.DIRT) // Добавляем стены
				} else if (y < currentHeight + 5) {
					this.setTile(x, y, BLOCK_TYPES.DIRT)
					this.setWall(x, y, WALL_TYPES.DIRT) // Добавляем стены
				} else {
					this.setTile(x, y, BLOCK_TYPES.STONE)
					this.setWall(x, y, WALL_TYPES.STONE) // Добавляем стены
				}
			}

			// Добавляем стены выше уровня земли, чтобы обозначить "небо"
			for (let y = 0; y < currentHeight; y++) {
				this.setWall(x, y, WALL_TYPES.NONE)
			}

			// Add trees more frequently
			if (Math.random() < 0.08) {
				const treeHeight = Utils.randomInt(5, 8)

				// Trunk
				for (let ty = 1; ty <= treeHeight; ty++) {
					const y = currentHeight - ty
					if (y >= 0) {
						this.setTile(x, y, BLOCK_TYPES.WOOD)
					}
				}

				// Leaves (expanded)
				for (let lx = -2; lx <= 2; lx++) {
					for (let ly = -3; ly <= 0; ly++) {
						const y = currentHeight - treeHeight - ly
						const tx = x + lx

						// Make leaves more dense in the center, sparser at edges
						if (Math.abs(lx) === 2 && Math.random() > 0.5) continue

						if (
							y >= 0 &&
							tx >= 0 &&
							tx < this.width &&
							this.getTile(tx, y) === BLOCK_TYPES.AIR
						) {
							this.setTile(tx, y, BLOCK_TYPES.LEAVES)
						}
					}
				}
			}
		}

		// Second pass - add simpler caves
		this.generateSimpleCaves()

		// Add ores (less intensive)
		this.addSimpleOres()

		// Add just a few torches
		this.addSimpleTorches()
	}

	generateSimpleCaves() {
		// Create fewer, simpler caves
		const cavePoints = 5 // Much fewer cave starting points

		for (let i = 0; i < cavePoints; i++) {
			const x = Utils.randomInt(10, this.width - 10)
			const y = Utils.randomInt(Math.floor(this.height * 0.5), this.height - 5)

			// Make a simple cave
			this.carveSimpleCave(x, y)
		}
	}

	carveSimpleCave(startX, startY) {
		let x = startX
		let y = startY
		const caveLength = Utils.randomInt(20, 40)

		// Carve a simple winding path
		for (let i = 0; i < caveLength; i++) {
			// Carve a small room
			this.carveCircle(x, y, Utils.randomInt(2, 4))

			// Move in a random direction
			const dx = Utils.randomInt(-1, 1)
			const dy = Utils.randomInt(-1, 1)

			x += dx
			y += dy

			// Keep cave in bounds
			x = Math.max(1, Math.min(x, this.width - 2))
			y = Math.max(Math.floor(this.height * 0.4), Math.min(y, this.height - 2))
		}
	}

	// Новый улучшенный метод для проверки доступа к небу
	hasSkyAccess(x, y) {
		if (x < 0 || x >= this.width || y < 0) return false

		// Проверяем прямой доступ к небу (обычный случай)
		if (this.hasSkyAbove(x, y)) return true

		// Проверяем "косвенный" доступ через соединенные воздушные блоки
		// Это решает проблему с ямами, созданными игроком
		return this.hasIndirectSkyAccess(x, y, new Set())
	}

	// Рекурсивно проверяем, есть ли доступ к небу через соседние блоки
	hasIndirectSkyAccess(x, y, visited) {
		// Создаем ключ для текущего блока
		const key = `${x},${y}`

		// Если мы уже проверяли этот блок, не проверяем повторно
		if (visited.has(key)) return false

		// Добавляем блок в список проверенных
		visited.add(key)

		// Если текущий блок не воздух, доступа нет
		if (this.getTile(x, y) !== BLOCK_TYPES.AIR) return false

		// Если у блока есть прямой доступ к небу, возвращаем true
		if (this.hasSkyAbove(x, y)) return true

		// Ограничиваем глубину поиска (для оптимизации)
		if (visited.size > 100) return false

		// Проверяем соседние блоки
		// Проверяем только вверх и в стороны, но не вниз, чтобы не считать глубокие пещеры как имеющие доступ к небу
		if (this.hasIndirectSkyAccess(x, y - 1, visited)) return true // Вверх
		if (this.hasIndirectSkyAccess(x - 1, y, visited)) return true // Влево
		if (this.hasIndirectSkyAccess(x + 1, y, visited)) return true // Вправо

		// Доступ к небу не найден
		return false
	}

	carveCircle(centerX, centerY, radius) {
		const startX = Math.max(0, Math.floor(centerX - radius))
		const endX = Math.min(this.width - 1, Math.ceil(centerX + radius))
		const startY = Math.max(0, Math.floor(centerY - radius))
		const endY = Math.min(this.height - 1, Math.ceil(centerY + radius))

		for (let x = startX; x <= endX; x++) {
			for (let y = startY; y <= endY; y++) {
				const distance = Math.sqrt(
					Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
				)
				if (distance <= radius) {
					this.setTile(x, y, BLOCK_TYPES.AIR)
					// Не удаляем стены при генерации пещер!
					// Это позволяет видеть границы пещер
					this.setWall(x, y, WALL_TYPES.CAVE)
				}
			}
		}
	}

	addSimpleOres() {
		// Define ore types and their properties
		const ores = [
			{ type: BLOCK_TYPES.COAL_ORE, depth: 0.45, rarity: 0.3, veinSize: 5 }, // More common, closer to surface
			{ type: BLOCK_TYPES.COPPER_ORE, depth: 0.5, rarity: 0.35, veinSize: 4 },
			{ type: BLOCK_TYPES.IRON_ORE, depth: 0.6, rarity: 0.5, veinSize: 4 },
			{ type: BLOCK_TYPES.GOLD_ORE, depth: 0.75, rarity: 0.7, veinSize: 3 },
			{ type: BLOCK_TYPES.EMERALD_ORE, depth: 0.8, rarity: 0.8, veinSize: 2 },
			{
				type: BLOCK_TYPES.SAPPHIRE_ORE,
				depth: 0.82,
				rarity: 0.85,
				veinSize: 2,
			},
			{ type: BLOCK_TYPES.RUBY_ORE, depth: 0.85, rarity: 0.9, veinSize: 2 },
			{ type: BLOCK_TYPES.DIAMOND_ORE, depth: 0.9, rarity: 0.95, veinSize: 1 }, // Rare gemstone
			// Add high-tier rare ores deeper in the world
			{
				type: BLOCK_TYPES.TITANIUM_ORE,
				depth: 0.85,
				rarity: 0.87,
				veinSize: 3,
			},
			{
				type: BLOCK_TYPES.PLATINUM_ORE,
				depth: 0.88,
				rarity: 0.92,
				veinSize: 2,
			},
			{
				type: BLOCK_TYPES.OBSIDIAN_ORE,
				depth: 0.92,
				rarity: 0.96,
				veinSize: 2,
			},
			{ type: BLOCK_TYPES.MITHRIL_ORE, depth: 0.95, rarity: 0.98, veinSize: 1 }, // Rarest, deepest
		]

		// Generate veins for each ore type
		ores.forEach(ore => {
			// Calculate number of veins based on rarity (inverse - lower number means more common)
			const veinCount = Math.floor(40 * (1 - ore.rarity))
			const minDepth = Math.floor(this.height * ore.depth)

			for (let i = 0; i < veinCount; i++) {
				const x = Utils.randomInt(0, this.width - 1)
				const y = Utils.randomInt(minDepth, this.height - 1)

				// Only place ore in stone
				if (this.getTile(x, y) === BLOCK_TYPES.STONE) {
					// Create ore vein
					this.setTile(x, y, ore.type)

					// Add more blocks nearby to form a vein
					for (let j = 0; j < ore.veinSize; j++) {
						const nx = x + Utils.randomInt(-2, 2)
						const ny = y + Utils.randomInt(-2, 2)

						if (
							nx >= 0 &&
							nx < this.width &&
							ny >= 0 &&
							ny < this.height &&
							this.getTile(nx, ny) === BLOCK_TYPES.STONE
						) {
							this.setTile(nx, ny, ore.type)
						}
					}
				}
			}
		})
	}

	addSimpleTorches() {
		// Добавляем факелы возле точки спавна
		const centerX = Math.floor(this.width / 2)
		const centerY = Math.floor(this.height * 0.38)

		// Добавляем факелы вокруг точки спавна только если под ними есть блоки
		this.placeTorchIfValid(centerX - 5, centerY)
		this.placeTorchIfValid(centerX + 5, centerY)

		// Добавляем факелы в пещерах
		const surfaceLevel = Math.floor(this.height * 0.4)

		// Пытаемся разместить несколько факелов в пещерах
		for (let attempts = 0; attempts < 50; attempts++) {
			const x = Utils.randomInt(0, this.width - 1)
			const y = Utils.randomInt(surfaceLevel + 5, this.height - 5)

			this.placeTorchIfValid(x, y)
		}
	}

	placeTorchIfValid(x, y) {
		// Проверяем, что выбранная позиция находится в пределах мира
		if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
			return false
		}

		// Проверяем, что выбранная позиция - воздух
		if (this.getTile(x, y) !== BLOCK_TYPES.AIR) {
			return false
		}

		// Проверяем, есть ли под факелом твердый блок
		if (y < this.height - 1 && this.isSolidBlock(x, y + 1)) {
			// Размещаем факел на полу
			this.setTile(x, y, BLOCK_TYPES.TORCH)
			return true
		}

		// Проверяем возможность разместить факел на стене слева
		if (x > 0 && this.isSolidBlock(x - 1, y)) {
			// Размещаем факел на левой стене
			this.setTile(x, y, BLOCK_TYPES.TORCH)
			return true
		}

		// Проверяем возможность разместить факел на стене справа
		if (x < this.width - 1 && this.isSolidBlock(x + 1, y)) {
			// Размещаем факел на правой стене
			this.setTile(x, y, BLOCK_TYPES.TORCH)
			return true
		}

		// Не удалось разместить факел
		return false
	}

	isSolidBlock(x, y) {
		const blockType = this.getTile(x, y)
		return (
			blockType !== BLOCK_TYPES.AIR &&
			blockType !== BLOCK_TYPES.TORCH &&
			blockType !== BLOCK_TYPES.ROPE &&
			BLOCKS[blockType] &&
			BLOCKS[blockType].solid
		)
	}

	getTile(x, y) {
		if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
			return this.tiles[y * this.width + x]
		}
		return BLOCK_TYPES.AIR // Return air for out of bounds
	}

	// Alias for getTile to maintain compatibility with CraftingSystem
	getBlock(x, y) {
		return this.getTile(x, y)
	}

	setTile(x, y, blockType) {
		if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
			this.tiles[y * this.width + x] = blockType
		}
	}

	// Методы для работы со стенами
	getWall(x, y) {
		if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
			return this.walls[y * this.width + x]
		}
		return WALL_TYPES.NONE
	}

	setWall(x, y, wallType) {
		if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
			this.walls[y * this.width + x] = wallType
		}
	}

	// Метод для определения, является ли блок частью поверхности (имеет ли небо над собой)
	hasSkyAbove(x, y) {
		if (x < 0 || x >= this.width || y < 0) return false

		// Для кэша результатов мы можем использовать кэширование на уровне мира
		// Но в этой реализации просто оптимизируем проверку

		// Если y < surfaceLevel (примерная поверхность), то скорее всего есть доступ к небу
		const approximateSurfaceLevel = Math.floor(this.height * 0.4)
		if (y < approximateSurfaceLevel - 5) return true

		// Проверяем все блоки выше текущего
		for (let checkY = y - 1; checkY >= 0; checkY--) {
			if (this.getTile(x, checkY) !== BLOCK_TYPES.AIR) {
				return false
			}
		}

		return true
	}

	// Определяет глубину блока от поверхности
	getDepthFromSurface(x, y) {
		if (x < 0 || x >= this.width || y < 0) return -1

		// Найдем поверхностный блок в этой колонке
		let surfaceY = -1

		for (let checkY = 0; checkY < this.height; checkY++) {
			if (this.getTile(x, checkY) !== BLOCK_TYPES.AIR) {
				surfaceY = checkY
				break
			}
		}

		// Если поверхность не найдена или блок выше поверхности
		if (surfaceY === -1 || y < surfaceY) return 0

		// Возвращаем расстояние от поверхности
		return y - surfaceY
	}

	getLightSources() {
		// Оптимизировано - не сканируем весь мир
		return [] // Передаем обработку источников света рендереру
	}

	// При сохранении мира, сохраняем также и стены и инвентарь
	saveData() {
		// Get player inventory data if available
		let inventoryData = null
		if (window.player && window.player.inventory) {
			inventoryData = window.player.inventory.getSaveData()
		}

		return {
			tiles: this.tiles,
			walls: this.walls,
			width: this.width,
			height: this.height,
			inventory: inventoryData, // Save inventory with world data
		}
	}
}
