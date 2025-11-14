// MapEditor.js - Map editing tools and UI

export class MapEditor {
  constructor(grid) {
    this.grid = grid
    this.game = null // Will be set later
    this.isActive = false
    this.currentTool = 'wall' // wall, eraser, unit
    this.brushSize = 1
    this.isDrawing = false
    this.savedMaps = this.loadSavedMaps()
    
    // Background image positioning mode
    this.backgroundImageMode = false
    this.backgroundMoveStep = 5 // pixels per key press
    
    // Unit placement mode
    this.unitPlacementMode = false
    this.selectedUnitColor = 'red' // Default color palette for units
    this.availableColors = ['red', 'blue', 'green', 'yellow', 'orange', 'cyan', 'purple', 'pink', 'teal', 'brown', 'white', 'black', 'gray', 'magenta']
    this.colorIndex = 0 // Current color index
    
    // UI elements
    this.panel = document.getElementById('mapEditorPanel')
    this.title = document.getElementById('editorTitle')
    this.content = document.getElementById('editorContent')
    
    // Flag to track if event listener is attached
    this.listenerAttached = false
    
    // Set up event delegation on the content panel (only once)
    this.setupEventDelegation()
  }
  
  /**
   * Set up event delegation for button clicks (called once)
   */
  setupEventDelegation() {
    if (!this.content || this.listenerAttached) return
    
    this.content.addEventListener('click', (e) => {
      // Find the closest element with data-action
      const target = e.target.closest('[data-action]')
      if (target) {
        e.preventDefault()
        e.stopPropagation()
        console.log(`Button clicked: ${target.dataset.action}`)
        this.handleButtonClick(target.dataset.action, target.dataset.color, this.game)
      }
    })
    
    this.listenerAttached = true
    console.log('Event delegation set up on content panel')
  }
  
  /**
   * Set game reference (call this after creating the map editor)
   */
  setGame(game) {
    this.game = game
  }

  /**
   * Toggle editor mode
   */
  toggle() {
    this.isActive = !this.isActive
    console.log(`Map Editor: ${this.isActive ? 'ACTIVE' : 'INACTIVE'}`)
    
    // Show/hide UI panel
    if (this.panel) {
      this.panel.style.display = this.isActive ? 'block' : 'none'
      if (this.isActive) {
        this.updateUI()
      }
    }
    
    return this.isActive
  }

  /**
   * Set the current tool
   */
  setTool(tool) {
    this.currentTool = tool
    console.log(`Tool selected: ${tool}`)
    this.updateUI()
  }

  /**
   * Set brush size
   */
  setBrushSize(size) {
    this.brushSize = Math.max(1, Math.min(5, size))
    console.log(`Brush size: ${this.brushSize}`)
    this.updateUI()
  }
  
  /**
   * Toggle background image positioning mode
   */
  toggleBackgroundMode() {
    this.backgroundImageMode = !this.backgroundImageMode
    console.log(`Background Image Mode: ${this.backgroundImageMode ? 'ACTIVE' : 'INACTIVE'}`)
    
    // Disable unit placement mode if entering background mode
    if (this.backgroundImageMode) {
      this.unitPlacementMode = false
    }
    
    // Update UI styling and content
    if (this.panel) {
      if (this.backgroundImageMode) {
        this.panel.classList.add('background-mode')
      } else {
        this.panel.classList.remove('background-mode')
      }
      this.updateUI()
    }
    
    return this.backgroundImageMode
  }
  
  /**
   * Toggle unit placement mode
   */
  toggleUnitPlacementMode() {
    this.unitPlacementMode = !this.unitPlacementMode
    console.log(`Unit Placement Mode: ${this.unitPlacementMode ? 'ACTIVE' : 'INACTIVE'}`)
    
    // Set or unset the unit tool
    if (this.unitPlacementMode) {
      this.currentTool = 'unit'
      this.backgroundImageMode = false
      if (this.panel) {
        this.panel.classList.remove('background-mode')
      }
    } else {
      // Return to wall tool when exiting unit placement mode
      this.currentTool = 'wall'
    }
    
    this.updateUI()
    return this.unitPlacementMode
  }
  
  /**
   * Cycle to next color palette
   */
  nextColor() {
    this.colorIndex = (this.colorIndex + 1) % this.availableColors.length
    this.selectedUnitColor = this.availableColors[this.colorIndex]
    console.log(`Selected color: ${this.selectedUnitColor}`)
    this.updateUI()
  }
  
