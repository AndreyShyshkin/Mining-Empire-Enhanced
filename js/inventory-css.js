// Add this to your existing CSS or add a new CSS file
const inventoryCss = `
.full-inventory {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(30, 30, 60, 0.9);
  padding: 20px;
  border-radius: 10px;
  border: 4px solid #345;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  gap: 15px;
  z-index: 1000;
  max-width: 90vw;
  min-width: 500px;
}

.inventory-header {
  text-align: center;
  font-size: 24px;
  color: #FFD700;
  text-shadow: 2px 2px 3px rgba(0, 0, 0, 0.5);
  padding-bottom: 10px;
  border-bottom: 2px solid #456;
}

.inventory-slots-container {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 8px;
  padding: 10px;
}

/* Style for inventory slots */
.inventory-slot {
  width: 50px;
  height: 50px;
  background-color: rgba(70, 70, 100, 0.6);
  border: 2px solid #456;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.inventory-slot:hover {
  background-color: rgba(90, 90, 130, 0.8);
  transform: scale(1.05);
  border-color: #678;
}

.inventory-slot.hotbar-slot {
  border-color: #678;
  background-color: rgba(80, 80, 120, 0.7);
}

.inventory-slot.selected {
  border-color: #FFD700;
  box-shadow: 0 0 8px #FFD700;
}

/* Item styling */
.item-display {
  width: 40px !important;
  height: 40px !important;
  cursor: grab;
  transition: all 0.2s ease;
  border-radius: 4px;
  position: relative;
  box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.5);
}

.item-display:active {
  cursor: grabbing;
}

.item-count {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 12px;
  color: white;
  text-shadow: 1px 1px 2px black, -1px -1px 2px black;
}

/* Additional styles for drag and drop */
.inventory-slot.drag-over {
  background-color: rgba(100, 100, 160, 0.9);
  border-color: #FFD700;
}
`

// Create a style element and add it to the document
const styleElement = document.createElement('style')
styleElement.textContent = inventoryCss
document.head.appendChild(styleElement)
