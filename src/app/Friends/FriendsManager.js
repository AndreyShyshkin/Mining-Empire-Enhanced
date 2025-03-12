import {
	getDatabase,
	ref,
	get,
	set,
	push,
	remove,
	query,
	orderByChild,
	equalTo,
	onValue,
	off,
} from 'firebase/database'
import { SaveManager } from '../Logic/SaveManager' // For showing notifications

export class FriendsManager {
	constructor(user) {
		this.user = user
		this.db = getDatabase()

		// DOM elements
		this.friendsList = document.querySelector('.friends-list')
		this.noFriendsMessage = document.querySelector('.no-friends-message')
		this.incomingRequestsList = document.querySelector(
			'.incoming-requests-list'
		)
		this.noIncomingRequestsMessage = document.querySelector(
			'#incoming-requests .no-requests-message'
		)
		this.outgoingRequestsList = document.querySelector(
			'.outgoing-requests-list'
		)
		this.noOutgoingRequestsMessage = document.querySelector(
			'#outgoing-requests .no-requests-message'
		)
		this.searchResultsList = document.querySelector('.search-results-list')
		this.noResultsMessage = document.querySelector('.no-results-message')

		// References
		this.userRef = ref(this.db, `users/${this.user.uid}`)
		this.friendsRef = ref(this.db, `users/${this.user.uid}/friends`)
		this.incomingRequestsRef = ref(
			this.db,
			`users/${this.user.uid}/friendRequests/incoming`
		)
		this.outgoingRequestsRef = ref(
			this.db,
			`users/${this.user.uid}/friendRequests/outgoing`
		)

		// Setup user profile if it doesn't exist
		this.setupUserProfile()

		// Setup listeners for real-time updates
		this.setupListeners()
	}

	// Initialize user profile
	async setupUserProfile() {
		try {
			const userSnapshot = await get(this.userRef)

			if (!userSnapshot.exists()) {
				// Create user profile
				await set(ref(this.db, `users/${this.user.uid}/profile`), {
					displayName:
						this.user.displayName || this.getUsernameFromEmail(this.user.email),
					email: this.user.email || '',
					photoURL: this.user.photoURL || '',
					userId: this.user.uid,
					createdAt: Date.now(),
				})

				// Initialize empty friends and requests lists
				await set(this.friendsRef, {})
				await set(ref(this.db, `users/${this.user.uid}/friendRequests`), {
					incoming: {},
					outgoing: {},
				})

				console.log('User profile created in database')
				this.showNotification('Profile created successfully!')
			}
		} catch (error) {
			console.error('Error setting up user profile:', error)
			this.showNotification('Failed to set up user profile')
		}
	}

	// Extract a username from email
	getUsernameFromEmail(email) {
		if (!email) return 'User'
		return email.split('@')[0]
	}

	// Setup listeners for real-time updates
	setupListeners() {
		// Listen for changes in friends list
		onValue(this.friendsRef, snapshot => {
			this.loadFriends()
		})

		// Listen for changes in incoming friend requests
		onValue(this.incomingRequestsRef, snapshot => {
			this.loadIncomingRequests()
		})

		// Listen for changes in outgoing friend requests
		onValue(this.outgoingRequestsRef, snapshot => {
			this.loadOutgoingRequests()
		})
	}

	// Clean up listeners when no longer needed
	cleanup() {
		off(this.friendsRef)
		off(this.incomingRequestsRef)
		off(this.outgoingRequestsRef)
	}

	// Load user's friends list
	async loadFriends() {
		try {
			const friendsSnapshot = await get(this.friendsRef)

			// Clear existing list
			this.friendsList.innerHTML = ''

			if (
				!friendsSnapshot.exists() ||
				Object.keys(friendsSnapshot.val() || {}).length === 0
			) {
				this.noFriendsMessage.style.display = 'block'
				return
			}

			this.noFriendsMessage.style.display = 'none'

			// Get friend IDs
			const friendIds = Object.keys(friendsSnapshot.val())

			// Fetch each friend's profile
			for (const friendId of friendIds) {
				const friendProfileSnapshot = await get(
					ref(this.db, `users/${friendId}/profile`)
				)

				if (friendProfileSnapshot.exists()) {
					const friendData = friendProfileSnapshot.val()

					const friendElement = document.createElement('li')
					friendElement.className = 'friend-item'
					friendElement.innerHTML = `
                        <div class="friend-info">
                            <span class="friend-name">${
															friendData.displayName
														}</span>
                            <span class="friend-email">${
															friendData.email || 'No email'
														}</span>
                        </div>
                        <div class="friend-actions">
                            <button class="friend-remove" data-user-id="${friendId}">Remove</button>
                        </div>
                    `

					// Add remove friend handler
					friendElement
						.querySelector('.friend-remove')
						.addEventListener('click', () => {
							this.removeFriend(friendId)
						})

					this.friendsList.appendChild(friendElement)
				}
			}
		} catch (error) {
			console.error('Error loading friends:', error)
			this.showNotification('Failed to load friends list')
		}
	}

