class Renderer {
	constructor(canvas, world) {
		this.canvas = canvas
		this.ctx = canvas.getContext('2d')
		this.world = world
		this.camera = {
			x: 0,
			y: 0,
			width: canvas.width,
			height: canvas.height,
		}

		// Настройки рендеринга
		this.renderDistance = 20 // Расстояние прорисовки блоков от игрока

		// Настройки освещения
		this.daylight = 1.0 // Уровень дневного света
		this.surfaceLevel = Math.floor(this.world.height * 0.4)
		this.caveBackground = '#111111'
		this.minLightLevel = 0.03 // Уменьшаем минимальный уровень освещения
		this.lightRadius = 3
		this.daylightPenetration = 8
		// Добавим расширенную зону для расчетов освещения
		this.lightingExtension = 20 // Дополнительная область за пределами экрана для расчетов

		// Кэш освещенных областей для блоков вне экрана
		this.lightingCache = {}

		// Флаг, указывающий, что яма создана игроком
		this.playerDiggedAreas = {}

		// Новое свойство для хранения кэша блоков с небом
		this.skyAccessCache = {}

		// Настройки для корректировки освещения
		this.minLightLevel = 0.05 // Минимальный уровень освещения (очень темно)
		this.lightRadius = 3 // Уменьшенный радиус освещения

		// Параметры рассеивания дневного света
		this.daylightPenetration = 8 // На сколько блоков вниз проникает дневной свет
	}

	// Обновляет размеры вьюпорта при изменении размера экрана
	updateViewport(width, height) {
		this.camera.width = width
		this.camera.height = height

		// Обновляем размеры canvas, если они отличаются
		if (this.canvas.width !== width || this.canvas.height !== height) {
			this.canvas.width = width
			this.canvas.height = height
		}

		console.log(`Renderer viewport updated to ${width}x${height}`)

		// Обновляем позицию камеры, чтобы игрок оставался в центре
		if (window.player) {
			this.centerCameraOnPlayer(window.player)
		}
	}

	// Центрирование камеры на игроке
	centerCameraOnPlayer(player) {
		this.camera.x = player.x - this.canvas.width / 2
		this.camera.y = player.y - this.canvas.height / 2

		// Ограничиваем камеру границами мира
		this.camera.x = Math.max(
			0,
			Math.min(this.camera.x, this.world.width * BLOCK_SIZE - this.canvas.width)
		)
		this.camera.y = Math.max(
			0,
			Math.min(
				this.camera.y,
				this.world.height * BLOCK_SIZE - this.canvas.height
			)
		)
	}

