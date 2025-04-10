import { Player } from './app/Entities/Player'
import { Canvas } from './app/Graphics/Canvas/Canvas'
import { Images } from './app/Graphics/Images'
import { Game } from './app/Logic/Game'
import { CreateImageByPath } from './app/Logic/RenderImage'
import { SaveManager } from './app/Logic/SaveManager'
import { SceneManager } from './app/Logic/SceneManager'
import { WorldManager } from './app/Logic/WorldManager'
import resurse from './app/Logic/inventory'
import cave from './app/Map/cave'
import village from './app/Map/village'
import { Vector2 } from './app/Math/Vector2'
// Firebase imports
import { initializeApp } from 'firebase/app'
import {
	createUserWithEmailAndPassword,
	getAuth,
	GoogleAuthProvider,
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signInWithPopup,
	signOut,
} from 'firebase/auth'
import {
	ref as dbRef,
	get,
	getDatabase,
	off,
	onValue,
	remove,
	set,
} from 'firebase/database'
import { FriendsManager } from './app/Friends/FriendsManager'
import { GameSynchronizer } from './app/Online/GameSynchronizer'

// Firebase configuration
const firebaseConfig = {
	apiKey: 'AIzaSyDCYUHZa1XuEH1fky3WkgOkWdvH79TdfXE',
	authDomain: 'mining-empire-enhanced.firebaseapp.com',
	databaseURL:
		'https://mining-empire-enhanced-default-rtdb.europe-west1.firebasedatabase.app',
	projectId: 'mining-empire-enhanced',
	storageBucket: 'mining-empire-enhanced.firebasestorage.app',
	messagingSenderId: '287033597190',
	appId: '1:287033597190:web:529a88526cef2040b05287',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

// DOM elements
const startScreen = document.querySelector('.startScreen')
const money = document.querySelector('.money')
const res1 = document.querySelector('.res1')
const res2 = document.querySelector('.res2')
const res3 = document.querySelector('.res3')
const res4 = document.querySelector('.res4')
const res5 = document.querySelector('.res5')
const res6 = document.querySelector('.res6')

// Auth elements
const authButton = document.querySelector('#authButton')
const userProfile = document.querySelector('.user-profile')
const username = document.querySelector('.username')
const logoutButton = document.querySelector('#logoutButton')
const authPopup = document.querySelector('#authPopup')
const authTitle = document.querySelector('#authTitle')
const emailInput = document.querySelector('#emailInput')
const passwordInput = document.querySelector('#passwordInput')
const loginButton = document.querySelector('#loginButton')
const registerButton = document.querySelector('#registerButton')
const googleAuthButton = document.querySelector('#googleAuthButton')
const toggleToRegister = document.querySelector('#toggleToRegister')
const toggleToLogin = document.querySelector('#toggleToLogin')
const authError = document.querySelector('#authError')
const closeAuth = document.querySelector('.close-auth')

// New Game Start Options
const newGameBtn = document.querySelector('#newGameBtn')
const loadGameBtn = document.querySelector('#loadGameBtn')
const newGamePopup = document.querySelector('#newGamePopup')
const seedInput = document.querySelector('#seedInput')
const startWithSeedBtn = document.querySelector('#startWithSeed')
const cancelSeedBtn = document.querySelector('.cancel-seed')
const loadSaveStartPopup = document.querySelector('#loadSaveStartPopup')
const loadSaveStartConfirm = document.querySelector('#loadSaveStartConfirm')
const saveStartTimestamp = document.querySelector('#saveStartTimestamp')

// Popup elements
const controlsBtn = document.querySelector('#controlsBtn')
const resourcesBtn = document.querySelector('#resourcesBtn')
const controlsPopup = document.querySelector('#controlsPopup')
const resourcesPopup = document.querySelector('#resourcesPopup')
const closeButtons = document.querySelectorAll('.close-popup')

// Settings elements
const settingsButton = document.querySelector('.settings-button')
const settingsPopup = document.querySelector('.settings-popup')
const settingsOptions = document.querySelector('.settings-options') // Added this line
const closeSettings = document.querySelector('.close-settings')
const mainMenuButton = document.querySelector('.main-menu-button')
const autoSaveToggle = document.querySelector('.auto-save-toggle')
const saveButton = document.querySelector('.save-button')

// World selection elements
const worldSelectionPopup = document.querySelector('#worldSelectionPopup')
const worldsList = document.querySelector('#worldsList')
const noWorldsMessage = document.querySelector('#noWorldsMessage')
const closeWorldSelection = document.querySelector('.close-world-selection')
const worldNameInput = document.querySelector('#worldNameInput')
const selectedWorldName = document.querySelector('#selectedWorldName')

// Add references to the seed display
const seedDisplay = document.querySelector('#seed-value')

// Friends elements
const friendsButton = document.querySelector('#friendsButton')
const friendsPopup = document.querySelector('#friendsPopup')
const closeFriends = document.querySelector('.close-friends')
const friendsTabButtons = document.querySelectorAll('.friends-tab-button')
const friendsTabs = document.querySelectorAll('.friends-tab-content')
const requestTabButtons = document.querySelectorAll('.request-tab-button')
const requestTabs = document.querySelectorAll('.requests-tab-content')
const searchButton = document.querySelector('#search-button')
const friendSearch = document.querySelector('#friend-search')

// Online play elements
const onlineGameBtn = document.querySelector('#onlineGameBtn')
const onlineWorldSelectionPopup = document.querySelector(
	'#onlineWorldSelectionPopup'
)
const closeOnlineWorldSelection = document.querySelector(
	'.close-online-world-selection'
)
const onlineWorldsList = document.querySelector('#onlineWorldsList')
const noOnlineWorldsMessage = document.querySelector('#noOnlineWorldsMessage')
const inviteFriendsPopup = document.querySelector('#inviteFriendsPopup')
const closeInvite = document.querySelector('.close-invite')
const inviteFriendsList = document.querySelector('.invite-friends-list')
const noInviteFriendsMessage = document.querySelector('#noInviteFriendsMessage')
const invitationReceivedPopup = document.querySelector(
	'#invitationReceivedPopup'
)
const closeInvitation = document.querySelector('.close-invitation')
const inviterName = document.querySelector('#inviterName')
const acceptInvitationBtn = document.querySelector('#acceptInvitationBtn')
const declineInvitationBtn = document.querySelector('#declineInvitationBtn')

let friendsManager // Will be initialized after auth state changes

// Online game state
let isOnlineGame = false
let currentInvitation = null
let onlineWorldId = null
let invitationsRef = null
let invitationListener = null

// Add this to the global variables section
let gameSynchronizer = null

// Game state
let game = new Game(
	Start,
	Update,
	() => {},
	() => {},
	() => {}
)
let SM = new SceneManager()
let player

// Initialize just enough for the start screen, but don't create the world yet
function initGame() {
	Canvas.Instance.updateSize()
	Canvas.Instance.GetLayerContext(0).drawImage(Images.back, 0, 0)
}

// Create a new game world with name and optional seed
function startNewGame(worldName, seed = null) {
	if (!worldName || worldName.trim() === '') {
		alert('Please enter a world name')
		return
	}

	// Create new world in SaveManager
	const worldData = SaveManager.createNewWorld(worldName, seed)

	if (!worldData) {
		alert('Failed to create new world')
		return
	}

	// Initialize the player
	let playerImg = CreateImageByPath('./assets/img/player1.png')
	player = new Player(
		new Vector2(920, 500),
		new Vector2(80, 80),
		playerImg,
		3,
		Vector2.Zero,
		SM
	)

	// Generate the village and cave
	village(SM.town.TC)
	cave()

	// Start auto-save
	SaveManager.startAutoSave()

	// Update seed display
	updateSeedDisplay(worldData.seed)

	// Close the start screen and go fullscreen
	closeStartScreen()
}

// Display the world selection UI
function showWorldSelection() {
	// Clear previous entries
	worldsList.innerHTML = ''

	// Get all saved worlds
	const worlds = SaveManager.getAllWorlds()
	const worldIds = Object.keys(worlds)

	if (worldIds.length === 0) {
		// No worlds found
		noWorldsMessage.style.display = 'block'
		worldsList.style.display = 'none'
	} else {
		// Sort worlds by last played time (most recent first)
		worldIds.sort((a, b) => worlds[b].lastPlayed - worlds[a].lastPlayed)

		// Display each world
		worldIds.forEach(worldId => {
			const world = worlds[worldId]

			const worldEntry = document.createElement('div')
			worldEntry.className = 'world-entry'
			worldEntry.dataset.worldId = worldId

			const lastPlayed = new Date(world.lastPlayed).toLocaleString()

			worldEntry.innerHTML = `
				<div class="world-entry-header">
					<div class="world-name">${world.name}</div>
					<button class="world-delete" data-world-id="${worldId}">✕</button>
				</div>
				<div class="world-seed">Seed: ${world.seed}</div>
				<div class="world-timestamp">Last played: ${lastPlayed}</div>
			`

			worldsList.appendChild(worldEntry)
		})

		// Add click handlers for world entries
		document.querySelectorAll('.world-entry').forEach(entry => {
			entry.addEventListener('click', e => {
				// Ignore clicks on the delete button
				if (e.target.classList.contains('world-delete')) {
					return
				}

				const worldId = entry.dataset.worldId
				const worldData = SaveManager.getWorldDetails(worldId)

				// Show confirmation dialog
				selectedWorldName.textContent = worldData.name
				worldSelectionPopup.style.display = 'none'
				loadSaveStartPopup.style.display = 'flex'
				loadSaveStartPopup.dataset.worldId = worldId
			})
		})

		// Add click handlers for delete buttons
		document.querySelectorAll('.world-delete').forEach(button => {
			button.addEventListener('click', e => {
				e.stopPropagation()

				const worldId = button.dataset.worldId
				const worldData = SaveManager.getWorldDetails(worldId)

				if (
					confirm(
						`Are you sure you want to delete the world "${worldData.name}"?`
					)
				) {
					SaveManager.deleteWorld(worldId)
					showWorldSelection() // Refresh the list
				}
			})
		})

		noWorldsMessage.style.display = 'none'
		worldsList.style.display = 'block'
	}

	worldSelectionPopup.style.display = 'flex'
}

// Load a saved game
function loadSavedGame(worldId) {
	console.log('Loading world:', worldId)

	// Initialize the player first
	let playerImg = CreateImageByPath('./assets/img/player1.png')
	player = new Player(
		new Vector2(920, 500),
		new Vector2(80, 80),
		playerImg,
		3,
		Vector2.Zero,
		SM
	)

	// Generate only the village initially - the cave will be regenerated when needed
	village(SM.town.TC)

	// Load the saved world
	if (SaveManager.loadWorld(worldId)) {
		SaveManager.showNotification('Game loaded successfully!')

		// Update seed display
		const worldManager = WorldManager.getInstance()
		updateSeedDisplay(worldManager.worldSeed)

		// If online game, initialize the game synchronizer
		if (isOnlineGame && auth.currentUser) {
			console.log('Starting online game mode')
			gameSynchronizer = new GameSynchronizer(
				auth.currentUser,
				worldId,
				player,
				SM
			)
			gameSynchronizer.start().catch(console.error)
		}
	} else {
		SaveManager.showNotification('Failed to load game')
		return
	}

	// Start auto-save
	SaveManager.startAutoSave()

	// Close the start screen and go fullscreen
	closeStartScreen()
}

function closeStartScreen() {
	startScreen.style.display = 'none'

	let element = document.documentElement
	if (element.requestFullscreen) {
		element.requestFullscreen()
	} else if (element.webkitRequestFullscreen) {
		element.webkitRequestFullscreen()
	} else if (element.mozRequestFullScreen) {
		element.mozRequestFullScreen()
	} else if (element.msRequestFullscreen) {
		element.msRequestFullscreen()
	}

	// Add invite friend button if it's an online game
	if (isOnlineGame) {
		console.log('Closing start screen in online game mode')
		setTimeout(() => {
			addInviteFriendButton()
		}, 500)
	}
}

// Function to update the seed display
function updateSeedDisplay(seed) {
	if (seedDisplay) {
		seedDisplay.textContent = seed || 'N/A'
	}
}

// Function to show online world selection
function showOnlineWorldSelection() {
	// Clear previous entries
	onlineWorldsList.innerHTML = ''

	// Get all saved worlds
	const worlds = SaveManager.getAllWorlds()
	const worldIds = Object.keys(worlds)

	if (worldIds.length === 0) {
		// No worlds found
		noOnlineWorldsMessage.style.display = 'block'
		onlineWorldsList.style.display = 'none'
	} else {
		// Sort worlds by last played time (most recent first)
		worldIds.sort((a, b) => worlds[b].lastPlayed - worlds[a].lastPlayed)

		// Display each world
		worldIds.forEach(worldId => {
			const world = worlds[worldId]

			const worldEntry = document.createElement('div')
			worldEntry.className = 'world-entry'
			worldEntry.dataset.worldId = worldId

			const lastPlayed = new Date(world.lastPlayed).toLocaleString()

			worldEntry.innerHTML = `
                <div class="world-entry-header">
                    <div class="world-name">${world.name}</div>
                </div>
                <div class="world-seed">Seed: ${world.seed}</div>
                <div class="world-timestamp">Last played: ${lastPlayed}</div>
            `

			// Add click handler for selecting a world for online play
			worldEntry.addEventListener('click', () => {
				onlineWorldId = worldId
				isOnlineGame = true
				onlineWorldSelectionPopup.style.display = 'none'
				loadSavedGame(worldId)

				// Make sure to add the invite button after a slight delay
				setTimeout(() => {
					addInviteFriendButton()
					console.log('Online game started, invite button should be added')
				}, 500)
			})

			onlineWorldsList.appendChild(worldEntry)
		})

		noOnlineWorldsMessage.style.display = 'none'
		onlineWorldsList.style.display = 'block'
	}

	onlineWorldSelectionPopup.style.display = 'flex'
}

// Function to add invite button to settings
function addInviteFriendButton() {
	// Remove existing invite button if it exists
	const existingButton = settingsOptions.querySelector('.invite-friend-button')
	if (existingButton) {
		existingButton.remove()
	}

	if (isOnlineGame) {
		console.log('Adding invite button to settings')
		// Create invite button
		const inviteButton = document.createElement('div')
		inviteButton.className = 'invite-friend-button'
		inviteButton.textContent = 'Invite Friend'

		// Create a completely new and simplified click handler
		inviteButton.onclick = function (e) {
			e.preventDefault()
			e.stopPropagation()

			// Hide settings
			settingsPopup.style.display = 'none'

			// Create standalone invite popup using a completely different approach
			createStandaloneInvitePopup()

			return false
		}

		// Add button to settings popup
		settingsOptions.appendChild(inviteButton)
	}
}

// Brand new function to create a standalone invite popup
function createStandaloneInvitePopup() {
	console.log('Creating standalone invite popup')

	// Remove any existing standalone popups
	const existingPopup = document.getElementById('standalone-invite-popup')
	if (existingPopup) {
		document.body.removeChild(existingPopup)
	}

	// Create popup container with inline styles
	const popupContainer = document.createElement('div')
	popupContainer.id = 'standalone-invite-popup'

	// Set fixed styles that won't inherit or be overridden
	const containerStyle = {
		position: 'fixed',
		top: '0',
		left: '0',
		width: '100%',
		height: '100%',
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
		zIndex: '99999',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		fontFamily: 'Arial, sans-serif',
	}

	// Apply styles
	Object.assign(popupContainer.style, containerStyle)

	// Create popup content
	const popupContent = document.createElement('div')

	// Set content styles
	const contentStyle = {
		width: '90%',
		maxWidth: '400px',
		backgroundColor: '#111',
		border: '5px solid goldenrod',
		borderRadius: '15px',
		padding: '20px',
		color: 'white',
		boxShadow: '0 0 30px rgba(218, 165, 32, 0.7)',
		position: 'relative',
	}

	// Apply styles
	Object.assign(popupContent.style, contentStyle)

	// Add title
	const title = document.createElement('h2')
	title.textContent = 'Invite Friends to Play'
	title.style.textAlign = 'center'
	title.style.margin = '0 0 20px 0'
	title.style.color = 'white'
	title.style.fontSize = '24px'
	popupContent.appendChild(title)

	// Add close button
	const closeButton = document.createElement('span')
	closeButton.textContent = '×'
	const closeButtonStyle = {
		position: 'absolute',
		top: '10px',
		right: '15px',
		fontSize: '30px',
		fontWeight: 'bold',
		color: 'white',
		cursor: 'pointer',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		width: '30px',
		height: '30px',
		borderRadius: '50%',
		textAlign: 'center',
		lineHeight: '30px',
	}
	Object.assign(closeButton.style, closeButtonStyle)

	// Close button event
	closeButton.onclick = function () {
		document.body.removeChild(popupContainer)
	}

	popupContent.appendChild(closeButton)

	// Create loading message
	const loadingMessage = document.createElement('div')
	loadingMessage.id = 'standalone-loading-message'
	loadingMessage.textContent = 'Loading friends list...'
	loadingMessage.style.padding = '20px'
	loadingMessage.style.textAlign = 'center'
	loadingMessage.style.color = 'white'

	popupContent.appendChild(loadingMessage)

	// Create friends list container
	const friendsListContainer = document.createElement('ul')
	friendsListContainer.id = 'standalone-friends-list'
	friendsListContainer.style.listStyleType = 'none'
	friendsListContainer.style.padding = '0'
	friendsListContainer.style.margin = '10px 0'
	friendsListContainer.style.maxHeight = '300px'
	friendsListContainer.style.overflowY = 'auto'
	friendsListContainer.style.border = '2px solid rgba(218, 165, 32, 0.5)'
	friendsListContainer.style.borderRadius = '5px'
	friendsListContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'

	popupContent.appendChild(friendsListContainer)

	// Add popup content to container
	popupContainer.appendChild(popupContent)

	// Add to body
	document.body.appendChild(popupContainer)

	// Now load friends
	loadFriendsForStandalonePopup()
}

// Function to load friends for the standalone popup
function loadFriendsForStandalonePopup() {
	if (!auth.currentUser) {
		const loadingMessage = document.getElementById('standalone-loading-message')
		if (loadingMessage) {
			loadingMessage.textContent = 'You need to be logged in to invite friends.'
		}
		return
	}

	console.log('Loading friends for standalone popup')
	const db = getDatabase()
	const friendsListContainer = document.getElementById(
		'standalone-friends-list'
	)
	const loadingMessage = document.getElementById('standalone-loading-message')

	get(dbRef(db, `users/${auth.currentUser.uid}/friends`))
		.then(snapshot => {
			if (snapshot.exists() && Object.keys(snapshot.val()).length > 0) {
				const friendIds = Object.keys(snapshot.val())
				console.log(`Found ${friendIds.length} friends`)

				// Hide loading message
				if (loadingMessage) loadingMessage.style.display = 'none'

				let processedCount = 0

				// Process each friend
				friendIds.forEach(friendId => {
					get(dbRef(db, `users/${friendId}/profile`))
						.then(friendSnapshot => {
							processedCount++

							if (friendSnapshot.exists()) {
								const friendData = friendSnapshot.val()

								// Create friend list item
								const listItem = document.createElement('li')

								const itemStyle = {
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									backgroundColor: 'rgba(218, 165, 32, 0.2)',
									border: '1px solid sienna',
									borderRadius: '5px',
									padding: '12px',
									margin: '10px 0',
									color: 'white',
								}

								Object.assign(listItem.style, itemStyle)

								// Create friend info
								const friendInfo = document.createElement('div')
								friendInfo.style.flexGrow = '1'

								const friendName = document.createElement('div')
								friendName.textContent = friendData.displayName
								friendName.style.fontWeight = 'bold'
								friendName.style.fontSize = '16px'

								friendInfo.appendChild(friendName)

								// Create invite button
								const inviteButton = document.createElement('button')
								inviteButton.textContent = 'Invite'

								const buttonStyle = {
									backgroundColor: '#5cb85c',
									color: 'white',
									border: 'none',
									borderRadius: '5px',
									padding: '8px 15px',
									cursor: 'pointer',
									fontWeight: 'bold',
									marginLeft: '10px',
								}

								Object.assign(inviteButton.style, buttonStyle)

								// Button click handler
								inviteButton.onclick = function () {
									sendStandaloneInvitation(friendId, friendData.displayName)
								}

								// Add elements to list item
								listItem.appendChild(friendInfo)
								listItem.appendChild(inviteButton)

								// Add list item to container
								if (friendsListContainer) {
									friendsListContainer.appendChild(listItem)
								}
							}
						})
						.catch(err => {
							console.error('Error fetching friend data:', err)
						})
				})
			} else {
				if (loadingMessage) {
					loadingMessage.textContent = "You don't have any friends to invite."
				}
			}
		})
		.catch(err => {
			console.error('Error fetching friends:', err)
			if (loadingMessage) {
				loadingMessage.textContent = 'Error loading friends list.'
			}
		})
}

// Function to send invitation from standalone popup
function sendStandaloneInvitation(friendId, friendName) {
	console.log(`Sending standalone invitation to: ${friendName}`)

	if (!auth.currentUser || !onlineWorldId) {
		alert(
			'Cannot send invitation. Please make sure you are logged in and have selected a world.'
		)
		return
	}

	const db = getDatabase()
	const worldName = SaveManager.getWorldDetails(onlineWorldId).name

	// Create status message
	const popup = document.getElementById('standalone-invite-popup')
	const statusMessage = document.createElement('div')
	statusMessage.textContent = `Sending invitation to ${friendName}...`
	statusMessage.style.textAlign = 'center'
	statusMessage.style.color = 'white'
	statusMessage.style.padding = '15px'
	statusMessage.style.margin = '10px 0'
	statusMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
	statusMessage.style.borderRadius = '5px'

	// Find the popup content
	if (popup.firstChild) {
		popup.firstChild.appendChild(statusMessage)
	}

	// Send the invitation
	const invitationData = {
		fromId: auth.currentUser.uid,
		fromName: auth.currentUser.displayName || auth.currentUser.email,
		worldId: onlineWorldId,
		worldName: worldName,
		timestamp: Date.now(),
	}

	set(
		dbRef(db, `users/${friendId}/invitations/${auth.currentUser.uid}`),
		invitationData
	)
		.then(() => {
			statusMessage.textContent = `Invitation sent to ${friendName}!`
			statusMessage.style.color = 'green'

			// Close popup after delay
			setTimeout(() => {
				if (document.getElementById('standalone-invite-popup')) {
					document.body.removeChild(
						document.getElementById('standalone-invite-popup')
					)
				}
			}, 2000)
		})
		.catch(error => {
			console.error('Error sending invitation:', error)
			statusMessage.textContent = 'Failed to send invitation'
			statusMessage.style.color = 'red'
		})
}

function drawText(context, text, x, y, font, color, align = 'left') {
	context.font = font
	context.fillStyle = color
	context.textAlign = align
	context.fillText(text, x, y)
}

// Auth event listeners
authButton.addEventListener('click', () => {
	authPopup.style.display = 'flex'
})

closeAuth.addEventListener('click', () => {
	authPopup.style.display = 'none'
	clearAuthInputs()
})

toggleToRegister.addEventListener('click', () => {
	authTitle.textContent = 'Register'
	loginButton.style.display = 'none'
	registerButton.style.display = 'block'
	toggleToRegister.style.display = 'none'
	toggleToLogin.style.display = 'block'
	authError.textContent = ''
})

toggleToLogin.addEventListener('click', () => {
	authTitle.textContent = 'Login'
	loginButton.style.display = 'block'
	registerButton.style.display = 'none'
	toggleToRegister.style.display = 'block'
	toggleToLogin.style.display = 'none'
	authError.textContent = ''
})

loginButton.addEventListener('click', () => {
	const email = emailInput.value
	const password = passwordInput.value

	if (!email || !password) {
		authError.textContent = 'Please enter both email and password'
		return
	}

	signInWithEmailAndPassword(auth, email, password)
		.then(userCredential => {
			// Login successful
			authPopup.style.display = 'none'
			clearAuthInputs()
		})
		.catch(error => {
			// Show error message
			authError.textContent = getAuthErrorMessage(error.code)
		})
})

registerButton.addEventListener('click', () => {
	const email = emailInput.value
	const password = passwordInput.value

	if (!email || !password) {
		authError.textContent = 'Please enter both email and password'
		return
	}

	if (password.length < 6) {
		authError.textContent = 'Password must be at least 6 characters'
		return
	}

	createUserWithEmailAndPassword(auth, email, password)
		.then(userCredential => {
			// Registration successful
			authPopup.style.display = 'none'
			clearAuthInputs()
		})
		.catch(error => {
			// Show error message
			authError.textContent = getAuthErrorMessage(error.code)
		})
})

googleAuthButton.addEventListener('click', () => {
	signInWithPopup(auth, googleProvider)
		.then(result => {
			// Google sign-in successful
			authPopup.style.display = 'none'
			clearAuthInputs()
		})
		.catch(error => {
			// Show error message
			authError.textContent = getAuthErrorMessage(error.code)
		})
})

// Logout event listener
logoutButton.addEventListener('click', () => {
	signOut(auth)
		.then(() => {
			// Logout successful
			authButton.style.display = 'block'
			userProfile.style.display = 'none'
			SaveManager.showNotification('Logged out successfully')
		})
		.catch(error => {
			// Show error message
			SaveManager.showNotification('Failed to log out')
			console.error('Logout error:', error)
		})
})

// Monitor auth state changes
onAuthStateChanged(auth, user => {
	if (user) {
		// User is signed in
		authButton.style.display = 'none'
		userProfile.style.display = 'flex'
		username.textContent = user.displayName || user.email

		// Initialize the FriendsManager after authentication
		friendsManager = new FriendsManager(user)

		// Enable the friends button
		friendsButton.style.display = 'block'

		// Set up invitation listener when signed in
		setupInvitationListener()
	} else {
		// User is signed out
		authButton.style.display = 'block'
		userProfile.style.display = 'none'

		// Disable the friends functionality
		friendsButton.style.display = 'none'

		// Hide friends popup if it's open
		friendsPopup.style.display = 'none'

		// Clean up invitation listener when signed out
		cleanupInvitationListener()
	}
})

// Friends functionality event listeners
friendsButton.addEventListener('click', () => {
	friendsPopup.style.display = 'flex'
	// Load friends list
	if (friendsManager) {
		friendsManager.loadFriends()
		friendsManager.loadFriendRequests()
	}
})

closeFriends.addEventListener('click', () => {
	friendsPopup.style.display = 'none'
})

// Tab switching for friends popup
friendsTabButtons.forEach(button => {
	button.addEventListener('click', () => {
		// Remove active class from all buttons and tabs
		friendsTabButtons.forEach(btn => btn.classList.remove('active'))
		friendsTabs.forEach(tab => tab.classList.remove('active'))

		// Add active class to clicked button
		button.classList.add('active')

		// Show corresponding tab
		const tabId = button.getAttribute('data-tab')
		document.getElementById(tabId).classList.add('active')

		// If on find friends tab, focus the search input
		if (tabId === 'find-friends') {
			friendSearch.focus()
		}
	})
})

// Tab switching for requests
requestTabButtons.forEach(button => {
	button.addEventListener('click', () => {
		// Remove active class from all buttons and tabs
		requestTabButtons.forEach(btn => btn.classList.remove('active'))
		requestTabs.forEach(tab => tab.classList.remove('active'))

		// Add active class to clicked button
		button.classList.add('active')

		// Show corresponding tab
		const tabId = button.getAttribute('data-tab')
		document.getElementById(tabId).classList.add('active')
	})
})

// Search functionality
searchButton.addEventListener('click', () => {
	const searchTerm = friendSearch.value.trim()
	if (searchTerm && friendsManager) {
		friendsManager.searchUsers(searchTerm)
	}
})

friendSearch.addEventListener('keydown', e => {
	if (e.key === 'Enter') {
		const searchTerm = friendSearch.value.trim()
		if (searchTerm && friendsManager) {
			friendsManager.searchUsers(searchTerm)
		}
	}
})

// Close friends popup when clicking outside
window.addEventListener('click', event => {
	if (event.target === friendsPopup) {
		friendsPopup.style.display = 'none'
	}
	// ...existing window click handlers...
})

// Helper function to clear auth inputs
function clearAuthInputs() {
	emailInput.value = ''
	passwordInput.value = ''
	authError.textContent = ''
}

// Function to get user-friendly error messages
function getAuthErrorMessage(errorCode) {
	switch (errorCode) {
		case 'auth/invalid-email':
			return 'Invalid email address'
		case 'auth/user-disabled':
			return 'This account has been disabled'
		case 'auth/user-not-found':
			return 'User not found'
		case 'auth/wrong-password':
			return 'Incorrect password'
		case 'auth/email-already-in-use':
			return 'Email already in use'
		case 'auth/weak-password':
			return 'Password is too weak'
		case 'auth/popup-closed-by-user':
			return 'Sign-in popup was closed before finishing'
		default:
			return 'An error occurred. Please try again.'
	}
}

// Additional window click handler for auth popup
window.addEventListener('click', event => {
	if (event.target === authPopup) {
		authPopup.style.display = 'none'
		clearAuthInputs()
	}
	// ...existing window click handlers...
})

// Event Listeners for Online Play
onlineGameBtn.addEventListener('click', () => {
	if (auth.currentUser) {
		showOnlineWorldSelection()
	} else {
		SaveManager.showNotification('Please log in to play online')
		authPopup.style.display = 'flex'
	}
})

closeOnlineWorldSelection.addEventListener('click', () => {
	onlineWorldSelectionPopup.style.display = 'none'
})

closeInvite.addEventListener('click', event => {
	event.preventDefault()
	event.stopPropagation()
	closeInviteFriendsPopup() // Use the central close function
})

// Add event listener for the entire popup to prevent click outside behavior
inviteFriendsPopup.addEventListener('click', event => {
	if (event.target === inviteFriendsPopup) {
		event.preventDefault()
		event.stopPropagation()
		closeInviteFriendsPopup() // Use the central close function
	}
})

closeInvitation.addEventListener('click', () => {
	invitationReceivedPopup.style.display = 'none'
})

acceptInvitationBtn.addEventListener('click', () => {
	acceptInvitation()
})

declineInvitationBtn.addEventListener('click', () => {
	declineInvitation()
})

// Also add a similar safeguard for ESC key to close popups
document.addEventListener('keydown', event => {
	if (event.key === 'Escape') {
		// If invite popup is visible, close it properly
		if (inviteFriendsPopup.style.display === 'flex') {
			closeInviteFriendsPopup()
		}

		// Make sure the body class is removed
		document.body.classList.remove('showing-invite-popup')
	}
})

// Add a function to ensure popups are visible when they should be
function checkPopupVisibility() {
	if (
		document.body.classList.contains('showing-invite-popup') &&
		window.getComputedStyle(inviteFriendsPopup).display !== 'flex'
	) {
		inviteFriendsPopup.style.cssText =
			'display: flex !important; z-index: 9999 !important;'
		console.log('Restoring invite popup visibility via checker')
	}
}

// Run this check periodically
setInterval(checkPopupVisibility, 100)

window.onbeforeunload = function () {
	// Save game before unloading if auto-save is enabled
	if (SaveManager.isAutoSaveEnabled && player) {
		SaveManager.saveGame()
	}

	// Clean up online game resources
	if (gameSynchronizer) {
		gameSynchronizer.cleanup()
	}

	return 'Are you sure?'
}

window.onload = () => {
	game.Start()
	initGame()

	// Check if there are saved worlds
	if (SaveManager.hasSavedWorlds()) {
		loadGameBtn.style.opacity = '1'
	} else {
		loadGameBtn.style.opacity = '0.5'
	}
}

// This function is used as the Start method for the game object
// Leave this as is - it's used by the game object instance
function Start() {
	Canvas.Instance.updateSize()
	Canvas.Instance.GetLayerContext(0).drawImage(Images.back, 0, 0)
}

// This Update function is used by the game object and should be kept
function Update() {
	// Only update the game if we're no longer on the start screen
	if (startScreen.style.display === 'none' && player) {
		let entities = []
		SceneManager.Instance.currentScene.Entities.forEach(element => {
			entities.push(element)
		})

		SM.currentScene.TC.LoadedLayers.forEach(layer => {
			layer.forEach(entity => {
				entities.push(entity)
			})
		})

		SM.currentScene.TC.UpdateLoadted(Player.Camera.Y)
		player.Update(entities)

		Canvas.Instance.GetLayerContext(1).clearRect(0, 0, 1920, 1080)
		Canvas.Instance.GetLayerContext(2).clearRect(0, 0, 1920, 1080)
		Canvas.Instance.GetLayerContext(3).clearRect(0, 0, 1920, 1080)

		SM.currentScene.Draw()
		player.Draw(Canvas.Instance.GetLayerContext(player.Layer), Player.Camera)

		// Draw other player names if in online mode
		if (gameSynchronizer && gameSynchronizer.isActive) {
			gameSynchronizer.drawPlayerNames(Canvas.Instance.GetLayerContext(3))
		}

		money.innerHTML = resurse.money
		res1.innerHTML = resurse.res1
		res2.innerHTML = resurse.res2
		res3.innerHTML = resurse.res3
		res4.innerHTML = resurse.res4
		res5.innerHTML = resurse.res5
		res6.innerHTML = resurse.res6
	}
}

// Function to set up invitation listener
function setupInvitationListener() {
	if (!auth.currentUser) return

	const db = getDatabase()
	invitationsRef = dbRef(db, `users/${auth.currentUser.uid}/invitations`)

	invitationListener = onValue(invitationsRef, snapshot => {
		if (snapshot.exists()) {
			const invitations = snapshot.val()
			const invitationIds = Object.keys(invitations)

			if (invitationIds.length > 0) {
				// Get the most recent invitation
				const latestInvitationId = invitationIds.reduce((latest, current) => {
					return invitations[current].timestamp > invitations[latest].timestamp
						? current
						: latest
				}, invitationIds[0])

				const invitation = invitations[latestInvitationId]

				// Show notification for the invitation
				showInvitationNotification(invitation)
			}
		}
	})
}

// Function to clean up invitation listener
function cleanupInvitationListener() {
	if (invitationsRef && invitationListener) {
		off(invitationsRef, invitationListener)
		invitationsRef = null
		invitationListener = null
	}
}

// Function to show invitation notification
function showInvitationNotification(invitation) {
	currentInvitation = invitation

	console.log('Received invitation from:', invitation.fromName)
	console.log('World:', invitation.worldName)

	// Update the invitation popup
	inviterName.textContent = invitation.fromName

	// Add world name to the invitation popup
	const worldNameElement = document.getElementById('invitationWorldName')
	if (worldNameElement) {
		worldNameElement.textContent = invitation.worldName
	} else {
		// Create the element if it doesn't exist
		const worldNameContainer = document.createElement('p')
		worldNameContainer.innerHTML = `To play on world: <span id="invitationWorldName" style="font-weight:bold;color:goldenrod">${invitation.worldName}</span>`

		// Insert after the inviter name paragraph
		const inviterParagraph = invitationReceivedPopup.querySelector('p')
		if (inviterParagraph && inviterParagraph.nextSibling) {
			inviterParagraph.parentNode.insertBefore(
				worldNameContainer,
				inviterParagraph.nextSibling
			)
		} else if (inviterParagraph) {
			inviterParagraph.parentNode.appendChild(worldNameContainer)
		}
	}

	invitationReceivedPopup.style.display = 'flex'

	// Always show notification, whether on start screen or in game
	if (startScreen.style.display === 'none') {
		// In game, show a notification
		const notificationElement = document.createElement('div')
		notificationElement.className = 'invitation-notification'
		notificationElement.innerHTML = `
			<div class="invitation-notification-content">
				<div class="invitation-notification-text">
					<b>${invitation.fromName}</b> invited you to play on world "${invitation.worldName}"
				</div>
			</div>
			<div class="invitation-notification-actions">
				<button class="notification-button view">View</button>
				<button class="notification-button accept">Accept</button>
				<button class="notification-button decline">Decline</button>
			</div>
		`

		document.body.appendChild(notificationElement)
		notificationElement.style.display = 'block'

		// Add button handlers
		notificationElement
			.querySelector('.notification-button.view')
			.addEventListener('click', () => {
				notificationElement.remove()
				invitationReceivedPopup.style.display = 'flex'
			})

		notificationElement
			.querySelector('.notification-button.accept')
			.addEventListener('click', () => {
				notificationElement.remove()
				acceptInvitation()
			})

		notificationElement
			.querySelector('.notification-button.decline')
			.addEventListener('click', () => {
				notificationElement.remove()
				declineInvitation()
			})

		// Don't auto-hide, keep it visible until user interacts
	}
}

// Function to accept invitation
function acceptInvitation() {
	if (!currentInvitation) return

	// Clean up current save if in game
	if (SaveManager.getCurrentWorldId()) {
		SaveManager.saveGame()

		// Clean up any existing synchronizer
		if (gameSynchronizer) {
			gameSynchronizer.cleanup()
			gameSynchronizer = null
		}
	}

	// Load the invited world
	const invitedWorldId = currentInvitation.worldId

	// Remove the invitation
	const db = getDatabase()
	remove(
		dbRef(
			db,
			`users/${auth.currentUser.uid}/invitations/${currentInvitation.fromId}`
		)
	)
		.then(() => {
			// Set online game flag and world ID
			isOnlineGame = true
			onlineWorldId = invitedWorldId

			// Hide the invitation popup
			invitationReceivedPopup.style.display = 'none'

			// Load the world
			loadSavedGame(invitedWorldId)

			// Add invite button to settings
			addInviteFriendButton()
		})
		.catch(error => {
			console.error('Error accepting invitation:', error)
			SaveManager.showNotification('Failed to join game')
		})
}

// Function to decline invitation
function declineInvitation() {
	if (!currentInvitation || !auth.currentUser) return

	// Remove the invitation
	const db = getDatabase()
	remove(
		dbRef(
			db,
			`users/${auth.currentUser.uid}/invitations/${currentInvitation.fromId}`
		)
	)
		.then(() => {
			// Hide the invitation popup
			invitationReceivedPopup.style.display = 'none'
			currentInvitation = null
			SaveManager.showNotification('Invitation declined')
		})
		.catch(error => {
			console.error('Error declining invitation:', error)
			SaveManager.showNotification('Failed to decline invitation')
		})
}

// EVENT LISTENERS

// New Game button click
newGameBtn.addEventListener('click', () => {
	// Show seed input popup
	worldNameInput.value = ''
	seedInput.value = ''
	newGamePopup.style.display = 'flex'
})

// Start with seed button click
startWithSeedBtn.addEventListener('click', () => {
	const worldName = worldNameInput.value.trim()
	const seed = seedInput.value.trim() ? Number(seedInput.value) : null

	if (!worldName) {
		alert('Please enter a world name')
		return
	}

	newGamePopup.style.display = 'none'
	startNewGame(worldName, seed)
})

// Cancel seed button click
cancelSeedBtn.addEventListener('click', () => {
	newGamePopup.style.display = 'none'
})

// Load Game button click
loadGameBtn.addEventListener('click', () => {
	if (SaveManager.hasSavedWorlds()) {
		showWorldSelection()
	} else {
		alert('No saved worlds found!')
	}
})

// World selection close button
closeWorldSelection.addEventListener('click', () => {
	worldSelectionPopup.style.display = 'none'
})

// Load save confirmation on start screen
loadSaveStartConfirm.addEventListener('click', () => {
	const worldId = loadSaveStartPopup.dataset.worldId
	loadSaveStartPopup.style.display = 'none'
	loadSavedGame(worldId)
})

// Popup event listeners
controlsBtn.addEventListener('click', () => {
	controlsPopup.style.display = 'flex'
})

resourcesBtn.addEventListener('click', () => {
	resourcesPopup.style.display = 'flex'
})

closeButtons.forEach(button => {
	button.addEventListener('click', () => {
		controlsPopup.style.display = 'none'
		resourcesPopup.style.display = 'none'
	})
})

// Settings Button Event Listeners
settingsButton.addEventListener('click', () => {
	// Make sure any lingering showing-invite-popup class is removed
	document.body.classList.remove('showing-invite-popup')
	// Now show the settings popup
	settingsPopup.style.display = 'flex'
})

// Close settings when clicking X
closeSettings.addEventListener('click', () => {
	settingsPopup.style.display = 'none'
})

// Close settings when clicking outside the popup
window.addEventListener('click', event => {
	if (event.target === settingsPopup) {
		settingsPopup.style.display = 'none'
	}
	// Keep existing window click handlers
	if (event.target === deleteSavePopup) {
		deleteSavePopup.style.display = 'none'
	}
	if (event.target === loadSavePopup) {
		loadSavePopup.style.display = 'none'
	}
	if (event.target === controlsPopup) {
		controlsPopup.style.display = 'none'
	}
	if (event.target === resourcesPopup) {
		resourcesPopup.style.display = 'none'
	}
	if (event.target === newGamePopup) {
		newGamePopup.style.display = 'none'
	}

	if (event.target === loadSaveStartPopup) {
		loadSaveStartPopup.style.display = 'none'
	}
})

// Main menu button - simply reload the page instead of trying to reset game state
mainMenuButton.addEventListener('click', () => {
	// Hide settings popup
	settingsPopup.style.display = 'none'

	// Save current world before reloading
	if (SaveManager.getCurrentWorldId()) {
		SaveManager.saveGame()
	}

	// Clean up online game resources
	if (gameSynchronizer) {
		gameSynchronizer.cleanup()
		gameSynchronizer = null
	}

	// Reload the entire page - this ensures clean state
	window.location.reload()

	// Reset online game state
	isOnlineGame = false
	onlineWorldId = null
})

// Auto-save toggle
autoSaveToggle.addEventListener('click', () => {
	const isEnabled = SaveManager.toggleAutoSave()
	autoSaveToggle.textContent = `Автосохранение: ${isEnabled ? 'ВКЛ' : 'ВЫКЛ'}`
	if (isEnabled) {
		autoSaveToggle.classList.remove('disabled')
	} else {
		autoSaveToggle.classList.add('disabled')
	}
	SaveManager.showNotification(
		`Автосохранение ${isEnabled ? 'включено' : 'выключено'}`
	)
})

// Save button
saveButton.addEventListener('click', () => {
	if (SaveManager.saveGame()) {
		SaveManager.showNotification('Игра сохранена!')
		settingsPopup.style.display = 'none'
	} else {
		SaveManager.showNotification('Ошибка сохранения')
	}
})

window.onbeforeunload = function () {
	// Save game before unloading if auto-save is enabled
	if (SaveManager.isAutoSaveEnabled && player) {
		SaveManager.saveGame()
	}
	return 'Are you sure?'
}

window.onload = () => {
	game.Start()
	initGame()

	// Check if there are saved worlds
	if (SaveManager.hasSavedWorlds()) {
		loadGameBtn.style.opacity = '1'
	} else {
		loadGameBtn.style.opacity = '0.5'
	}
}