	// Load both incoming and outgoing friend requests
	async loadFriendRequests() {
		this.loadIncomingRequests()
		this.loadOutgoingRequests()
	}

	// Load incoming friend requests
	async loadIncomingRequests() {
		try {
			const incomingRequestsSnapshot = await get(this.incomingRequestsRef)

			// Clear existing list
			this.incomingRequestsList.innerHTML = ''

			if (
				!incomingRequestsSnapshot.exists() ||
				Object.keys(incomingRequestsSnapshot.val() || {}).length === 0
			) {
				this.noIncomingRequestsMessage.style.display = 'block'
				return
			}

			this.noIncomingRequestsMessage.style.display = 'none'

			// Get request data
			const requests = incomingRequestsSnapshot.val()

			// Process each request
			for (const requesterId in requests) {
				const timestamp = requests[requesterId]

				// Get requester's profile
				const requesterProfileSnapshot = await get(
					ref(this.db, `users/${requesterId}/profile`)
				)

				if (requesterProfileSnapshot.exists()) {
					const requesterData = requesterProfileSnapshot.val()

					const requestElement = document.createElement('li')
					requestElement.className = 'request-item'
					requestElement.innerHTML = `
                        <div class="request-info">
                            <span class="request-name">${
															requesterData.displayName
														}</span>
                            <span class="request-email">${
															requesterData.email || 'No email'
														}</span>
                        </div>
                        <div class="request-actions">
                            <button class="request-accept" data-user-id="${requesterId}">Accept</button>
                            <button class="request-reject" data-user-id="${requesterId}">Reject</button>
                        </div>
                    `

					// Add accept and reject handlers
					requestElement
						.querySelector('.request-accept')
						.addEventListener('click', () => {
							this.acceptFriendRequest(requesterId)
						})

					requestElement
						.querySelector('.request-reject')
						.addEventListener('click', () => {
							this.rejectFriendRequest(requesterId)
						})

					this.incomingRequestsList.appendChild(requestElement)
				}
			}
		} catch (error) {
			console.error('Error loading incoming requests:', error)
			this.showNotification('Failed to load friend requests')
		}
	}

	// Load outgoing friend requests
	async loadOutgoingRequests() {
		try {
			const outgoingRequestsSnapshot = await get(this.outgoingRequestsRef)

			// Clear existing list
			this.outgoingRequestsList.innerHTML = ''

			if (
				!outgoingRequestsSnapshot.exists() ||
				Object.keys(outgoingRequestsSnapshot.val() || {}).length === 0
			) {
				this.noOutgoingRequestsMessage.style.display = 'block'
				return
			}

			this.noOutgoingRequestsMessage.style.display = 'none'

			// Get request data
			const requests = outgoingRequestsSnapshot.val()

			// Process each request
			for (const recipientId in requests) {
				const timestamp = requests[recipientId]

				// Get recipient's profile
				const recipientProfileSnapshot = await get(
					ref(this.db, `users/${recipientId}/profile`)
				)

				if (recipientProfileSnapshot.exists()) {
					const recipientData = recipientProfileSnapshot.val()

					const requestElement = document.createElement('li')
					requestElement.className = 'request-item'
					requestElement.innerHTML = `
                        <div class="request-info">
                            <span class="request-name">${
															recipientData.displayName
														}</span>
                            <span class="request-email">${
															recipientData.email || 'No email'
														}</span>
                        </div>
                        <div class="request-actions">
                            <button class="request-cancel" data-user-id="${recipientId}">Cancel</button>
                        </div>
                    `

					// Add cancel handler
					requestElement
						.querySelector('.request-cancel')
						.addEventListener('click', () => {
							this.cancelFriendRequest(recipientId)
						})

					this.outgoingRequestsList.appendChild(requestElement)
				}
			}
		} catch (error) {
			console.error('Error loading outgoing requests:', error)
			this.showNotification('Failed to load sent requests')
		}
	}

