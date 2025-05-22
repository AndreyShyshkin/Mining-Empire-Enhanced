/**
 * Fullscreen Manager
 *
 * Provides fullscreen functionality for the game with cross-browser support.
 * Автоматически настраивает размер экрана и позволяет переключаться в полноэкранный режим.
 */

console.log('Loading fullscreen-manager.js')

;(function () {
	// Create fullscreen button
	function createFullscreenButton() {
		const fullscreenBtn = document.createElement('button')
		fullscreenBtn.id = 'fullscreenBtn'
		fullscreenBtn.className = 'fullscreen-button'
		fullscreenBtn.innerHTML =
			'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>'
		fullscreenBtn.title = 'На весь экран (F11)'

		// Append to game container
		const gameContainer = document.getElementById('gameContainer')
		if (gameContainer) {
			gameContainer.appendChild(fullscreenBtn)

			// Add event listener
			fullscreenBtn.addEventListener('click', toggleFullscreen)
			console.log('Fullscreen button created and attached')
		} else {
			console.error('Game container not found, cannot attach fullscreen button')
			// Try again later when game is loaded
			setTimeout(createFullscreenButton, 1000)
		}
	}

	// Toggle fullscreen state
	function toggleFullscreen() {
		const gameContainer = document.getElementById('gameContainer')

		if (
			!document.fullscreenElement &&
			!document.mozFullScreenElement &&
			!document.webkitFullscreenElement &&
			!document.msFullscreenElement
		) {
			// Enter fullscreen
			if (gameContainer.requestFullscreen) {
				gameContainer.requestFullscreen()
			} else if (gameContainer.msRequestFullscreen) {
				gameContainer.msRequestFullscreen()
			} else if (gameContainer.mozRequestFullScreen) {
				gameContainer.mozRequestFullScreen()
			} else if (gameContainer.webkitRequestFullscreen) {
				gameContainer.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT)
			}
			updateFullscreenButtonIcon(true)
		} else {
			// Exit fullscreen
			if (document.exitFullscreen) {
				document.exitFullscreen()
			} else if (document.msExitFullscreen) {
				document.msExitFullscreen()
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen()
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen()
			}
			updateFullscreenButtonIcon(false)
		}
	}

	// Update button icon based on fullscreen state
	function updateFullscreenButtonIcon(isFullscreen) {
		const fullscreenBtn = document.getElementById('fullscreenBtn')
		if (fullscreenBtn) {
			if (isFullscreen) {
				fullscreenBtn.innerHTML =
					'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>'
				fullscreenBtn.title = 'Выйти из полноэкранного режима (F11)'
			} else {
				fullscreenBtn.innerHTML =
					'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>'
				fullscreenBtn.title = 'На весь экран (F11)'
			}
		}
	}

	// Resize canvas to fill window or container
	function resizeGameCanvas() {
		const canvas = document.getElementById('gameCanvas')
		const gameContainer = document.getElementById('gameContainer')

		if (canvas && gameContainer) {
			// Set canvas size to match container size
			canvas.width = gameContainer.clientWidth
			canvas.height = gameContainer.clientHeight

			// Update renderer viewport if available
			if (
				window.renderer &&
				typeof window.renderer.updateViewport === 'function'
			) {
				window.renderer.updateViewport(canvas.width, canvas.height)
			} else if (window.renderer) {
				// Manual camera update if updateViewport not available
				if (window.renderer.camera) {
					window.renderer.camera.width = canvas.width
					window.renderer.camera.height = canvas.height
				}
			}

			console.log(`Resized canvas to ${canvas.width}x${canvas.height}`)
		}
	}

	// Listen for fullscreen change events
	function setupFullscreenChangeListeners() {
		document.addEventListener('fullscreenchange', handleFullscreenChange)
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
		document.addEventListener('mozfullscreenchange', handleFullscreenChange)
		document.addEventListener('MSFullscreenChange', handleFullscreenChange)
	}

	function handleFullscreenChange() {
		const isFullscreen =
			!!document.fullscreenElement ||
			!!document.mozFullScreenElement ||
			!!document.webkitFullscreenElement ||
			!!document.msFullscreenElement

		updateFullscreenButtonIcon(isFullscreen)

		// Force canvas resize
		resizeGameCanvas()

		console.log(
			`Fullscreen state changed: ${
				isFullscreen ? 'entered fullscreen' : 'exited fullscreen'
			}`
		)
	}

	// Setup window resize handler
	function setupResizeListener() {
		window.addEventListener('resize', resizeGameCanvas)
	}

	// Add keyboard shortcut (F11) for fullscreen
	function setupKeyboardShortcuts() {
		// This is handled in ui-keyboard-control.js to avoid conflicts
		console.log(
			'Fullscreen keyboard shortcuts integrated with ui-keyboard-control.js'
		)
	}

	// Patch the startGame function to use full screen by default
	function patchGameFunctions() {
		const originalStartGame = window.startGame

		if (originalStartGame) {
			window.startGame = function (...args) {
				console.log('Starting game with fullscreen support')

				// Show game container
				const gameContainer = document.getElementById('gameContainer')
				if (gameContainer) {
					gameContainer.style.display = 'block'
				}

				// Call original function
				originalStartGame.apply(this, args)

				// Resize canvas after game starts
				setTimeout(() => {
					resizeGameCanvas()

					// Show fullscreen button
					const fullscreenBtn = document.getElementById('fullscreenBtn')
					if (fullscreenBtn) {
						fullscreenBtn.style.display = 'flex'
					} else {
						// Create button if it doesn't exist yet
						createFullscreenButton()
					}
				}, 100)
			}
		}

		// Override the initializeGame function to resize the canvas
		const originalInitializeGame = window.initializeGame
		if (originalInitializeGame) {
			window.initializeGame = function (...args) {
				// Execute original function
				originalInitializeGame.apply(this, args)

				// Resize canvas after game initialization
				setTimeout(resizeGameCanvas, 200)
			}
		}
	}

	// Initialize fullscreen functionality
	function initFullscreenManager() {
		if (document.readyState === 'complete') {
			setupResizeListener()
			createFullscreenButton()
			setupFullscreenChangeListeners()
			setupKeyboardShortcuts()
			patchGameFunctions()

			// Initially hide the button until game starts
			const fullscreenBtn = document.getElementById('fullscreenBtn')
			if (fullscreenBtn && !window.isInGame) {
				fullscreenBtn.style.display = 'none'
			}
		} else {
			window.addEventListener('load', function () {
				setupResizeListener()
				createFullscreenButton()
				setupFullscreenChangeListeners()
				setupKeyboardShortcuts()
				patchGameFunctions()

				// Initially hide the button until game starts
				const fullscreenBtn = document.getElementById('fullscreenBtn')
				if (fullscreenBtn && !window.isInGame) {
					fullscreenBtn.style.display = 'none'
				}
			})
		}
	}

	// Start initialization
	initFullscreenManager()

	// Expose functions globally
	window.toggleFullscreen = toggleFullscreen
	window.resizeGameCanvas = resizeGameCanvas
})()
