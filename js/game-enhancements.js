// Master loader for all game enhancements
console.log('Loading game-enhancements.js')

// Wait for the main game to load
window.addEventListener('DOMContentLoaded', function () {
	console.log('DOM loaded, initializing game enhancements')

	// Function to load a script
	function loadScript(src, callback) {
		const script = document.createElement('script')
		script.src = src
		script.onload = callback
		script.onerror = function () {
			console.error('Error loading script:', src)
		}
		document.head.appendChild(script)
	}

	// Queue up all our enhancement scripts
	const enhancements = [
		'js/tree-break-fix.js',
		'js/torch-crafting-fix.js',
		'js/world-size-tree-fix.js',
		'js/ultimate-crafting-fix.js',
		'js/comprehensive-fix.js',
	]

	// Load them sequentially
	function loadNext(index) {
		if (index >= enhancements.length) {
			console.log('All enhancements loaded successfully')
			return
		}

		loadScript(enhancements[index], function () {
			loadNext(index + 1)
		})
	}

	// Show welcome message about enhancements
	setTimeout(function () {
		if (window.showGameNotification) {
			window.showGameNotification(
				'Game Enhanced!',
				'• Trees can now be broken without tools\n' +
					'• Torch crafting fixed\n' +
					'• World size increased 3x\n' +
					'• More and larger trees added\n' +
					'• Crafting system improved',
				10000
			)
		}
	}, 3000)

	// Start loading
	loadNext(0)
})