  /**
   * Cycle to previous color palette
   */
  previousColor() {
    this.colorIndex = (this.colorIndex - 1 + this.availableColors.length) % this.availableColors.length
    this.selectedUnitColor = this.availableColors[this.colorIndex]
    console.log(`Selected color: ${this.selectedUnitColor}`)
    this.updateUI()
  }
  
  /**
   * Move background image
   */
  moveBackgroundImage(game, dx, dy) {
    if (!this.backgroundImageMode) return
    
    game.backgroundImageOffset.x += dx * this.backgroundMoveStep
    game.backgroundImageOffset.y += dy * this.backgroundMoveStep
    
    console.log(`Background position: (${game.backgroundImageOffset.x}, ${game.backgroundImageOffset.y})`)
    this.updateUI(game)
  }
  
  /**
   * Reset background image position
   */
  resetBackgroundPosition(game) {
    game.backgroundImageOffset.x = 0
    game.backgroundImageOffset.y = 0
    console.log('Background position reset')
  }
  
  /**
   * Adjust background image opacity
   */
  adjustBackgroundOpacity(game, delta) {
    game.backgroundImageOpacity = Math.max(0, Math.min(1, game.backgroundImageOpacity + delta))
    console.log(`Background opacity: ${game.backgroundImageOpacity.toFixed(2)}`)
    this.updateUI(game)
  }

  /**
   * Apply tool to grid at position
   * Returns { action: 'tile'|'unit', data: {...} } for unit placement
   */
  applyTool(gridX, gridY) {
    // Unit placement returns unit data instead of modifying grid
    if (this.currentTool === 'unit') {
      return {
        action: 'unit',
        data: {
          gridX,
          gridY,
          color: this.selectedUnitColor
        }
      }
    }
    
    // Normal tile editing
    const halfBrush = Math.floor(this.brushSize / 2)
    
    for (let dy = -halfBrush; dy <= halfBrush; dy++) {
      for (let dx = -halfBrush; dx <= halfBrush; dx++) {
        const x = gridX + dx
        const y = gridY + dy
        
        if (this.grid.isValidTile(x, y)) {
          if (this.currentTool === 'wall') {
            this.grid.setTile(x, y, 1) // Blocked
          } else if (this.currentTool === 'eraser') {
            this.grid.setTile(x, y, 0) // Walkable
          }
        }
      }
    }
    
    return { action: 'tile' }
  }

  /**
   * Start drawing
   * Returns result from applyTool for unit placement
   */
  startDrawing(gridX, gridY) {
    this.isDrawing = true
    return this.applyTool(gridX, gridY)
  }

  /**
   * Continue drawing
   * Returns result from applyTool for unit placement
   */
  draw(gridX, gridY) {
    if (this.isDrawing) {
      return this.applyTool(gridX, gridY)
    }
    return { action: 'none' }
  }

  /**
   * Stop drawing
   */
  stopDrawing() {
    this.isDrawing = false
  }