	// Основная функция рендеринга
	render(player, time) {
		// Очистка канваса
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

		// Определяем положение игрока
		const playerTile = Utils.worldToTile(player.x, player.y)

		// Получаем диапазон видимых тайлов
		const startX = Math.max(0, Math.floor(this.camera.x / BLOCK_SIZE))
		const startY = Math.max(0, Math.floor(this.camera.y / BLOCK_SIZE))
		const endX = Math.min(
			this.world.width - 1,
			Math.ceil((this.camera.x + this.canvas.width) / BLOCK_SIZE)
		)
		const endY = Math.min(
			this.world.height - 1,
			Math.ceil((this.camera.y + this.canvas.height) / BLOCK_SIZE)
		)

		// Увеличиваем область для расчета освещения
		const lightStartX = Math.max(0, startX - this.lightingExtension)
		const lightStartY = Math.max(0, startY - this.lightingExtension)
		const lightEndX = Math.min(
			this.world.width - 1,
			endX + this.lightingExtension
		)
		const lightEndY = Math.min(
			this.world.height - 1,
			endY + this.lightingExtension
		)

		// Рисуем фон (сначала небо везде)
		this.drawSkyBackground()

		// Создаем карту освещения с расширенной областью
		const lightMap = this.createLightMap(
			lightStartX,
			lightStartY,
			lightEndX,
			lightEndY,
			playerTile
		)

		// Рисуем стены с учетом расширенного освещения
		for (let y = startY; y <= endY; y++) {
			for (let x = startX; x <= endX; x++) {
				// Пропускаем, если слишком далеко от игрока
				if (
					Math.abs(x - playerTile.x) > this.renderDistance ||
					Math.abs(y - playerTile.y) > this.renderDistance
				) {
					continue
				}

				// Получаем тип стены
				const wallType = this.world.getWall(x, y)
				if (wallType !== WALL_TYPES.NONE) {
					const screenX = x * BLOCK_SIZE - this.camera.x
					const screenY = y * BLOCK_SIZE - this.camera.y

					// Получаем освещение с учетом расширенной области
					const lightLevel = this.getLightLevelAt(
						x,
						y,
						lightMap,
						lightStartX,
						lightStartY
					)

					// Рисуем стену
					this.drawWall(wallType, screenX, screenY, lightLevel)
				}
			}
		}

		// Рисуем блоки
		for (let y = startY; y <= endY; y++) {
			for (let x = startX; x <= endX; x++) {
				// Пропускаем, если слишком далеко от игрока
				if (
					Math.abs(x - playerTile.x) > this.renderDistance ||
					Math.abs(y - playerTile.y) > this.renderDistance
				) {
					continue
				}

				const blockType = this.world.getTile(x, y)
				if (blockType !== BLOCK_TYPES.AIR) {
					const screenX = x * BLOCK_SIZE - this.camera.x
					const screenY = y * BLOCK_SIZE - this.camera.y

					// Получаем освещение с учетом расширенной области
					const lightLevel = this.getLightLevelAt(
						x,
						y,
						lightMap,
						lightStartX,
						lightStartY
					)

					// Рисуем блок
					this.drawBlock(blockType, screenX, screenY, lightLevel, time)
				}
			}
		}

		// Рисуем игрока
		const playerScreenX = player.x - this.camera.x
		const playerScreenY = player.y - this.camera.y

		// Игрок всегда хорошо видим
		this.ctx.fillStyle = '#FF0000'
		this.ctx.fillRect(
			playerScreenX - player.width / 2,
			playerScreenY - player.height / 2,
			player.width,
			player.height
		)

		// Глаза игрока
		this.ctx.fillStyle = 'white'
		const eyeSize = 4
		const eyeY = playerScreenY - 5
		const eyeOffset = player.direction === 'right' ? 5 : -5
		this.ctx.fillRect(playerScreenX + eyeOffset, eyeY, eyeSize, eyeSize)

		// Рисуем эффект добычи блока при активной добыче
		if (player.isMining) {
			const targetX = player.miningTarget.x * BLOCK_SIZE - this.camera.x
			const targetY = player.miningTarget.y * BLOCK_SIZE - this.camera.y

			this.ctx.strokeStyle = 'white'
			this.ctx.lineWidth = 2
			this.ctx.beginPath()
			this.ctx.moveTo(playerScreenX, playerScreenY)
			this.ctx.lineTo(targetX + BLOCK_SIZE / 2, targetY + BLOCK_SIZE / 2)
			this.ctx.stroke()

			// Рисуем прогресс добычи
			this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
			const progress = player.miningProgress / player.miningDuration
			this.ctx.fillRect(targetX, targetY, BLOCK_SIZE * progress, BLOCK_SIZE)
		}
	}

	// Новый метод для получения уровня освещения для блока
	getLightLevelAt(x, y, lightMap, lightStartX, lightStartY) {
		const lightX = x - lightStartX
		const lightY = y - lightStartY

		// Проверяем, находится ли блок в рассчитанной карте освещения
		if (
			lightX >= 0 &&
			lightX < lightMap[0].length &&
			lightY >= 0 &&
			lightY < lightMap.length
		) {
			return lightMap[lightY][lightX]
		}

		// Если блок за пределами рассчитанной области, используем кэш или значение по умолчанию
		const key = `${x},${y}`
		if (this.lightingCache[key] !== undefined) {
			return this.lightingCache[key]
		}

		// Если информации нет, проверяем доступ к небу
		if (this.world.hasSkyAccess(x, y)) {
			return this.daylight
		}

		return this.minLightLevel
	}

	// Рисование фона неба
	drawSkyBackground() {
		// Небесный фон (градиент)
		const skyGradient = this.ctx.createLinearGradient(
			0,
			0,
			0,
			this.canvas.height
		)
		skyGradient.addColorStop(0, '#87CEEB') // Голубое небо
		skyGradient.addColorStop(1, '#E0F7FA') // Светло-голубой
		this.ctx.fillStyle = skyGradient
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
	}

