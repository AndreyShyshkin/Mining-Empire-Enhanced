class WorldManager {
	constructor() {
		// Определяем различные размеры миров - increased 3x
		this.worldSizes = {
			small: { width: 240, height: 150 },
			medium: { width: 360, height: 210 },
			large: { width: 600, height: 300 },
		}

		// Проверка поддержки localStorage
		this.storageAvailable = this.checkStorageAvailability()
	}

	// Проверка доступности localStorage
	checkStorageAvailability() {
		try {
			const storage = window.localStorage
			const testKey = '__storage_test__'
			storage.setItem(testKey, testKey)
			storage.removeItem(testKey)
			return true
		} catch (e) {
			console.warn('LocalStorage недоступен. Миры не будут сохраняться.')
			return false
		}
	}

	// Создание нового мира
	createWorld(name, sizeType) {
		// Генерируем уникальный ID для мира
		const worldId = 'world_' + Date.now()

		// Получаем параметры размера
		const worldSize = this.worldSizes[sizeType] || this.worldSizes.medium

		// Создаем метаданные мира
		const worldMeta = {
			id: worldId,
			name: name || 'Новый мир',
			sizeType: sizeType,
			width: worldSize.width,
			height: worldSize.height,
			createdAt: new Date().toISOString(),
			lastPlayed: new Date().toISOString(),
		}

		// Сохраняем метаданные
		this.saveWorldMeta(worldMeta)

		return worldMeta
	}

	// Сохранение метаданных мира
	saveWorldMeta(worldMeta) {
		if (this.storageAvailable) {
			// Получаем список мета-данных всех миров
			const worldsList = this.getWorldsList()

			// Обновляем или добавляем метаданные текущего мира
			const existingIndex = worldsList.findIndex(w => w.id === worldMeta.id)
			if (existingIndex >= 0) {
				worldsList[existingIndex] = worldMeta
			} else {
				worldsList.push(worldMeta)
			}

			// Сохраняем обновленный список
			localStorage.setItem('worlds_list', JSON.stringify(worldsList))
		}
	}

	// Получение списка всех миров
	getWorldsList() {
		if (this.storageAvailable) {
			const worldsListRaw = localStorage.getItem('worlds_list')
			return worldsListRaw ? JSON.parse(worldsListRaw) : []
		}
		return []
	}

	// Получение метаданных конкретного мира
	getWorldMeta(worldId) {
		const worldsList = this.getWorldsList()
		return worldsList.find(world => world.id === worldId) || null
	}

	// Удаление мира
	deleteWorld(worldId) {
		if (this.storageAvailable) {
			// Удаляем метаданные из списка
			const worldsList = this.getWorldsList()
			const updatedList = worldsList.filter(world => world.id !== worldId)
			localStorage.setItem('worlds_list', JSON.stringify(updatedList))

			// Удаляем данные мира
			localStorage.removeItem(`world_data_${worldId}`)
			return true
		}
		return false
	}

	// Сохранение мира
	// Обновите метод saveWorld в классе WorldManager для сохранения стен

	saveWorld(world, worldId) {
		if (this.storageAvailable) {
			try {
				// Сериализуем данные мира для хранения
				const worldData = world.saveData
					? world.saveData()
					: {
							tiles: world.tiles,
							walls: world.walls, // Добавлено сохранение стен
							width: world.width,
							height: world.height,
					  }

				// Сохраняем данные
				localStorage.setItem(`world_data_${worldId}`, JSON.stringify(worldData))

				// Обновляем дату последней игры
				const worldMeta = this.getWorldMeta(worldId)
				if (worldMeta) {
					worldMeta.lastPlayed = new Date().toISOString()
					this.saveWorldMeta(worldMeta)
				}

				return true
			} catch (e) {
				console.error('Ошибка сохранения мира:', e)
				alert(
					'Не удалось сохранить мир. Возможно, превышен лимит хранилища браузера.'
				)
				return false
			}
		}
		return false
	}

	// Загрузка мира
	loadWorld(worldId) {
		if (this.storageAvailable) {
			const worldDataRaw = localStorage.getItem(`world_data_${worldId}`)
			if (worldDataRaw) {
				try {
					// Разбор данных мира
					const worldData = JSON.parse(worldDataRaw)

					// Обновляем дату последней игры
					const worldMeta = this.getWorldMeta(worldId)
					if (worldMeta) {
						worldMeta.lastPlayed = new Date().toISOString()
						this.saveWorldMeta(worldMeta)
					}

					return worldData
				} catch (e) {
					console.error('Ошибка загрузки мира:', e)
					return null
				}
			}
		}
		return null
	}

	// Получение имени размера мира
	getSizeName(sizeType) {
		const sizeNames = {
			small: 'Маленький',
			medium: 'Средний',
			large: 'Большой',
		}
		return sizeNames[sizeType] || 'Средний'
	}

	// Форматирование даты для отображения
	formatDate(dateString) {
		const date = new Date(dateString)
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
	}
}
