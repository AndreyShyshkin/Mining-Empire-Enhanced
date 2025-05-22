// Game Monitor - Helps track events and diagnose issues
console.log('Loading game-monitor.js')

// Create a monitoring UI
;(function () {
	let isMonitorEnabled = false
	let monitorElement = null
	let logContainer = null
	const maxLogEntries = 50
	let logEntries = []

	// Create monitor UI
	function createMonitorUI() {
		// Create main container
		monitorElement = document.createElement('div')
		monitorElement.id = 'game-monitor'
		monitorElement.style.position = 'fixed'
		monitorElement.style.bottom = '10px'
		monitorElement.style.right = '10px'
		monitorElement.style.width = '400px'
		monitorElement.style.maxHeight = '300px'
		monitorElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
		monitorElement.style.color = '#fff'
		monitorElement.style.borderRadius = '5px'
		monitorElement.style.padding = '10px'
		monitorElement.style.fontFamily = 'monospace'
		monitorElement.style.fontSize = '12px'
		monitorElement.style.zIndex = '1000'
		monitorElement.style.display = 'none'

		// Create header
		const header = document.createElement('div')
		header.style.display = 'flex'
		header.style.justifyContent = 'space-between'
		header.style.marginBottom = '5px'
		header.style.borderBottom = '1px solid #666'
		header.style.paddingBottom = '5px'

		const title = document.createElement('span')
		title.textContent = 'Game Monitor'
		title.style.fontWeight = 'bold'

		const closeButton = document.createElement('button')
		closeButton.textContent = 'X'
		closeButton.style.backgroundColor = '#f44336'
		closeButton.style.color = 'white'
		closeButton.style.border = 'none'
		closeButton.style.borderRadius = '3px'
		closeButton.style.width = '20px'
		closeButton.style.height = '20px'
		closeButton.style.cursor = 'pointer'
		closeButton.style.display = 'flex'
		closeButton.style.alignItems = 'center'
		closeButton.style.justifyContent = 'center'
		closeButton.style.fontSize = '12px'
		closeButton.style.fontWeight = 'bold'
		closeButton.addEventListener('click', toggleMonitor)

		header.appendChild(title)
		header.appendChild(closeButton)
		monitorElement.appendChild(header)

		// Create log container
		logContainer = document.createElement('div')
		logContainer.style.overflowY = 'auto'
		logContainer.style.maxHeight = '250px'
		logContainer.style.paddingRight = '5px'
		monitorElement.appendChild(logContainer)

		// Create control buttons
		const controls = document.createElement('div')
		controls.style.display = 'flex'
		controls.style.gap = '5px'
		controls.style.marginTop = '10px'

		const clearButton = document.createElement('button')
		clearButton.textContent = 'Clear'
		clearButton.style.backgroundColor = '#2196F3'
		clearButton.style.color = 'white'
		clearButton.style.border = 'none'
		clearButton.style.borderRadius = '3px'
		clearButton.style.padding = '3px 8px'
		clearButton.style.cursor = 'pointer'
		clearButton.addEventListener('click', clearLog)

		const testCraftingButton = document.createElement('button')
		testCraftingButton.textContent = 'Test Crafting'
		testCraftingButton.style.backgroundColor = '#4CAF50'
		testCraftingButton.style.color = 'white'
		testCraftingButton.style.border = 'none'
		testCraftingButton.style.borderRadius = '3px'
		testCraftingButton.style.padding = '3px 8px'
		testCraftingButton.style.cursor = 'pointer'
		testCraftingButton.addEventListener('click', testCraftingSystem)

		const testMiningButton = document.createElement('button')
		testMiningButton.textContent = 'Test Mining'
		testMiningButton.style.backgroundColor = '#FF9800'
		testMiningButton.style.color = 'white'
		testMiningButton.style.border = 'none'
		testMiningButton.style.borderRadius = '3px'
		testMiningButton.style.padding = '3px 8px'
		testMiningButton.style.cursor = 'pointer'
		testMiningButton.addEventListener('click', testMiningSystem)

		controls.appendChild(clearButton)
		controls.appendChild(testCraftingButton)
		controls.appendChild(testMiningButton)
		monitorElement.appendChild(controls)

		// Add to document
		document.body.appendChild(monitorElement)
	}

	// Toggle monitor visibility
	function toggleMonitor() {
		isMonitorEnabled = !isMonitorEnabled
		if (monitorElement) {
			monitorElement.style.display = isMonitorEnabled ? 'block' : 'none'
		}
	}

	// Clear log entries
	function clearLog() {
		logEntries = []
		updateLogDisplay()
	}

	// Add a log entry
	function addLogEntry(type, message) {
		const timestamp = new Date().toLocaleTimeString()
		logEntries.unshift({ type, message, timestamp })

		// Limit log entries
		if (logEntries.length > maxLogEntries) {
			logEntries.pop()
		}

		updateLogDisplay()
	}

	// Update the log display
	function updateLogDisplay() {
		if (!logContainer) return

		logContainer.innerHTML = ''

		if (logEntries.length === 0) {
			const emptyMsg = document.createElement('div')
			emptyMsg.textContent = 'No logs to display'
			emptyMsg.style.fontStyle = 'italic'
			emptyMsg.style.color = '#999'
			emptyMsg.style.textAlign = 'center'
			emptyMsg.style.padding = '10px 0'
			logContainer.appendChild(emptyMsg)
			return
		}

		logEntries.forEach(entry => {
			const logEntry = document.createElement('div')
			logEntry.style.marginBottom = '2px'
			logEntry.style.paddingBottom = '2px'
			logEntry.style.borderBottom = '1px dotted #555'

			let color = '#fff'
			let prefix = '[INFO]'

			switch (entry.type.toLowerCase()) {
				case 'error':
					color = '#f44336'
					prefix = '[ERROR]'
					break
				case 'warning':
					color = '#ff9800'
					prefix = '[WARN]'
					break
				case 'success':
					color = '#4caf50'
					prefix = '[OK]'
					break
			}

			logEntry.innerHTML = `<span style="color:#999;font-size:10px">${entry.timestamp}</span> <span style="color:${color}">${prefix}</span> ${entry.message}`
			logContainer.appendChild(logEntry)
		})
	}

	// Test crafting system
	function testCraftingSystem() {
		addLogEntry('info', 'Testing crafting system...')

		if (!window.CraftingSystem) {
			addLogEntry('error', 'CraftingSystem not found in global scope!')
			return
		}

		if (!window.CRAFTING_RECIPES || !Array.isArray(window.CRAFTING_RECIPES)) {
			addLogEntry('error', 'CRAFTING_RECIPES not found or not an array!')
			return
		}

		addLogEntry('info', `Found ${window.CRAFTING_RECIPES.length} recipes`)

		// Check if the current game has a crafting system instance
		if (
			window.game &&
			window.game.player &&
			window.game.player.craftingSystem
		) {
			addLogEntry('success', 'Game has an active craftingSystem instance')

			// Test a few methods
			try {
				const recipes = window.game.player.craftingSystem.getAvailableRecipes()
				addLogEntry(
					'success',
					`getAvailableRecipes returned ${recipes.length} recipes`
				)
			} catch (err) {
				addLogEntry(
					'error',
					`Failed to call getAvailableRecipes: ${err.message}`
				)
			}
		} else {
			addLogEntry('warning', 'No active craftingSystem found in game')
		}
	}

	// Test mining system
	function testMiningSystem() {
		addLogEntry('info', 'Testing mining system...')

		if (!window.Player) {
			addLogEntry('error', 'Player class not found!')
			return
		}

		// Check if player has the required mining methods
		const playerPrototypeMethods = Object.getOwnPropertyNames(
			window.Player.prototype
		)

		if (
			playerPrototypeMethods.includes('startMining') &&
			playerPrototypeMethods.includes('updateMining')
		) {
			addLogEntry('success', 'Player has mining methods implemented')
		} else {
			addLogEntry('error', 'Player is missing mining methods!')
		}

		// Check if player can show tool warnings
		if (playerPrototypeMethods.includes('showToolWarning')) {
			addLogEntry('success', 'Player can show tool warnings')
		} else {
			addLogEntry('warning', 'Player cannot show tool warnings')
		}

		// Check if the current game has an active player
		if (window.game && window.game.player) {
			addLogEntry('success', 'Game has an active player instance')

			// Check if player has mining properties
			if ('miningSpeedMultiplier' in window.game.player) {
				addLogEntry('success', 'Player has miningSpeedMultiplier property')
			} else {
				addLogEntry('warning', 'Player missing miningSpeedMultiplier')
			}
		} else {
			addLogEntry('warning', 'No active player found in game')
		}
	}

	// Initialize when document is ready
	document.addEventListener('DOMContentLoaded', function () {
		createMonitorUI()

		// Add keyboard shortcut to toggle monitor
		document.addEventListener('keydown', function (e) {
			// Alt+M to toggle monitor
			if (e.altKey && e.key === 'm') {
				toggleMonitor()
			}
		})

		// Override console methods to capture logs
		const originalConsole = {
			log: console.log,
			warn: console.warn,
			error: console.error,
		}

		console.log = function (...args) {
			originalConsole.log.apply(console, args)
			const message = args
				.map(arg => {
					if (typeof arg === 'object') {
						try {
							return JSON.stringify(arg)
						} catch (e) {
							return String(arg)
						}
					}
					return String(arg)
				})
				.join(' ')
			addLogEntry('info', message)
		}

		console.warn = function (...args) {
			originalConsole.warn.apply(console, args)
			const message = args.map(arg => String(arg)).join(' ')
			addLogEntry('warning', message)
		}

		console.error = function (...args) {
			originalConsole.error.apply(console, args)
			const message = args.map(arg => String(arg)).join(' ')
			addLogEntry('error', message)
		}
	})

	// Expose monitor API globally
	window.gameMonitor = {
		toggle: toggleMonitor,
		log: message => addLogEntry('info', message),
		warn: message => addLogEntry('warning', message),
		error: message => addLogEntry('error', message),
		success: message => addLogEntry('success', message),
		clear: clearLog,
	}
})()

// Add monitor instructions when game loads
document.addEventListener('DOMContentLoaded', function () {
	setTimeout(() => {
		if (window.gameMonitor) {
			window.gameMonitor.log(
				'Game monitor loaded. Press Alt+M to toggle monitor'
			)
			window.gameMonitor.log(
				'Monitor will show debugging information for crafting and mining'
			)
		}
	}, 1000)
})

console.log('Game monitor initialized')
