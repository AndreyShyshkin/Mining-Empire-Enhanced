// Firebase Authentication Management
document.addEventListener('DOMContentLoaded', function () {
	// DOM Elements
	const authContainer = document.getElementById('authContainer')
	const mainMenu = document.getElementById('mainMenu')
	const authForm = document.getElementById('authForm')
	const userInfo = document.getElementById('userInfo')
	const authTitle = document.getElementById('authTitle')
	const emailInput = document.getElementById('emailInput')
	const passwordInput = document.getElementById('passwordInput')
	const emailPasswordAuthButton = document.getElementById(
		'emailPasswordAuthButton'
	)
	const googleAuthButton = document.getElementById('googleAuthButton')
	const toggleToRegister = document.getElementById('toggleToRegister')
	const authToggleText = document.getElementById('authToggleText')
	const userName = document.getElementById('userName')
	const logoutButton = document.getElementById('logoutButton')
	const authError = document.getElementById('authError')
	const profileButton = document.getElementById('profileButton')
	const profilePanel = document.getElementById('profilePanel')
	const profileDisplayName = document.getElementById('profileDisplayName')
	const profileEmail = document.getElementById('profileEmail')
	const profileNewPassword = document.getElementById('profileNewPassword')
	const profileConfirmPassword = document.getElementById(
		'profileConfirmPassword'
	)
	const saveProfileButton = document.getElementById('saveProfileButton')
	const closeProfileButton = document.getElementById('closeProfileButton')
	const profileMessage = document.getElementById('profileMessage')

	// Новые элементы в главном меню
	const menuUserName = document.getElementById('menuUserName')
	const profileMenuBtn = document.getElementById('profileMenuBtn')
	const logoutMenuBtn = document.getElementById('logoutMenuBtn')

	// Auth state tracking
	let isRegistrationMode = false
	let currentUser = null

	// Initialize UI
	showLogin()

	// Скрываем кнопки профиля и выхода по умолчанию
	if (profileMenuBtn && logoutMenuBtn) {
		profileMenuBtn.style.display = 'none'
		logoutMenuBtn.style.display = 'none'
	}

	// Add event listeners
	if (toggleToRegister) {
		toggleToRegister.addEventListener('click', toggleAuthMode)
	}

	if (emailPasswordAuthButton) {
		emailPasswordAuthButton.addEventListener('click', handleEmailPasswordAuth)
	}

	if (googleAuthButton) {
		googleAuthButton.addEventListener('click', handleGoogleAuth)
	}

	if (logoutButton) {
		logoutButton.addEventListener('click', handleLogout)
	}

	if (profileButton) {
		profileButton.addEventListener('click', showProfilePanel)
	}

	if (closeProfileButton) {
		closeProfileButton.addEventListener('click', hideProfilePanel)
	}

	if (saveProfileButton) {
		saveProfileButton.addEventListener('click', saveProfileChanges)
	}

	// Обработчики для кнопок в главном меню
	if (profileMenuBtn) {
		profileMenuBtn.addEventListener('click', showProfilePanel)
	}

	if (logoutMenuBtn) {
		logoutMenuBtn.addEventListener('click', handleLogout)
	}

	// Toggle between login and registration
	function toggleAuthMode(e) {
		e.preventDefault()
		isRegistrationMode = !isRegistrationMode

		if (isRegistrationMode) {
			authTitle.textContent = 'Register'
			emailPasswordAuthButton.textContent = 'Register'
			toggleToRegister.textContent = 'Login'
			authToggleText.innerHTML =
				'Already have an account? <a href="#" id="toggleToRegister">Login</a>'
		} else {
			authTitle.textContent = 'Login'
			emailPasswordAuthButton.textContent = 'Login'
			toggleToRegister.textContent = 'Register'
			authToggleText.innerHTML =
				'Don\'t have an account? <a href="#" id="toggleToRegister">Register</a>'
		}

		// Reconnect event listener as we replaced the HTML
		document
			.getElementById('toggleToRegister')
			.addEventListener('click', toggleAuthMode)
		clearError()
	}

	// Handle email/password authentication
	function handleEmailPasswordAuth() {
		const email = emailInput.value.trim()
		const password = passwordInput.value

		if (!email || !password) {
			showError('Please enter both email and password.')
			return
		}

		if (isRegistrationMode) {
			// Registration
			window
				.createUserWithEmailAndPassword(window.firebaseAuth, email, password)
				.then(userCredential => {
					// Registration successful
					clearInputs()
					showSuccess('Registration successful!')
				})
				.catch(error => {
					showError('Registration failed: ' + error.message)
				})
		} else {
			// Login
			window
				.signInWithEmailAndPassword(window.firebaseAuth, email, password)
				.then(userCredential => {
					// Login successful
					clearInputs()
				})
				.catch(error => {
					showError('Login failed: ' + error.message)
				})
		}
	}

	// Handle Google Authentication
	function handleGoogleAuth() {
		const provider = new window.GoogleAuthProvider()

		window
			.signInWithPopup(window.firebaseAuth, provider)
			.then(result => {
				// Google auth successful
			})
			.catch(error => {
				showError('Google authentication failed: ' + error.message)
			})
	}

	// Handle logout
	function handleLogout() {
		window
			.signOutFirebase(window.firebaseAuth)
			.then(() => {
				// Logout successful
				showLogin()
			})
			.catch(error => {
				showError('Logout failed: ' + error.message)
			})
	}

	// Monitor authentication state changes
	window.onAuthStateChanged(window.firebaseAuth, async user => {
		if (user) {
			// User is signed in
			currentUser = user
			showUserInfo(user)

			// Hide auth container, show game menu
			authContainer.style.display = 'none'
			mainMenu.style.display = 'flex'

			// Save/update user info in database
			const userRef = window.dbRef(window.firebaseDatabase, `users/${user.uid}`)
			await window.dbSet(userRef, {
				email: user.email,
				displayName: user.displayName || user.email.split('@')[0],
				lastLogin: new Date().toISOString(),
			})
		} else {
			// User is signed out
			currentUser = null
			showLogin()

			// Hide game menu, show auth container
			authContainer.style.display = 'flex'
			mainMenu.style.display = 'none'

			// Hide profile panel if it's open
			hideProfilePanel()
		}
	})

	// UI Helper Functions
	function showLogin() {
		if (authForm && userInfo) {
			authForm.style.display = 'block'
			userInfo.style.display = 'none'
			isRegistrationMode = false
			authTitle.textContent = 'Login'
			emailPasswordAuthButton.textContent = 'Login'
		}
	}

	function showUserInfo(user) {
		if (authForm && userInfo) {
			authForm.style.display = 'none'
			userInfo.style.display = 'block'
			userName.textContent = user.displayName || user.email

			// Обновляем имя пользователя в главном меню
			if (menuUserName) {
				menuUserName.textContent = `Привет, ${
					user.displayName || user.email.split('@')[0]
				}!`
			}

			// Показываем кнопки профиля и выхода
			if (profileMenuBtn && logoutMenuBtn) {
				profileMenuBtn.style.display = 'block'
				logoutMenuBtn.style.display = 'block'
			}
		}
	}

	// Profile management functions
	function showProfilePanel() {
		if (!currentUser) return

		// Fill profile form with current user data
		profileDisplayName.value = currentUser.displayName || ''
		profileEmail.value = currentUser.email || ''
		profileNewPassword.value = ''
		profileConfirmPassword.value = ''
		clearProfileMessage()

		// Перед отображением скрываем все другие панели
		const menuPanels = document.querySelectorAll('.menu-panel')
		menuPanels.forEach(panel => {
			panel.style.display = 'none'
		})

		// Move profile panel to be a direct child of body for proper z-index
		document.body.appendChild(profilePanel)

		// Display profile panel
		profilePanel.style.display = 'block'

		console.log('Profile panel should be visible now')
	}

	// Экспортируем функцию в глобальную область видимости
	window.showProfilePanel = showProfilePanel

	function hideProfilePanel() {
		profilePanel.style.display = 'none'
	}

	async function saveProfileChanges() {
		if (!currentUser) return

		try {
			let changesMade = false

			// Update display name if changed
			const newDisplayName = profileDisplayName.value.trim()
			if (newDisplayName !== currentUser.displayName && newDisplayName !== '') {
				await window.updateProfile(currentUser, {
					displayName: newDisplayName,
				})

				// Update in database too
				const userRef = window.dbRef(
					window.firebaseDatabase,
					`users/${currentUser.uid}`
				)
				await window.dbUpdate(userRef, {
					displayName: newDisplayName,
				})

				changesMade = true
			}

			// Update password if provided
			const newPassword = profileNewPassword.value
			const confirmPassword = profileConfirmPassword.value

			if (newPassword) {
				if (newPassword !== confirmPassword) {
					showProfileError('Пароли не совпадают')
					return
				}

				if (newPassword.length < 6) {
					showProfileError('Пароль должен содержать минимум 6 символов')
					return
				}

				await window.updatePassword(currentUser, newPassword)
				changesMade = true

				// Clear password fields after successful update
				profileNewPassword.value = ''
				profileConfirmPassword.value = ''
			}

			// Show success message
			if (changesMade) {
				showProfileSuccess('Профиль успешно обновлен')

				// Update displayed name in UI
				userName.textContent = newDisplayName || currentUser.email

				// Reload user to get updated info
				await currentUser.reload()
			} else {
				showProfileMessage('Изменений не обнаружено')
			}
		} catch (error) {
			console.error('Error updating profile:', error)
			showProfileError(`Ошибка обновления профиля: ${error.message}`)
		}
	}

	function showProfileMessage(message) {
		profileMessage.textContent = message
		profileMessage.className = 'message'
		profileMessage.style.display = 'block'

		// Hide message after delay
		setTimeout(() => {
			profileMessage.style.display = 'none'
		}, 3000)
	}

	function showProfileError(message) {
		profileMessage.textContent = message
		profileMessage.className = 'message error'
		profileMessage.style.display = 'block'
	}

	function showProfileSuccess(message) {
		profileMessage.textContent = message
		profileMessage.className = 'message success'
		profileMessage.style.display = 'block'

		// Hide after delay
		setTimeout(() => {
			profileMessage.style.display = 'none'
		}, 3000)
	}

	function clearProfileMessage() {
		profileMessage.textContent = ''
		profileMessage.style.display = 'none'
	}

	function clearInputs() {
		emailInput.value = ''
		passwordInput.value = ''
	}

	function showError(message) {
		authError.textContent = message
		authError.style.display = 'block'
	}

	function clearError() {
		authError.textContent = ''
		authError.style.display = 'none'
	}

	function showSuccess(message) {
		authError.textContent = message
		authError.style.color = '#4CAF50'
		authError.style.display = 'block'

		// Reset to error color after a delay
		setTimeout(() => {
			authError.style.color = ''
		}, 3000)
	}
})