	// Метод для определения, является ли блок частью ямы, созданной игроком
	isPlayerDiggedHole(x, y) {
		// Проверяем кэш
		const key = `${x},${y}`
		if (this.playerDiggedAreas[key] !== undefined) {
			return this.playerDiggedAreas[key]
		}

		// Если это воздух, и рядом есть хотя бы один блок - это может быть яма
		if (this.world.getTile(x, y) === BLOCK_TYPES.AIR) {
			// Проверяем соседние блоки
			const hasSolidNeighbor =
				this.world.getTile(x - 1, y) !== BLOCK_TYPES.AIR ||
				this.world.getTile(x + 1, y) !== BLOCK_TYPES.AIR ||
				this.world.getTile(x, y - 1) !== BLOCK_TYPES.AIR ||
				this.world.getTile(x, y + 1) !== BLOCK_TYPES.AIR

			// Если рядом есть блок и стена не является естественной пещерой,
			// считаем это ямой, созданной игроком
			const result =
				hasSolidNeighbor &&
				(this.world.getWall(x, y) === WALL_TYPES.NONE ||
					this.world.getWall(x, y) === WALL_TYPES.CAVE)

			// Сохраняем в кэш
			this.playerDiggedAreas[key] = result
			return result
		}

		return false
	}

	// Создание карты освещения для видимой области
	createLightMap(startX, startY, endX, endY, playerTile) {
		const width = endX - startX + 1
		const height = endY - startY + 1

		// Safety check for playerTile
		playerTile = playerTile || { x: 0, y: 0 }

		// Инициализируем карту освещения минимальными значениями
		const lightMap = Array(height)
			.fill()
			.map(() => Array(width).fill(this.minLightLevel))

		// Шаг 1: Применяем только дневное освещение к блокам с прямым доступом к небу
		for (let x = startX; x <= endX; x++) {
			// Находим самый верхний блок в каждом столбце
			let firstSolidY = -1

			for (let y = 0; y <= endY; y++) {
				if (this.world.getTile(x, y) !== BLOCK_TYPES.AIR) {
					firstSolidY = y
					break
				}
			}

			// Если нашли поверхность, освещаем все блоки выше
			if (firstSolidY >= 0) {
				for (let y = startY; y < firstSolidY && y <= endY; y++) {
					lightMap[y - startY][x - startX] = this.daylight
				}

				// Применяем затухание света на небольшую глубину от поверхности
				const maxDepth = Math.min(firstSolidY + this.daylightPenetration, endY)
				for (let y = firstSolidY; y <= maxDepth; y++) {
					const depthFactor = (y - firstSolidY) / this.daylightPenetration
					const lightValue = this.daylight * Math.max(0, 1 - depthFactor)

					// Устанавливаем значение только если оно больше существующего
					if (y - startY >= 0 && y - startY < height) {
						lightMap[y - startY][x - startX] = Math.max(
							lightMap[y - startY][x - startX],
							lightValue
						)
					}
				}
			}
		}

		// Шаг 2: Добавляем свет от игрока с правильной физикой распространения
		if (window.player) {
			const playerWorldX = Math.floor(window.player.x / BLOCK_SIZE)
			const playerWorldY = Math.floor(window.player.y / BLOCK_SIZE)
			this.addPointLight(
				lightMap,
				playerWorldX,
				playerWorldY,
				3,
				startX,
				startY
			)
		} else if (
			playerTile &&
			playerTile.x !== undefined &&
			playerTile.y !== undefined
		) {
			// Используем переданные координаты игрока, если доступны и валидны
			this.addPointLight(
				lightMap,
				playerTile.x,
				playerTile.y,
				3,
				startX,
				startY
			)
		}

		// Шаг 3: Добавляем свет от факелов
		const torches = this.getVisibleTorches(startX, startY, endX, endY)
		for (const torch of torches) {
			this.addPointLight(lightMap, torch.x, torch.y, 3, startX, startY)
		}

		return lightMap
	}