	// Search for users by email or display name
	async searchUsers(searchTerm) {
		try {
			// Clear previous results
			this.searchResultsList.innerHTML = ''
			this.noResultsMessage.style.display = 'none'

			if (!searchTerm || searchTerm.length < 3) {
				this.noResultsMessage.textContent = 'Please enter at least 3 characters'
				this.noResultsMessage.style.display = 'block'
				return
			}

			const results = []

			try {
				// Try to find by exact email match first using the indexed query
				const emailQuery = query(
					ref(this.db, 'users'),
					orderByChild('profile/email'),
					equalTo(searchTerm)
				)

				const emailSnapshot = await get(emailQuery)

				// Add users found by email
				if (emailSnapshot.exists()) {
					emailSnapshot.forEach(childSnapshot => {
						const userData = childSnapshot.val().profile
						if (childSnapshot.key !== this.user.uid) {
							results.push({
								id: childSnapshot.key,
								...userData,
							})
						}
					})
				}
			} catch (indexError) {
				// If we get an index error, log it but continue with the fallback approach
				console.warn(
					'Index error, using fallback search method:',
					indexError.message
				)
			}

			// If no email matches or if the query failed, get all users and filter manually
			if (results.length === 0) {
				const allUsersSnapshot = await get(ref(this.db, 'users'))

				if (allUsersSnapshot.exists()) {
					const searchTermLower = searchTerm.toLowerCase()

					allUsersSnapshot.forEach(childSnapshot => {
						const userData = childSnapshot.val().profile
						if (
							childSnapshot.key !== this.user.uid &&
							userData &&
							((userData.email &&
								userData.email.toLowerCase() === searchTermLower) ||
								(userData.displayName &&
									userData.displayName.toLowerCase().includes(searchTermLower)))
						) {
							// Check if this user is already in results
							if (!results.some(user => user.id === childSnapshot.key)) {
								results.push({
									id: childSnapshot.key,
									...userData,
								})
							}
						}
					})
				}
			}

			// Display results
			if (results.length === 0) {
				this.noResultsMessage.textContent = 'No users found'
				this.noResultsMessage.style.display = 'block'
				return
			}

			// Get current friends and requests for status checks
			const friendsSnapshot = await get(this.friendsRef)
			const incomingRequestsSnapshot = await get(this.incomingRequestsRef)
			const outgoingRequestsSnapshot = await get(this.outgoingRequestsRef)

			const friends = friendsSnapshot.exists() ? friendsSnapshot.val() : {}
			const incomingRequests = incomingRequestsSnapshot.exists()
				? incomingRequestsSnapshot.val()
				: {}
			const outgoingRequests = outgoingRequestsSnapshot.exists()
				? outgoingRequestsSnapshot.val()
				: {}

			// Display each result with appropriate action button
			results.forEach(user => {
				const userElement = document.createElement('li')
				userElement.className = 'search-item'

				let actionButton = ''

				if (friends[user.id]) {
					// Already friends
					actionButton = `<button class="friend-remove" data-user-id="${user.id}">Remove Friend</button>`
				} else if (outgoingRequests[user.id]) {
					// Request sent
					actionButton = `<button class="request-cancel" data-user-id="${user.id}">Cancel Request</button>`
				} else if (incomingRequests[user.id]) {
					// Request received
					actionButton = `
                        <button class="request-accept" data-user-id="${user.id}">Accept</button>
                        <button class="request-reject" data-user-id="${user.id}">Reject</button>
                    `
				} else {
					// No relationship, can send request
					actionButton = `<button class="send-request" data-user-id="${user.id}">Send Request</button>`
				}

				userElement.innerHTML = `
                    <div class="search-info">
                        <span class="search-name">${user.displayName}</span>
                        <span class="search-email">${
													user.email || 'No email'
												}</span>
                    </div>
                    <div class="search-actions">
                        ${actionButton}
                    </div>
                `

				// Add action button handlers
				if (friends[user.id]) {
					userElement
						.querySelector('.friend-remove')
						.addEventListener('click', () => {
							this.removeFriend(user.id)
						})
				} else if (outgoingRequests[user.id]) {
					userElement
						.querySelector('.request-cancel')
						.addEventListener('click', () => {
							this.cancelFriendRequest(user.id)
						})
				} else if (incomingRequests[user.id]) {
					userElement
						.querySelector('.request-accept')
						.addEventListener('click', () => {
							this.acceptFriendRequest(user.id)
						})
					userElement
						.querySelector('.request-reject')
						.addEventListener('click', () => {
							this.rejectFriendRequest(user.id)
						})
				} else {
					userElement
						.querySelector('.send-request')
						.addEventListener('click', () => {
							this.sendFriendRequest(user.id)
						})
				}

				this.searchResultsList.appendChild(userElement)
			})
		} catch (error) {
			console.error('Error searching for users:', error)
			this.showNotification('Failed to search for users')
		}
	}