  /**
   * Clear entire map
   */
  clearMap() {
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        this.grid.setTile(x, y, 0)
      }
    }
    console.log('Map cleared')
  }

  /**
   * Save current map
   */
  saveMap(name) {
    const mapData = {
      name: name || `Map_${Date.now()}`,
      timestamp: Date.now(),
      width: this.grid.cols,
      height: this.grid.rows,
      tiles: []
    }

    // Store only blocked tiles for efficiency
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        if (this.grid.getTile(x, y) === 1) {
          mapData.tiles.push({ x, y })
        }
      }
    }

    this.savedMaps.push(mapData)
    this.persistMaps()
    console.log(`Map saved: ${mapData.name}`)
    return mapData
  }

  /**
   * Load a map by index
   */
  loadMap(index) {
    if (index < 0 || index >= this.savedMaps.length) {
      console.error('Invalid map index')
      return false
    }

    const mapData = this.savedMaps[index]
    
    // Clear current map
    this.clearMap()
    
    // Load tiles
    mapData.tiles.forEach(tile => {
      this.grid.setTile(tile.x, tile.y, 1)
    })

    console.log(`Map loaded: ${mapData.name}`)
    return true
  }

  /**
   * Delete a saved map
   */
  deleteMap(index) {
    if (index >= 0 && index < this.savedMaps.length) {
      const deleted = this.savedMaps.splice(index, 1)[0]
      this.persistMaps()
      console.log(`Map deleted: ${deleted.name}`)
      return true
    }
    return false
  }

  /**
   * Export map as JSON
   */
  exportMap() {
    const mapData = {
      name: `Exported_${Date.now()}`,
      width: this.grid.cols,
      height: this.grid.rows,
      tiles: []
    }

    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        if (this.grid.getTile(x, y) === 1) {
          mapData.tiles.push({ x, y })
        }
      }
    }

    const json = JSON.stringify(mapData, null, 2)
    console.log('Map exported to console (copy below):')
    console.log(json)
    
    // Also copy to clipboard if possible
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(() => {
        console.log('Map copied to clipboard!')
      })
    }

    return json
  }

  /**
   * Import map from JSON
   */
  importMap(jsonString) {
    try {
      const mapData = JSON.parse(jsonString)
      
      // Validate
      if (!mapData.tiles || !Array.isArray(mapData.tiles)) {
        throw new Error('Invalid map format')
      }

      // Clear and load
      this.clearMap()
      mapData.tiles.forEach(tile => {
        if (this.grid.isValidTile(tile.x, tile.y)) {
          this.grid.setTile(tile.x, tile.y, 1)
        }
      })

      console.log(`Map imported: ${mapData.name || 'Unnamed'}`)
      return true
    } catch (error) {
      console.error('Failed to import map:', error)
      return false
    }
  }

  /**
   * Load saved maps from localStorage
   */
  loadSavedMaps() {
    try {
      const stored = localStorage.getItem('starbound_maps')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load saved maps:', error)
      return []
    }
  }

  /**
   * Persist maps to localStorage
   */
  persistMaps() {
    try {
      localStorage.setItem('starbound_maps', JSON.stringify(this.savedMaps))
    } catch (error) {
      console.error('Failed to save maps:', error)
    }
  }

  /**
   * Get list of saved maps
   */
  getSavedMaps() {
    return this.savedMaps.map((map, index) => ({
      index,
      name: map.name,
      timestamp: map.timestamp,
      tileCount: map.tiles.length
    }))
  }

  /**
   * Update the HTML UI panel
   */
  updateUI(game) {
    // Use stored game reference if not provided
    const gameRef = game || this.game
    
    if (!this.isActive || !this.content) return
    
    // Update title
    if (this.title) {
      if (this.backgroundImageMode) {
        this.title.textContent = 'BACKGROUND MODE'
      } else if (this.unitPlacementMode) {
        this.title.textContent = 'UNIT PLACEMENT'
      } else {
        this.title.textContent = 'MAP EDITOR'
      }
    }
    
    let html = ''
    
    if (this.backgroundImageMode) {
      const bgX = gameRef?.backgroundImageOffset?.x || 0
      const bgY = gameRef?.backgroundImageOffset?.y || 0
      const bgOpacity = gameRef?.backgroundImageOpacity || 1
      const bgLoaded = gameRef?.backgroundImageLoaded ? 'YES' : 'NO'
      
      html = `
        <div class="info-section">
          <div class="info-line">Image Loaded: ${bgLoaded}</div>
          <div class="info-line">Position: (${bgX}, ${bgY})</div>
          <div class="info-line">Opacity: ${bgOpacity.toFixed(2)}</div>
        </div>
        
        <div class="button-section">
          <button class="editor-btn" data-action="loadImage">Load Image</button>
        </div>
        
        <div class="section-title">MOVE IMAGE:</div>
        <div class="button-grid-arrows">
          <button class="editor-btn arrow-btn" data-action="moveUp">▲</button>
          <div class="arrow-row">
            <button class="editor-btn arrow-btn" data-action="moveLeft">◀</button>
            <button class="editor-btn arrow-btn" data-action="moveDown">▼</button>
            <button class="editor-btn arrow-btn" data-action="moveRight">▶</button>
          </div>
        </div>
        
        <div class="section-title">OPACITY:</div>
        <div class="button-group">
          <button class="editor-btn" data-action="opacityDecrease">-</button>
          <button class="editor-btn" data-action="opacityIncrease">+</button>
        </div>
        
        <div class="button-section">
          <button class="editor-btn" data-action="resetPosition">Reset Position</button>
          <button class="editor-btn danger-btn" data-action="exitBackgroundMode">Exit BG Mode</button>
          <button class="editor-btn danger-btn" data-action="exitEditor">Exit Editor</button>
        </div>
      `
    } else if (this.unitPlacementMode) {
      const colorDots = this.availableColors.map(color => {
        const isSelected = color === this.selectedUnitColor
        return `<div class="color-dot ${isSelected ? 'selected' : ''}" 
                     style="background-color: ${this.getColorHex(color)}"
                     data-action="selectColor"
                     data-color="${color}"
                     title="${color}"></div>`
      }).join('')
      
      html = `
        <div class="info-section">
          <div class="info-line">Selected Color:</div>
          <div class="color-preview" style="background-color: ${this.getColorHex(this.selectedUnitColor)}"></div>
          <div class="info-line">${this.selectedUnitColor.toUpperCase()}</div>
          <div class="info-line">Click map to place unit</div>
        </div>
        
        <div class="section-title">COLOR PALETTE:</div>
        <div class="button-group">
          <button class="editor-btn" data-action="previousColor">◀ Prev</button>
          <button class="editor-btn" data-action="nextColor">Next ▶</button>
        </div>
        
        <div class="color-palette">
          ${colorDots}
        </div>
        
        <div class="button-section">
          <button class="editor-btn danger-btn" data-action="exitUnitMode">Exit Unit Mode</button>
          <button class="editor-btn danger-btn" data-action="exitEditor">Exit Editor</button>
        </div>
      `
    } else {
      html = `
        <div class="info-section">
          <div class="info-line">Tool: ${this.currentTool.toUpperCase()}</div>
          <div class="info-line">Brush: ${this.brushSize}x${this.brushSize}</div>
        </div>
        
        <div class="section-title">TOOLS:</div>
        <div class="button-group">
          <button class="editor-btn ${this.currentTool === 'wall' ? 'active' : ''}" data-action="setToolWall">Wall</button>
          <button class="editor-btn ${this.currentTool === 'eraser' ? 'active' : ''}" data-action="setToolEraser">Eraser</button>
        </div>
        
        <div class="section-title">BRUSH SIZE:</div>
        <div class="button-group">
          <button class="editor-btn" data-action="brushDecrease">-</button>
          <span class="brush-size-display">${this.brushSize}</span>
          <button class="editor-btn" data-action="brushIncrease">+</button>
        </div>
        
        <div class="section-title">MODES:</div>
        <div class="button-section">
          <button class="editor-btn" data-action="unitPlacementMode">Unit Placement</button>
          <button class="editor-btn" data-action="backgroundMode">Background Mode</button>
        </div>
        
        <div class="section-title">ACTIONS:</div>
        <div class="button-section">
          <button class="editor-btn" data-action="saveMap">Save Map</button>
          <button class="editor-btn" data-action="loadMap">Load Map</button>
          <button class="editor-btn" data-action="exportMap">Export Map</button>
          <button class="editor-btn" data-action="importMap">Import Map</button>
          <button class="editor-btn danger-btn" data-action="clearMap">Clear Map</button>
          <button class="editor-btn danger-btn" data-action="exitEditor">Exit Editor</button>
        </div>
      `
    }
    
    this.content.innerHTML = html
    // Event delegation is already set up in constructor, no need to attach listeners here
  }
  
  /**
   * Handle button click actions
   */
  handleButtonClick(action, colorData, game) {
    // Use stored game reference if not provided
    const gameRef = game || this.game
    
    switch (action) {
      // Main editor mode
      case 'setToolWall':
        this.setTool('wall')
        break
      case 'setToolEraser':
        this.setTool('eraser')
        break
      case 'brushDecrease':
        this.setBrushSize(this.brushSize - 1)
        break
      case 'brushIncrease':
        this.setBrushSize(this.brushSize + 1)
        break
      case 'unitPlacementMode':
        this.toggleUnitPlacementMode()
        break
      case 'backgroundMode':
        this.toggleBackgroundMode()
        break
      case 'saveMap':
        const name = prompt('Enter map name:')
        if (name) {
          this.saveMap(name)
          alert('Map saved!')
        }
        break
      case 'loadMap':
        this.showLoadMapDialog()
        break
      case 'exportMap':
        this.exportMap()
        alert('Map exported to console and clipboard!')
        break
      case 'importMap':
        const json = prompt('Paste map JSON:')
        if (json) {
          if (this.importMap(json)) {
            alert('Map imported successfully!')
          } else {
            alert('Failed to import map')
          }
        }
        break
      case 'clearMap':
        if (confirm('Clear entire map?')) {
          this.clearMap()
        }
        break
      case 'exitEditor':
        this.toggle()
        break
        
      // Unit placement mode
      case 'previousColor':
        this.previousColor()
        break
      case 'nextColor':
        this.nextColor()
        break
      case 'selectColor':
        if (colorData) {
          this.colorIndex = this.availableColors.indexOf(colorData)
          this.selectedUnitColor = colorData
          console.log(`Selected color: ${this.selectedUnitColor}`)
          this.updateUI(gameRef)
        }
        break
      case 'exitUnitMode':
        this.toggleUnitPlacementMode()
        break
        
      // Background mode
      case 'loadImage':
        // Trigger file picker
        if (window.loadBackgroundImageFromFile) {
          window.loadBackgroundImageFromFile()
        }
        break
      case 'moveUp':
        this.moveBackgroundImage(gameRef, 0, -1)
        break
      case 'moveDown':
        this.moveBackgroundImage(gameRef, 0, 1)
        break
      case 'moveLeft':
        this.moveBackgroundImage(gameRef, -1, 0)
        break
      case 'moveRight':
        this.moveBackgroundImage(gameRef, 1, 0)
        break
      case 'opacityIncrease':
        this.adjustBackgroundOpacity(gameRef, 0.1)
        break
      case 'opacityDecrease':
        this.adjustBackgroundOpacity(gameRef, -0.1)
        break
      case 'resetPosition':
        this.resetBackgroundPosition(gameRef)
        this.updateUI(gameRef)
        break
      case 'exitBackgroundMode':
        this.toggleBackgroundMode()
        break
    }
  }
  
  /**
   * Show load map dialog
   */
  showLoadMapDialog() {
    const maps = this.getSavedMaps()
    
    if (maps.length === 0) {
      alert('No saved maps found')
      return
    }
    
    let message = 'Saved Maps:\n\n'
    maps.forEach((map, i) => {
      const date = new Date(map.timestamp).toLocaleString()
      message += `${i}: ${map.name} (${map.tileCount} tiles, ${date})\n`
    })
    message += '\nEnter map number to load:'
    
    const input = prompt(message)
    if (input !== null) {
      const index = parseInt(input)
      if (!isNaN(index)) {
        if (this.loadMap(index)) {
          alert('Map loaded!')
        } else {
          alert('Failed to load map')
        }
      }
    }
  }

  /**
   * Draw brush preview
   */
  drawBrushPreview(ctx, gridX, gridY, tileSize) {
    if (!this.isActive) return

    // Unit placement preview
    if (this.unitPlacementMode) {
      const worldX = gridX * tileSize + tileSize / 2
      const worldY = gridY * tileSize + tileSize / 2
      
      // Draw unit placement indicator
      ctx.save()
      ctx.translate(worldX, worldY)
      
      // Draw circle with color
      ctx.fillStyle = this.getColorHex(this.selectedUnitColor) + '80' // 50% opacity
      ctx.strokeStyle = this.getColorHex(this.selectedUnitColor)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      
      // Draw smaller inner circle
      ctx.fillStyle = this.getColorHex(this.selectedUnitColor)
      ctx.beginPath()
      ctx.arc(0, 0, 5, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.restore()
      return
    }

    // Normal brush preview for tile editing
    const halfBrush = Math.floor(this.brushSize / 2)
    
    ctx.fillStyle = this.currentTool === 'wall' 
      ? 'rgba(255, 0, 0, 0.3)' 
      : 'rgba(0, 255, 0, 0.3)'
    ctx.strokeStyle = this.currentTool === 'wall' 
      ? 'rgba(255, 0, 0, 0.8)' 
      : 'rgba(0, 255, 0, 0.8)'
    ctx.lineWidth = 2

    for (let dy = -halfBrush; dy <= halfBrush; dy++) {
      for (let dx = -halfBrush; dx <= halfBrush; dx++) {
        const px = (gridX + dx) * tileSize
        const py = (gridY + dy) * tileSize
        
        ctx.fillRect(px, py, tileSize, tileSize)
        ctx.strokeRect(px, py, tileSize, tileSize)
      }
    }
  }
  
  /**
   * Get hex color for a color name
   */
  getColorHex(colorName) {
    const colors = {
      red: '#ff0000',
      blue: '#0000ff',
      green: '#00ff00',
      yellow: '#ffff00',
      cyan: '#00ffff',
      magenta: '#ff00ff',
      orange: '#ff8800',
      purple: '#8800ff',
      pink: '#ff66cc',
      teal: '#33cc99',
      brown: '#b38c66',
      white: '#ffffff',
      black: '#000000',
      gray: '#808080'
    }
    return colors[colorName] || '#ffffff'
  }
}