	// Новый метод для добавления точечного источника света с точной физикой
	addPointLight(lightMap, sourceX, sourceY, intensity, offsetX, offsetY) {
		const radius = intensity * this.lightRadius

		// Радиус поиска в тайлах
		const searchRadius = Math.ceil(radius)

		// Перебираем все блоки в радиусе поиска
		for (let y = sourceY - searchRadius; y <= sourceY + searchRadius; y++) {
			for (let x = sourceX - searchRadius; x <= sourceX + searchRadius; x++) {
				// Проверяем, находится ли блок в пределах карты освещения
				const mapX = x - offsetX
				const mapY = y - offsetY

				if (
					mapX < 0 ||
					mapY < 0 ||
					mapX >= lightMap[0].length ||
					mapY >= lightMap.length
				) {
					continue
				}

				// Вычисляем расстояние от источника до текущего блока
				const dx = x - sourceX
				const dy = y - sourceY
				const distance = Math.sqrt(dx * dx + dy * dy)

				// Если блок в радиусе света
				if (distance <= searchRadius) {
					// Проверяем, есть ли прямая видимость между блоками
					const isVisible = this.hasLineOfSight(sourceX, sourceY, x, y)

					if (isVisible) {
						// Вычисляем интенсивность света с экспоненциальным затуханием
						const normalizedDistance = distance / searchRadius
						const lightValue = Math.exp(-4 * normalizedDistance)

						// Устанавливаем значение, если оно больше текущего
						lightMap[mapY][mapX] = Math.max(
							lightMap[mapY][mapX],
							Math.max(this.minLightLevel, lightValue)
						)
					}
				}
			}
		}
	}

	// Добавление источника света в карту освещения
	addLightSource(lightMap, sourceX, sourceY, intensity, offsetX, offsetY) {
		const radius = intensity * this.lightRadius // Радиус освещения

		// Округляем координаты источника для проверки препятствий
		const sourceTileX = Math.floor(sourceX)
		const sourceTileY = Math.floor(sourceY)

		// Границы области, на которую влияет источник света
		const startX = Math.max(0, Math.floor(sourceX - radius) - offsetX)
		const startY = Math.max(0, Math.floor(sourceY - radius) - offsetY)
		const endX = Math.min(
			lightMap[0].length - 1,
			Math.ceil(sourceX + radius) - offsetX
		)
		const endY = Math.min(
			lightMap.length - 1,
			Math.ceil(sourceY + radius) - offsetY
		)

		// Рассчитываем освещение для каждой точки в радиусе
		for (let y = startY; y <= endY; y++) {
			for (let x = startX; x <= endX; x++) {
				const worldX = x + offsetX
				const worldY = y + offsetY

				// Расстояние от источника до текущей точки
				const distance = Math.sqrt(
					Math.pow(worldX - sourceX, 2) + Math.pow(worldY - sourceY, 2)
				)

				if (distance <= radius) {
					// Проверяем, есть ли препятствия между источником и точкой
					// Проверяем только если точка не совпадает с источником
					let isVisible = true
					if (distance > 1.5) {
						// Небольшой порог для близких блоков
						isVisible = this.hasLineOfSight(
							sourceTileX,
							sourceTileY,
							Math.floor(worldX),
							Math.floor(worldY)
						)
					}

					if (isVisible) {
						// Новая формула затухания света - более равномерная во всех направлениях
						const normalizedDistance = distance / radius
						const lightFalloff = Math.exp(-3.5 * normalizedDistance) // Экспоненциальное затухание

						// Строго ограничиваем минимальным значением
						const lightIntensity = Math.max(this.minLightLevel, lightFalloff)

						// Обновляем карту освещения, если новое значение больше существующего
						lightMap[y][x] = Math.max(lightMap[y][x], lightIntensity)
					}
				}
			}
		}
	}

	// Алгоритм проверки прямой видимости между двумя точками
	hasLineOfSight(x1, y1, x2, y2) {
		// Проверяем тождественность точек
		if (x1 === x2 && y1 === y2) return true

		// Алгоритм Брезенхэма для построения линии
		const dx = Math.abs(x2 - x1)
		const dy = Math.abs(y2 - y1)
		const sx = x1 < x2 ? 1 : -1
		const sy = y1 < y2 ? 1 : -1
		let err = dx - dy

		let x = x1
		let y = y1

		// Проходим по линии между двумя точками
		while (true) {
			// Если достигли конечной точки, возвращаем true
			if (x === x2 && y === y2) return true

			// Проверяем текущую точку (кроме начальной)
			if (!(x === x1 && y === y1)) {
				// Если точка содержит твердый блок, свет не проходит
				const block = this.world.getTile(x, y)
				if (
					block !== BLOCK_TYPES.AIR &&
					block !== BLOCK_TYPES.TORCH &&
					block !== BLOCK_TYPES.ROPE
				) {
					return false
				}
			}

			// Вычисляем следующую точку на линии
			const e2 = 2 * err
			if (e2 > -dy) {
				if (x === x2) break
				err -= dy
				x += sx
			}
			if (e2 < dx) {
				if (y === y2) break
				err += dx
				y += sy
			}
		}

		return true
	}

