// Система друзей
document.addEventListener('DOMContentLoaded', function () {
	// DOM элементы
	const friendsPanel = document.getElementById('friendsPanel')
	const friendSearchInput = document.getElementById('friendSearchInput')
	const searchFriendBtn = document.getElementById('searchFriendBtn')
	const searchResults = document.getElementById('searchResults')
	const friendRequests = document.getElementById('friendRequests')
	const friendsList = document.getElementById('friendsList')
	const requestsCount = document.getElementById('requestsCount')
	const friendsCount = document.getElementById('friendsCount')
	const backFromFriendsBtn = document.getElementById('backFromFriendsBtn')

	// Текущий пользователь
	let currentUser = null

	// Инициализация обработчиков событий
	if (searchFriendBtn) {
		searchFriendBtn.addEventListener('click', searchFriends)
	}

	if (backFromFriendsBtn) {
		backFromFriendsBtn.addEventListener('click', () => {
			if (window.gameMenu && window.gameMenu.showMainMenu) {
				window.gameMenu.showMainMenu()
			}
		})
	}

	// Прослушивание изменения статуса аутентификации
	window.onAuthStateChanged(window.firebaseAuth, async user => {
		currentUser = user

		// Если пользователь вошел в систему, проверяем запросы в друзья
		if (user) {
			// Добавляем небольшую задержку, чтобы дать интерфейсу загрузиться
			setTimeout(async () => {
				await checkFriendRequestsNotification()
			}, 1500)
		}
	})

	// Функция поиска друзей
	async function searchFriends() {
		if (!currentUser) return

		const query = friendSearchInput.value.trim().toLowerCase()
		if (!query) {
			showMessage(searchResults, 'Введите имя или email для поиска', 'error')
			return
		}

		searchResults.innerHTML = '<p>Поиск...</p>'

		try {
			// Получаем всех пользователей из базы данных
			const usersRef = window.dbRef(window.firebaseDatabase, 'users')
			const snapshot = await window.dbGet(usersRef)

			if (!snapshot.exists()) {
				showMessage(searchResults, 'Пользователи не найдены', 'error')
				return
			}

			const users = []
			const allUsers = snapshot.val()

			// Фильтрация пользователей по запросу
			for (const uid in allUsers) {
				if (uid !== currentUser.uid) {
					const user = allUsers[uid]
					const displayName = user.displayName || ''
					const email = user.email || ''

					if (
						displayName.toLowerCase().includes(query) ||
						email.toLowerCase().includes(query)
					) {
						users.push({
							uid,
							displayName: displayName || email.split('@')[0],
							email,
						})
					}
				}
			}

			// Отображение результатов поиска
			if (users.length === 0) {
				showMessage(searchResults, 'Пользователи не найдены', 'error')
			} else {
				displaySearchResults(users)
			}
		} catch (error) {
			console.error('Ошибка при поиске пользователей:', error)
			showMessage(searchResults, 'Произошла ошибка при поиске', 'error')
		}
	}

	// Отображение результатов поиска
	function displaySearchResults(users) {
		searchResults.innerHTML = ''

		users.forEach(async user => {
			const friendItem = document.createElement('div')
			friendItem.className = 'friend-item'

			const friendInfo = document.createElement('div')
			friendInfo.className = 'friend-info'

			const avatar = document.createElement('div')
			avatar.className = 'friend-avatar'
			avatar.textContent = user.displayName.charAt(0).toUpperCase()

			const nameContainer = document.createElement('div')

			const name = document.createElement('div')
			name.className = 'friend-name'
			name.textContent = user.displayName

			const email = document.createElement('div')
			email.className = 'friend-status'
			email.textContent = user.email

			nameContainer.appendChild(name)
			nameContainer.appendChild(email)

			friendInfo.appendChild(avatar)
			friendInfo.appendChild(nameContainer)

			const actions = document.createElement('div')
			actions.className = 'friend-actions'

			// Проверяем статус дружбы
			const friendshipStatus = await checkFriendshipStatus(user.uid)

			switch (friendshipStatus) {
				case 'none':
					const addButton = document.createElement('button')
					addButton.className = 'menu-button small'
					addButton.textContent = 'Добавить'
					addButton.addEventListener('click', () => sendFriendRequest(user.uid))
					actions.appendChild(addButton)
					break
				case 'requested':
					const pendingText = document.createElement('span')
					pendingText.textContent = 'Запрос отправлен'
					pendingText.style.color = '#aaa'
					actions.appendChild(pendingText)
					break
				case 'received':
					const acceptButton = document.createElement('button')
					acceptButton.className = 'menu-button small'
					acceptButton.textContent = 'Принять'
					acceptButton.addEventListener('click', () =>
						acceptFriendRequest(user.uid)
					)

					const rejectButton = document.createElement('button')
					rejectButton.className = 'menu-button small secondary'
					rejectButton.textContent = 'Отклонить'
					rejectButton.addEventListener('click', () =>
						rejectFriendRequest(user.uid)
					)

					actions.appendChild(acceptButton)
					actions.appendChild(rejectButton)
					break
				case 'friends':
					const friendsText = document.createElement('span')
					friendsText.textContent = 'Уже в друзьях'
					friendsText.style.color = '#4caf50'
					actions.appendChild(friendsText)
					break
			}

			friendItem.appendChild(friendInfo)
			friendItem.appendChild(actions)

			searchResults.appendChild(friendItem)
		})
	}

	// Проверка статуса дружбы
	async function checkFriendshipStatus(friendUid) {
		if (!currentUser) return 'none'

		try {
			// Проверка на исходящие запросы
			const sentRequestRef = window.dbRef(
				window.firebaseDatabase,
				`friendRequests/${currentUser.uid}/${friendUid}`
			)
			const sentRequest = await window.dbGet(sentRequestRef)

			if (sentRequest.exists()) {
				return 'requested'
			}

			// Проверка на входящие запросы
			const receivedRequestRef = window.dbRef(
				window.firebaseDatabase,
				`friendRequests/${friendUid}/${currentUser.uid}`
			)
			const receivedRequest = await window.dbGet(receivedRequestRef)

			if (receivedRequest.exists()) {
				return 'received'
			}

			// Проверка на существующую дружбу
			const friendshipRef = window.dbRef(
				window.firebaseDatabase,
				`friends/${currentUser.uid}/${friendUid}`
			)
			const friendship = await window.dbGet(friendshipRef)

			if (friendship.exists()) {
				return 'friends'
			}

			return 'none'
		} catch (error) {
			console.error('Ошибка при проверке статуса дружбы:', error)
			return 'none'
		}
	}

	// Отправка запроса в друзья
	async function sendFriendRequest(friendUid) {
		if (!currentUser) return

		try {
			// Сохраняем запрос в базу данных
			const requestRef = window.dbRef(
				window.firebaseDatabase,
				`friendRequests/${currentUser.uid}/${friendUid}`
			)

			await window.dbSet(requestRef, {
				status: 'pending',
				timestamp: new Date().toISOString(),
			})

			// Обновляем результаты поиска
			searchFriends()
			showMessage(searchResults, 'Запрос отправлен!', 'success')
		} catch (error) {
			console.error('Ошибка при отправке запроса в друзья:', error)
			showMessage(
				searchResults,
				'Произошла ошибка при отправке запроса',
				'error'
			)
		}
	}

	// Принятие запроса в друзья
	async function acceptFriendRequest(friendUid) {
		if (!currentUser) return

		try {
			// Получаем информацию о пользователях
			const currentUserRef = window.dbRef(
				window.firebaseDatabase,
				`users/${currentUser.uid}`
			)
			const friendUserRef = window.dbRef(
				window.firebaseDatabase,
				`users/${friendUid}`
			)

			const currentUserSnapshot = await window.dbGet(currentUserRef)
			const friendUserSnapshot = await window.dbGet(friendUserRef)

			const currentUserData = currentUserSnapshot.val()
			const friendUserData = friendUserSnapshot.val()

			// Добавляем друга в список друзей текущего пользователя
			const userFriendRef = window.dbRef(
				window.firebaseDatabase,
				`friends/${currentUser.uid}/${friendUid}`
			)

			await window.dbSet(userFriendRef, {
				email: friendUserData.email,
				displayName:
					friendUserData.displayName || friendUserData.email.split('@')[0],
				since: new Date().toISOString(),
			})

			// Добавляем текущего пользователя в список друзей друга
			const friendUserFriendRef = window.dbRef(
				window.firebaseDatabase,
				`friends/${friendUid}/${currentUser.uid}`
			)

			await window.dbSet(friendUserFriendRef, {
				email: currentUserData.email,
				displayName:
					currentUserData.displayName || currentUserData.email.split('@')[0],
				since: new Date().toISOString(),
			})

			// Удаляем запрос
			const requestRef = window.dbRef(
				window.firebaseDatabase,
				`friendRequests/${friendUid}/${currentUser.uid}`
			)

			await window.dbRemove(requestRef)

			// Обновляем UI
			loadFriendsList()
			searchFriends()
		} catch (error) {
			console.error('Ошибка при принятии запроса в друзья:', error)
		}
	}

	// Отклонение запроса в друзья
	async function rejectFriendRequest(friendUid) {
		if (!currentUser) return

		try {
			// Удаляем запрос
			const requestRef = window.dbRef(
				window.firebaseDatabase,
				`friendRequests/${friendUid}/${currentUser.uid}`
			)

			await window.dbRemove(requestRef)

			// Обновляем UI
			loadFriendRequests()
			searchFriends()
		} catch (error) {
			console.error('Ошибка при отклонении запроса в друзья:', error)
		}
	}

	// Удаление друга
	async function removeFriend(friendUid) {
		if (!currentUser) return

		try {
			// Удаляем друга из списка текущего пользователя
			const userFriendRef = window.dbRef(
				window.firebaseDatabase,
				`friends/${currentUser.uid}/${friendUid}`
			)

			await window.dbRemove(userFriendRef)

			// Удаляем текущего пользователя из списка друзей
			const friendUserFriendRef = window.dbRef(
				window.firebaseDatabase,
				`friends/${friendUid}/${currentUser.uid}`
			)

			await window.dbRemove(friendUserFriendRef)

			// Обновляем UI
			loadFriendsList()
		} catch (error) {
			console.error('Ошибка при удалении друга:', error)
		}
	}

	// Загрузка списка друзей
	async function loadFriendsList() {
		if (!currentUser) return

		try {
			// Загружаем входящие запросы
			await loadFriendRequests()

			// Загружаем список друзей
			const friendsRef = window.dbRef(
				window.firebaseDatabase,
				`friends/${currentUser.uid}`
			)

			const snapshot = await window.dbGet(friendsRef)

			if (!snapshot.exists()) {
				friendsList.innerHTML =
					'<p class="empty-list">У вас пока нет друзей</p>'
				friendsCount.textContent = '0'
				return
			}

			const friends = snapshot.val()
			const friendsArray = []

			for (const friendId in friends) {
				friendsArray.push({
					uid: friendId,
					...friends[friendId],
				})
			}

			// Сортируем по имени
			friendsArray.sort((a, b) => a.displayName.localeCompare(b.displayName))

			// Отображаем друзей
			displayFriends(friendsArray)
		} catch (error) {
			console.error('Ошибка при загрузке списка друзей:', error)
			friendsList.innerHTML =
				'<p class="empty-list">Ошибка при загрузке списка друзей</p>'
		}
	}

	// Загрузка входящих запросов в друзья
	async function loadFriendRequests() {
		if (!currentUser) return

		try {
			// Запрос к Firebase для получения входящих запросов
			const requestsRef = window.dbRef(
				window.firebaseDatabase,
				'friendRequests'
			)
			const snapshot = await window.dbGet(requestsRef)

			if (!snapshot.exists()) {
				friendRequests.innerHTML =
					'<p class="empty-list">У вас нет новых запросов в друзья</p>'
				requestsCount.textContent = '0'
				return
			}

			const allRequests = snapshot.val()
			const incomingRequests = []

			// Ищем запросы, отправленные текущему пользователю
			for (const senderId in allRequests) {
				const senderRequests = allRequests[senderId]

				if (senderRequests && senderRequests[currentUser.uid]) {
					// Получаем информацию о пользователе, отправившем запрос
					const senderRef = window.dbRef(
						window.firebaseDatabase,
						`users/${senderId}`
					)
					const senderSnapshot = await window.dbGet(senderRef)

					if (senderSnapshot.exists()) {
						const sender = senderSnapshot.val()
						incomingRequests.push({
							uid: senderId,
							displayName: sender.displayName || sender.email.split('@')[0],
							email: sender.email,
							timestamp: senderRequests[currentUser.uid].timestamp,
						})
					}
				}
			}

			// Отображаем запросы
			if (incomingRequests.length === 0) {
				friendRequests.innerHTML =
					'<p class="empty-list">У вас нет новых запросов в друзья</p>'
				requestsCount.textContent = '0'
			} else {
				displayFriendRequests(incomingRequests)
				requestsCount.textContent = incomingRequests.length
			}
		} catch (error) {
			console.error('Ошибка при загрузке запросов в друзья:', error)
			friendRequests.innerHTML =
				'<p class="empty-list">Ошибка при загрузке запросов</p>'
		}
	}

	// Отображение списка друзей
	function displayFriends(friends) {
		friendsList.innerHTML = ''

		if (friends.length === 0) {
			friendsList.innerHTML = '<p class="empty-list">У вас пока нет друзей</p>'
			friendsCount.textContent = '0'
			return
		}

		friendsCount.textContent = friends.length

		friends.forEach(friend => {
			const friendItem = document.createElement('div')
			friendItem.className = 'friend-item'

			const friendInfo = document.createElement('div')
			friendInfo.className = 'friend-info'

			const avatar = document.createElement('div')
			avatar.className = 'friend-avatar'
			avatar.textContent = friend.displayName.charAt(0).toUpperCase()

			const nameContainer = document.createElement('div')

			const name = document.createElement('div')
			name.className = 'friend-name'
			name.textContent = friend.displayName

			const email = document.createElement('div')
			email.className = 'friend-status'
			email.textContent = friend.email

			nameContainer.appendChild(name)
			nameContainer.appendChild(email)

			friendInfo.appendChild(avatar)
			friendInfo.appendChild(nameContainer)

			const actions = document.createElement('div')
			actions.className = 'friend-actions'

			const removeButton = document.createElement('button')
			removeButton.className = 'menu-button small secondary'
			removeButton.textContent = 'Удалить'
			removeButton.addEventListener('click', () => {
				if (
					confirm(
						`Вы уверены, что хотите удалить ${friend.displayName} из друзей?`
					)
				) {
					removeFriend(friend.uid)
				}
			})

			actions.appendChild(removeButton)

			friendItem.appendChild(friendInfo)
			friendItem.appendChild(actions)

			friendsList.appendChild(friendItem)
		})
	}

	// Отображение запросов в друзья
	function displayFriendRequests(requests) {
		friendRequests.innerHTML = ''

		requests.forEach(request => {
			const requestItem = document.createElement('div')
			requestItem.className = 'friend-item'

			const requestInfo = document.createElement('div')
			requestInfo.className = 'friend-info'

			const avatar = document.createElement('div')
			avatar.className = 'friend-avatar'
			avatar.textContent = request.displayName.charAt(0).toUpperCase()

			const nameContainer = document.createElement('div')

			const name = document.createElement('div')
			name.className = 'friend-name'
			name.textContent = request.displayName

			const email = document.createElement('div')
			email.className = 'friend-status'
			email.textContent = request.email

			nameContainer.appendChild(name)
			nameContainer.appendChild(email)

			requestInfo.appendChild(avatar)
			requestInfo.appendChild(nameContainer)

			const actions = document.createElement('div')
			actions.className = 'friend-actions'

			const acceptButton = document.createElement('button')
			acceptButton.className = 'menu-button small'
			acceptButton.textContent = 'Принять'
			acceptButton.addEventListener('click', () =>
				acceptFriendRequest(request.uid)
			)

			const rejectButton = document.createElement('button')
			rejectButton.className = 'menu-button small secondary'
			rejectButton.textContent = 'Отклонить'
			rejectButton.addEventListener('click', () =>
				rejectFriendRequest(request.uid)
			)

			actions.appendChild(acceptButton)
			actions.appendChild(rejectButton)

			requestItem.appendChild(requestInfo)
			requestItem.appendChild(actions)

			friendRequests.appendChild(requestItem)
		})
	}

	// Проверка и отображение уведомлений о запросах в друзья
	async function checkFriendRequestsNotification() {
		if (!currentUser) return

		try {
			// Проверяем наличие входящих запросов
			const count = await getIncomingRequestsCount()

			if (count > 0) {
				// Находим кнопку друзей и добавляем к ней уведомление
				const friendsBtn = document.getElementById('friendsBtn')
				if (friendsBtn) {
					// Проверяем, нет ли уже индикатора
					let indicator = friendsBtn.querySelector('.notification-indicator')

					if (!indicator) {
						indicator = document.createElement('span')
						indicator.className = 'notification-indicator'
						indicator.textContent = count
						friendsBtn.appendChild(indicator)
					} else {
						indicator.textContent = count
					}
				}
			}
		} catch (error) {
			console.error('Ошибка при проверке запросов в друзья:', error)
		}
	}

	// Получение количества входящих запросов в друзья
	async function getIncomingRequestsCount() {
		if (!currentUser) return 0

		try {
			// Запрос к Firebase для получения входящих запросов
			const requestsRef = window.dbRef(
				window.firebaseDatabase,
				'friendRequests'
			)
			const snapshot = await window.dbGet(requestsRef)

			if (!snapshot.exists()) {
				return 0
			}

			const allRequests = snapshot.val()
			let count = 0

			// Подсчет запросов, отправленных текущему пользователю
			for (const senderId in allRequests) {
				const senderRequests = allRequests[senderId]
				if (senderRequests && senderRequests[currentUser.uid]) {
					count++
				}
			}

			return count
		} catch (error) {
			console.error('Ошибка при получении количества запросов:', error)
			return 0
		}
	}

	// Вспомогательная функция для отображения сообщений
	function showMessage(container, message, type = 'info') {
		container.innerHTML = `<p class="${type}-message">${message}</p>`

		// Автоматически скрываем сообщение через 3 секунды
		if (type === 'success') {
			setTimeout(() => {
				container.innerHTML = ''
			}, 3000)
		}
	}

	// Экспортируем функцию в глобальную область видимости
	window.loadFriendsList = loadFriendsList
	window.checkFriendRequestsNotification = checkFriendRequestsNotification
})
