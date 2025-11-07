// MapEditor.js - Map editing tools and UI

export class MapEditor {
  constructor(grid) {
    this.grid = grid
    this.isActive = false
    this.currentTool = 'wall' // wall, eraser
    this.brushSize = 1
    this.isDrawing = false
    this.savedMaps = this.loadSavedMaps()
    
    // Background image positioning mode
    this.backgroundImageMode = false
    this.backgroundMoveStep = 5 // pixels per key press
  }

  /**
   * Toggle editor mode
   */
  toggle() {
    this.isActive = !this.isActive
    console.log(`Map Editor: ${this.isActive ? 'ACTIVE' : 'INACTIVE'}`)
    return this.isActive
  }

  /**
   * Set the current tool
   */
  setTool(tool) {
    this.currentTool = tool
    console.log(`Tool selected: ${tool}`)
  }

  /**
   * Set brush size
   */
  setBrushSize(size) {
    this.brushSize = Math.max(1, Math.min(5, size))
    console.log(`Brush size: ${this.brushSize}`)
  }
  
  /**
   * Toggle background image positioning mode
   */
  toggleBackgroundMode() {
    this.backgroundImageMode = !this.backgroundImageMode
    console.log(`Background Image Mode: ${this.backgroundImageMode ? 'ACTIVE' : 'INACTIVE'}`)
    return this.backgroundImageMode
  }
  
  /**
   * Move background image
   */
  moveBackgroundImage(game, dx, dy) {
    if (!this.backgroundImageMode) return
    
    game.backgroundImageOffset.x += dx * this.backgroundMoveStep
    game.backgroundImageOffset.y += dy * this.backgroundMoveStep
    
    console.log(`Background position: (${game.backgroundImageOffset.x}, ${game.backgroundImageOffset.y})`)
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
  }

  /**
   * Apply tool to grid at position
   */
  applyTool(gridX, gridY) {
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
  }

  /**
   * Start drawing
   */
  startDrawing(gridX, gridY) {
    this.isDrawing = true
    this.applyTool(gridX, gridY)
  }

  /**
   * Continue drawing
   */
  draw(gridX, gridY) {
    if (this.isDrawing) {
      this.applyTool(gridX, gridY)
    }
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
   * Draw editor UI overlay
   */
  drawUI(ctx, canvasWidth, canvasHeight, game) {
    if (!this.isActive) return

    const panelWidth = 250
    const panelHeight = this.backgroundImageMode ? 400 : 300
    const x = canvasWidth - panelWidth - 20
    const y = 20

    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
    ctx.fillRect(x, y, panelWidth, panelHeight)

    // Panel border
    ctx.strokeStyle = this.backgroundImageMode ? '#ff00ff' : '#00ff00'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, panelWidth, panelHeight)

    // Title
    ctx.fillStyle = this.backgroundImageMode ? '#ff00ff' : '#00ff00'
    ctx.font = 'bold 16px "Courier New"'
    ctx.textAlign = 'center'
    const title = this.backgroundImageMode ? 'BACKGROUND MODE' : 'MAP EDITOR'
    ctx.fillText(title, x + panelWidth / 2, y + 25)

    // Instructions
    ctx.font = '12px "Courier New"'
    ctx.textAlign = 'left'
    ctx.fillStyle = this.backgroundImageMode ? '#ff00ff' : '#00cc00'
    
    let yPos = y + 50
    const lineHeight = 20

    let instructions
    if (this.backgroundImageMode) {
      const bgX = game?.backgroundImageOffset?.x || 0
      const bgY = game?.backgroundImageOffset?.y || 0
      const bgOpacity = game?.backgroundImageOpacity || 1
      const bgLoaded = game?.backgroundImageLoaded ? 'YES' : 'NO'
      
      instructions = [
        `Image Loaded: ${bgLoaded}`,
        `Position: (${bgX}, ${bgY})`,
        `Opacity: ${bgOpacity.toFixed(2)}`,
        '',
        'CONTROLS:',
        'O - Load Image',
        'Arrow Keys - Move',
        '+/- - Opacity',
        'R - Reset Position',
        'B - Exit BG Mode',
        'M - Exit Editor'
      ]
    } else {
      instructions = [
        `Tool: ${this.currentTool.toUpperCase()}`,
        `Brush: ${this.brushSize}x${this.brushSize}`,
        '',
        'CONTROLS:',
        '1 - Wall Tool',
        '2 - Eraser Tool',
        '[ ] - Brush Size',
        'B - Background Mode',
        'E - Export Map',
        'S - Save Map',
        'L - Load Menu',
        'C - Clear Map',
        'M - Toggle Editor'
      ]
    }

    instructions.forEach(line => {
      if (line === '') {
        yPos += lineHeight / 2
      } else {
        ctx.fillText(line, x + 10, yPos)
        yPos += lineHeight
      }
    })
  }

  /**
   * Draw brush preview
   */
  drawBrushPreview(ctx, gridX, gridY, tileSize) {
    if (!this.isActive) return

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
}

