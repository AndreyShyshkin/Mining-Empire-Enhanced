// Crafting UI styles
const craftingCss = `
.crafting-ui {
  position: absolute;
  top: 50%;
  right: 50px; /* Position to the right edge of screen */
  transform: translateY(-50%);
  background-color: rgba(30, 30, 60, 0.9);
  padding: 20px;
  border-radius: 10px;
  border: 4px solid #345;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  gap: 15px;
  z-index: 1000;
  width: 400px;
  height: 500px;
}

.crafting-header {
  text-align: center;
  font-size: 24px;
  color: #FFD700;
  text-shadow: 2px 2px 3px rgba(0, 0, 0, 0.5);
  padding-bottom: 10px;
  border-bottom: 2px solid #456;
}

.recipe-list {
  height: 200px;
  overflow-y: auto;
  background-color: rgba(20, 20, 40, 0.7);
  border: 2px solid #567;
  border-radius: 6px;
  padding: 8px;
}

.recipe-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  margin-bottom: 6px;
  background-color: rgba(50, 50, 80, 0.5);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.recipe-item:hover {
  background-color: rgba(70, 70, 100, 0.8);
}

.recipe-item.selected {
  background-color: rgba(80, 80, 130, 0.9);
  border-left: 4px solid #FFD700;
}

.recipe-item.unavailable {
  opacity: 0.7;
}

.recipe-info {
  margin-left: 10px;
  flex-grow: 1;
}

.recipe-name {
  font-size: 14px;
  color: #fff;
}

.recipe-count {
  font-size: 12px;
  color: #aaa;
}

.recipe-station {
  font-size: 11px;
  color: #8eb;
  margin-top: 3px;
}

.recipe-station.missing {
  color: #e88;
}

.recipe-status {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-right: 5px;
  font-size: 12px;
  font-weight: bold;
}

.recipe-status.available {
  background-color: rgba(70, 160, 70, 0.8);
  color: white;
}

.recipe-status.unavailable {
  background-color: rgba(160, 70, 70, 0.8);
  color: white;
}

.recipe-status-message {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  margin-top: 5px;
  text-align: center;
}

.recipe-status-message.error {
  background-color: rgba(170, 60, 60, 0.6);
  color: #fff;
}

.recipe-status-message.warning {
  background-color: rgba(180, 140, 40, 0.6);
  color: #fff;
}

.recipe-status-message.success {
  background-color: rgba(60, 170, 60, 0.6);
  color: #fff;
}

/* Quantity control styles */
.quantity-container {
  display: flex;
  align-items: center;
  margin-right: 10px;
  flex: 1;
}
            
.quantity-container label {
  margin-right: 5px;
  white-space: nowrap;
  color: #CCC;
}
            
.quantity-control-wrapper {
  display: flex;
  align-items: center;
  margin-right: 5px;
  border: 1px solid #567;
  border-radius: 3px;
  overflow: hidden;
  background-color: rgba(30, 30, 50, 0.8);
}
            
.quantity-input {
  width: 40px;
  padding: 5px;
  border: none;
  text-align: center;
  background-color: rgba(30, 30, 50, 0.8);
  color: white;
}
            
.quantity-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(50, 50, 80, 0.8);
  color: white;
  border: none;
  cursor: pointer;
}
            
.quantity-btn:hover {
  background-color: rgba(70, 70, 100, 0.8);
}
            
.max-btn {
  padding: 4px 8px;
  background-color: rgba(50, 70, 100, 0.8);
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  margin-left: 5px;
}
            
.max-btn:hover {
  background-color: rgba(70, 90, 120, 0.8);
}

.craft-controls {
  display: flex;
  align-items: center;
  margin-top: 10px;
  padding: 5px;
  background-color: rgba(30, 30, 50, 0.7);
  border-radius: 3px;
}

.recipe-details {
  background-color: rgba(20, 20, 40, 0.7);
  border: 2px solid #567;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: 180px;
}

.result-section {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin-bottom: 10px;
}

.result-item {
  position: relative;
  margin-bottom: 5px;
}

.item-display.large {
  width: 50px !important;
  height: 50px !important;
}

.result-name {
  font-size: 16px;
  color: #FFD700;
  text-align: center;
}

.ingredients-section {
  flex-grow: 1;
  overflow-y: auto;
}

.ingredients-title {
  font-size: 14px;
  color: #fff;
  margin-bottom: 8px;
  text-align: center;
}

.ingredients-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ingredient-item {
  display: flex;
  align-items: center;
  padding: 4px;
  background-color: rgba(50, 50, 80, 0.5);
  border-radius: 4px;
}

.ingredient-item.missing {
  background-color: rgba(80, 40, 40, 0.5);
}

.ingredient-info {
  margin-left: 8px;
}

.ingredient-name {
  font-size: 13px;
  color: #fff;
}

.ingredient-count {
  font-size: 12px;
  color: #aaa;
}

.ingredient-count.missing {
  color: #ff6b6b;
}

.craft-button {
  background-color: #4a7;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  align-self: center;
  width: 50%;
  margin-top: 10px;
}

.craft-button:hover:not(:disabled) {
  background-color: #5b8;
}

.craft-button:disabled {
  background-color: #666;
  cursor: not-allowed;
  opacity: 0.7;
}

.stations-container {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background-color: rgba(20, 20, 40, 0.7);
  border-radius: 4px;
  flex-wrap: wrap;
}

.stations-title {
  font-size: 12px;
  color: #aaa;
  margin-right: 8px;
}

.station-indicator {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #456;
}

.station-indicator.available {
  background-color: rgba(70, 120, 70, 0.7);
  color: #fff;
}

.station-indicator.unavailable {
  background-color: rgba(70, 70, 70, 0.4);
  color: #999;
}

.no-recipes {
  text-align: center;
  color: #999;
  padding: 10px;
  font-style: italic;
}

/* Scrollbar styling */
.recipe-list::-webkit-scrollbar,
.ingredients-section::-webkit-scrollbar {
  width: 6px;
}

.recipe-list::-webkit-scrollbar-track,
.ingredients-section::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.recipe-list::-webkit-scrollbar-thumb,
.ingredients-section::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

/* Fade for unavailable recipes */
.recipe-item.unavailable {
  opacity: 0.6;
}

/* Hover tooltip for station requirements */
.station-tooltip {
  position: relative;
  display: inline-block;
}

.station-tooltip .tooltip-text {
  visibility: hidden;
  width: 120px;
  background-color: rgba(10, 10, 30, 0.9);
  color: #fff;
  text-align: center;
  border-radius: 4px;
  padding: 5px;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.3s;
  font-size: 12px;
}

.station-tooltip:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}
`

// Create a style element and add it to the document
const craftingStyleElement = document.createElement('style')
craftingStyleElement.textContent = craftingCss
document.head.appendChild(craftingStyleElement)