	// Send a friend request to another user
	async sendFriendRequest(recipientId) {
		try {
			if (recipientId === this.user.uid) {
				this.showNotification("You can't send a friend request to yourself")
				return
			}

			const timestamp = Date.now()

			// Add request to recipient's incoming requests
			await set(
				ref(
					this.db,
					`users/${recipientId}/friendRequests/incoming/${this.user.uid}`
				),
				timestamp
			)

			// Add request to sender's outgoing requests
			await set(
				ref(
					this.db,
					`users/${this.user.uid}/friendRequests/outgoing/${recipientId}`
				),
				timestamp
			)

			// Show notification
			this.showNotification('Friend request sent')
		} catch (error) {
			console.error('Error sending friend request:', error)
			this.showNotification('Failed to send friend request')
		}
	}

	// Accept a friend request from another user
	async acceptFriendRequest(requesterId) {
		try {
			// Add to both users' friends lists
			await set(
				ref(this.db, `users/${this.user.uid}/friends/${requesterId}`),
				true
			)
			await set(
				ref(this.db, `users/${requesterId}/friends/${this.user.uid}`),
				true
			)

			// Remove from incoming requests
			await remove(
				ref(
					this.db,
					`users/${this.user.uid}/friendRequests/incoming/${requesterId}`
				)
			)

			// Remove from requester's outgoing requests
			await remove(
				ref(
					this.db,
					`users/${requesterId}/friendRequests/outgoing/${this.user.uid}`
				)
			)

			// Show notification
			this.showNotification('Friend request accepted')
		} catch (error) {
			console.error('Error accepting friend request:', error)
			this.showNotification('Failed to accept friend request')
		}
	}

	// Reject a friend request from another user
	async rejectFriendRequest(requesterId) {
		try {
			// Remove from incoming requests
			await remove(
				ref(
					this.db,
					`users/${this.user.uid}/friendRequests/incoming/${requesterId}`
				)
			)

			// Remove from requester's outgoing requests
			await remove(
				ref(
					this.db,
					`users/${requesterId}/friendRequests/outgoing/${this.user.uid}`
				)
			)

			// Show notification
			this.showNotification('Friend request rejected')
		} catch (error) {
			console.error('Error rejecting friend request:', error)
			this.showNotification('Failed to reject friend request')
		}
	}

	// Cancel a sent friend request
	async cancelFriendRequest(recipientId) {
		try {
			// Remove from recipient's incoming requests
			await remove(
				ref(
					this.db,
					`users/${recipientId}/friendRequests/incoming/${this.user.uid}`
				)
			)

			// Remove from outgoing requests
			await remove(
				ref(
					this.db,
					`users/${this.user.uid}/friendRequests/outgoing/${recipientId}`
				)
			)

			// Show notification
			this.showNotification('Friend request canceled')
		} catch (error) {
			console.error('Error canceling friend request:', error)
			this.showNotification('Failed to cancel friend request')
		}
	}

	// Remove a friend
	async removeFriend(friendId) {
		try {
			// Remove from both users' friends lists
			await remove(ref(this.db, `users/${this.user.uid}/friends/${friendId}`))
			await remove(ref(this.db, `users/${friendId}/friends/${this.user.uid}`))

			// Show notification
			this.showNotification('Friend removed')
		} catch (error) {
			console.error('Error removing friend:', error)
			this.showNotification('Failed to remove friend')
		}
	}

	// Show notification using SaveManager or fallback
	showNotification(message) {
		if (typeof SaveManager !== 'undefined' && SaveManager.showNotification) {
			SaveManager.showNotification(message)
		} else {
			// Fallback notification if SaveManager is not available
			const notification = document.querySelector('.notification')
			if (notification) {
				const notificationText = notification.querySelector('p')
				if (notificationText) {
					notificationText.textContent = message
					notification.style.display = 'block'

					setTimeout(() => {
						notification.style.display = 'none'
					}, 3000)
				} else {
					console.log('Notification:', message)
				}
			} else {
				console.log('Notification:', message)
			}
		}
	}
}