	// Рисование стены
	drawWall(wallType, x, y, lightLevel) {
		const wall = WALLS[wallType]
		if (!wall) return

		// Определяем цвет стены с учетом освещения
		const baseColor = wall.texture
		const color = this.adjustColorByLight(baseColor, lightLevel)

		// Рисуем стену
		this.ctx.fillStyle = color
		this.ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE)
	}

	// Рисование блока с применением освещения
	drawBlock(blockType, x, y, lightLevel, time) {
		const block = BLOCKS[blockType]

		// Определяем цвет блока с учетом освещения
		const baseColor = block.texture
		const color = this.adjustColorByLight(baseColor, lightLevel)

		// Рисуем блок
		this.ctx.fillStyle = color
		this.ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE)

		// Рисуем границу блока
		this.ctx.strokeStyle = this.adjustColorByLight(
			'rgba(0, 0, 0, 0.3)',
			lightLevel
		)
		this.ctx.lineWidth = 1
		this.ctx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE)

		// Специальная отрисовка для разных типов блоков
		if (blockType === BLOCK_TYPES.TORCH) {
			// Рисуем пламя факела
			this.ctx.fillStyle = '#FFFF00'
			const flameSize = 4 + Math.sin(time / 200) * 1.5 // Уменьшенный размер
			this.ctx.beginPath()
			this.ctx.arc(x + BLOCK_SIZE / 2, y + 8, flameSize, 0, Math.PI * 2)
			this.ctx.fill()
		} else if (blockType === BLOCK_TYPES.ROPE) {
			// Рисуем текстуру веревки
			this.ctx.strokeStyle = this.adjustColorByLight('#8B4513', lightLevel)
			this.ctx.lineWidth = 3
			this.ctx.beginPath()
			this.ctx.moveTo(x + BLOCK_SIZE / 2, y)
			this.ctx.lineTo(x + BLOCK_SIZE / 2, y + BLOCK_SIZE)
			this.ctx.stroke()
		}
	}

	// Корректировка цвета в зависимости от уровня освещения
	adjustColorByLight(colorHex, lightLevel) {
		// Преобразуем hex в RGB
		let r, g, b

		if (colorHex.startsWith('#')) {
			// Для HEX формата
			r = parseInt(colorHex.slice(1, 3), 16)
			g = parseInt(colorHex.slice(3, 5), 16)
			b = parseInt(colorHex.slice(5, 7), 16)
		} else if (colorHex.startsWith('rgb')) {
			// Для RGB формата
			const match = colorHex.match(/\d+/g)
			if (match && match.length >= 3) {
				r = parseInt(match[0])
				g = parseInt(match[1])
				b = parseInt(match[2])
			} else {
				r = 128
				g = 128
				b = 128 // Значения по умолчанию
			}
		} else {
			r = 128
			g = 128
			b = 128 // Значения по умолчанию
		}

		// Применяем освещение (минимум очень низкая яркость)
		r = Math.floor(r * lightLevel)
		g = Math.floor(g * lightLevel)
		b = Math.floor(b * lightLevel)

		// Ограничиваем значения от 0 до 255
		r = Math.max(0, Math.min(255, r))
		g = Math.max(0, Math.min(255, g))
		b = Math.max(0, Math.min(255, b))

		return `rgb(${r}, ${g}, ${b})`
	}

	// Получение списка видимых факелов
	getVisibleTorches(startX, startY, endX, endY) {
		const torches = []
		const maxTorches = 15 // Уменьшаем лимит факелов

		// Сканируем видимую область
		for (let y = startY; y <= endY; y++) {
			for (let x = startX; x <= endX; x++) {
				if (this.world.getTile(x, y) === BLOCK_TYPES.TORCH) {
					torches.push({ x, y })
					if (torches.length >= maxTorches) {
						return torches
					}
				}
			}
		}

		return torches
	}
}
