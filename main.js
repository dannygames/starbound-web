import './style.css'
import { Unit, UnitState, SPRITE_SHEET, SPRITE_WIDTH, SPRITE_HEIGHT, 
         SPRITE_OFFSET_X, SPRITE_OFFSET_Y, SPRITE_SPACING_X, SPRITE_SPACING_Y } from './Unit.js'
import { ColorShader, getRandomPalette } from './ColorShader.js'
import { Grid, TILE_SIZE } from './Grid.js'
import { findPath, smoothPath } from './Pathfinding.js'
import { findPixelPath, optimizePixelPath } from './PixelPathfinding.js'
import { MapEditor } from './MapEditor.js'
import { Cursor } from './Cursor.js'

// Game constants
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 480

// Game state
const game = {
  canvas: null,
  ctx: null,
  spriteSheet: null,
  colorShader: null,
  grid: null,
  mapEditor: null,
  units: [],
  selectedUnits: [],
  isSelecting: false,
  selectionStart: { x: 0, y: 0 },
  selectionEnd: { x: 0, y: 0 },
  keys: {},
  mouse: { x: 0, y: 0 },
  hoveredTile: null,
  clickedOnUnit: false,
  obstacleEditMode: false,
  
  // Background image overlay
  backgroundImage: null,
  backgroundImageLoaded: false,
  backgroundImageOffset: { x: 0, y: 0 },
  backgroundImageOpacity: 1.0,
  
  // Animated cursor
  cursor: null,
  
  // Debug mode
  debugMode: false
}

// Initialize game
function init() {
  game.canvas = document.getElementById('gameCanvas')
  game.ctx = game.canvas.getContext('2d')
  
  game.canvas.width = CANVAS_WIDTH
  game.canvas.height = CANVAS_HEIGHT

  // Initialize grid
  game.grid = new Grid(CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE)
  
  // Initialize map editor
  game.mapEditor = new MapEditor(game.grid)
  
  // Add some unwalkable obstacles
  createObstacles()

  // Initialize color shader
  game.colorShader = new ColorShader()

  // Load sprite sheet
  game.spriteSheet = new Image()
  game.spriteSheet.src = '/images/PC _ Computer - StarCraft - Zerg - Zerg Zergling.png'
  game.spriteSheet.onload = () => {
    console.log('Sprite sheet loaded!')
    
    // Preload color palettes (optional, for better performance)
    preloadPalettes()
    
    // Create initial units AFTER sprite sheet loads
    spawnUnit(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'red')
    spawnUnit(CANVAS_WIDTH / 2 + 60, CANVAS_HEIGHT / 2, 'blue')
    spawnUnit(CANVAS_WIDTH / 2 - 60, CANVAS_HEIGHT / 2, 'green')
    
    console.log(`Spawned ${game.units.length} units`)
  }
  
  // Initialize animated cursor with multiple states
  game.cursor = new Cursor({
    default: [
      '/images/cursor/cursor_1.png',
      '/images/cursor/cursor_2.png',
      '/images/cursor/cursor_3.png',
      '/images/cursor/cursor_4.png',
      '/images/cursor/cursor_5.png'
    ],
    dragSelect: '/images/cursor/cursor_drag_select.png'
  }, 100) // 100ms per frame for animated states
  
  // Load background image
  loadBackgroundImage('/images/maps/space.png')

  // Event listeners
  game.canvas.addEventListener('mousedown', handleMouseDown)
  game.canvas.addEventListener('mousemove', handleMouseMove)
  game.canvas.addEventListener('mouseup', handleMouseUp)
  game.canvas.addEventListener('contextmenu', handleRightClick)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  // Start game loop
  let lastTime = performance.now()
  
  function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime
    lastTime = currentTime

    update(deltaTime)
    render()

    requestAnimationFrame(gameLoop)
  }

  requestAnimationFrame(gameLoop)
}

function spawnUnit(x, y, colorPalette = null) {
  // If no palette specified, choose random
  if (!colorPalette) {
    colorPalette = getRandomPalette()
  }
  
  const unit = new Unit(x, y, colorPalette, game.spriteSheet, game.colorShader)
  game.units.push(unit)
  updateStats()
}

/**
 * Load a background image overlay
 */
function loadBackgroundImage(imagePath) {
  game.backgroundImage = new Image()
  game.backgroundImage.onload = () => {
    game.backgroundImageLoaded = true
    console.log('Background image loaded:', imagePath)
  }
  game.backgroundImage.onerror = () => {
    console.error('Failed to load background image:', imagePath)
    game.backgroundImageLoaded = false
  }
  game.backgroundImage.src = imagePath
}

/**
 * Load background image from file picker
 */
function loadBackgroundImageFromFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        loadBackgroundImage(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }
  
  input.click()
}

/**
 * Create obstacles on the map
 */
function createObstacles() {
  // Create some walls and obstacles
  
  // Vertical wall on left side
  // for (let y = 2; y < 10; y++) {
  //   game.grid.setTile(4, y, 1) // 1 = blocked
  // }
  
  // // Horizontal wall in middle
  // for (let x = 8; x < 16; x++) {
  //   game.grid.setTile(x, 5, 1)
  // }
  
  // // Small building/obstacle
  // for (let y = 8; y < 11; y++) {
  //   for (let x = 10; x < 13; x++) {
  //     game.grid.setTile(x, y, 1)
  //   }
  // }
  
  // // Another vertical wall
  // for (let y = 1; y < 6; y++) {
  //   game.grid.setTile(18, y, 1)
  // }
  
  // Random scattered obstacles
  const randomObstacles = [
    { x: 7, y: 9 },
    { x: 15, y: 2 },
    { x: 20, y: 8 },
    { x: 3, y: 11 },
    { x: 16, y: 10 }
  ]
  
  randomObstacles.forEach(obs => {
    game.grid.setTile(obs.x, obs.y, 1)
  })
  
  console.log('Obstacles created on the map')
}

function preloadPalettes() {
  console.log('Preloading color palettes...')
  const config = {
    SPRITE_WIDTH,
    SPRITE_HEIGHT,
    SPRITE_OFFSET_X,
    SPRITE_OFFSET_Y,
    SPRITE_SPACING_X,
    SPRITE_SPACING_Y,
    SPRITE_SHEET
  }
  
  // Preload common palettes
  game.colorShader.preloadPalette(game.spriteSheet, config, 'red')
  game.colorShader.preloadPalette(game.spriteSheet, config, 'blue')
  game.colorShader.preloadPalette(game.spriteSheet, config, 'green')
  game.colorShader.preloadPalette(game.spriteSheet, config, 'yellow')
  
  console.log(`Total cached sprites: ${game.colorShader.getCacheSize()}`)
}

function update(deltaTime) {
  // Update all units with grid and other units for collision detection
  game.units.forEach(unit => unit.update(deltaTime, game.grid, game.units))

  // Remove dead units after death animation
  game.units = game.units.filter(unit => !unit.isDeathAnimationComplete())

  // Update cursor animation
  if (game.cursor) {
    game.cursor.update(deltaTime)
  }
  
  // Update map editor UI if active
  if (game.mapEditor && game.mapEditor.isActive) {
    game.mapEditor.updateUI(game)
  }

  updateStats()
}

function render() {
  const ctx = game.ctx

  // Clear canvas
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Draw tile grid (show grid lines and blocked tiles)
  game.grid.draw(ctx, true, true)
  
  // Draw background image overlay (if loaded)
  if (game.backgroundImageLoaded && game.backgroundImage) {
    ctx.save()
    ctx.globalAlpha = game.backgroundImageOpacity
    ctx.drawImage(
      game.backgroundImage,
      game.backgroundImageOffset.x,
      game.backgroundImageOffset.y
    )
    ctx.restore()
  }

  // Debug visualizations
  if (game.debugMode) {
    // Highlight hovered tile
    if (game.hoveredTile) {
      game.grid.highlightTile(ctx, game.hoveredTile.x, game.hoveredTile.y, 'rgba(255, 255, 255, 0.2)')
    }

    // Draw unit paths (for debugging/visualization)
    game.units.forEach(unit => {
      if (unit.selected && unit.path.length > 0) {
        // Convert path from world coords to grid coords for visualization
        const gridPath = unit.path.map(p => game.grid.worldToGrid(p.x, p.y))
        game.grid.drawPath(ctx, gridPath, 'rgba(0, 255, 0, 0.3)')
      }
    })
  }

  // Draw units
  game.units.forEach(unit => {
    unit.draw(ctx)
  })
  
  // Draw brush preview for map editor (only in tile editing mode, not background mode)
  if (game.mapEditor && game.mapEditor.isActive && game.hoveredTile && !game.mapEditor.backgroundImageMode) {
    game.mapEditor.drawBrushPreview(ctx, game.hoveredTile.x, game.hoveredTile.y, TILE_SIZE)
  }
  
  // Debug: Show unit count
  ctx.fillStyle = '#00ff00'
  ctx.font = '12px "Courier New"'
  ctx.textAlign = 'left'
  ctx.fillText(`Units: ${game.units.length}`, 10, 20)
  
  if (game.mapEditor && game.mapEditor.isActive) {
    ctx.fillStyle = '#ffff00'
    ctx.fillText('MAP EDITOR ACTIVE (M to exit)', 10, 40)
  }
  
  if (game.debugMode) {
    ctx.fillStyle = '#ff00ff'
    ctx.fillText('DEBUG MODE (D to toggle)', 10, game.mapEditor && game.mapEditor.isActive ? 60 : 40)
  }

  // Draw selection box
  if (game.isSelecting) {
    ctx.strokeStyle = '#249824'
    ctx.lineWidth = 1
    // ctx.setLineDash([5, 5])
    ctx.strokeRect(
      game.selectionStart.x,
      game.selectionStart.y,
      game.selectionEnd.x - game.selectionStart.x,
      game.selectionEnd.y - game.selectionStart.y
    )
    ctx.setLineDash([])
  }
  
  // Draw animated cursor
  if (game.cursor) {
    game.cursor.draw(ctx)
  }
}

function handleMouseDown(e) {
  const rect = game.canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  // If map editor is active, handle editor input
  if (game.mapEditor && game.mapEditor.isActive) {
    const tile = game.grid.worldToGrid(x, y)
    game.mapEditor.startDrawing(tile.x, tile.y)
    return
  }

  game.isSelecting = true
  game.selectionStart = { x, y }
  game.selectionEnd = { x, y }

  // Check if clicking on a unit
  const clickedUnit = game.units.find(unit => unit.isPointInside(x, y))
  
  // Store whether we clicked on a unit (to prevent movement command on same click)
  game.clickedOnUnit = !!clickedUnit
  
  // Only deselect if clicking empty space AND not holding shift AND this is a new selection (not a move command)
  // We'll handle deselection in mouseUp if it's a short click with no selected units
  
  if (clickedUnit) {
    // Clicking on a unit - handle selection/deselection
    if (!e.shiftKey) {
      // If not holding shift, deselect all other units
      game.units.forEach(unit => {
        if (unit !== clickedUnit) {
          unit.selected = false
        }
      })
    }
    clickedUnit.toggleSelection()
    console.log(`Unit ${clickedUnit.selected ? 'selected' : 'deselected'}`)
  }
  // Don't deselect units here when clicking empty space - they might be issuing a move command
}

function handleMouseMove(e) {
  const rect = game.canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  game.mouse = { x, y }
  
  // Update cursor position
  if (game.cursor) {
    game.cursor.setPosition(x, y)
  }

  // Update hovered tile
  game.hoveredTile = game.grid.worldToGrid(x, y)
  
  // If map editor is active and drawing, continue drawing
  if (game.mapEditor && game.mapEditor.isActive && game.mapEditor.isDrawing) {
    game.mapEditor.draw(game.hoveredTile.x, game.hoveredTile.y)
  }

  if (game.isSelecting && (!game.mapEditor || !game.mapEditor.isActive)) {
    game.selectionEnd = { x, y }
    
    // Switch to drag select cursor when actively dragging
    const dragDistance = Math.abs(x - game.selectionStart.x) + Math.abs(y - game.selectionStart.y)
    if (dragDistance > 5 && game.cursor && game.cursor.getState() !== 'dragSelect') {
      game.cursor.setState('dragSelect')
    }
  }
}

function handleMouseUp(e) {
  // Stop map editor drawing
  if (game.mapEditor && game.mapEditor.isActive) {
    game.mapEditor.stopDrawing()
    return
  }
  
  if (!game.isSelecting) return

  const rect = game.canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  game.isSelecting = false
  
  // Reset cursor to default state
  if (game.cursor) {
    game.cursor.setState('default')
  }

  // Select units in box
  const minX = Math.min(game.selectionStart.x, x)
  const maxX = Math.max(game.selectionStart.x, x)
  const minY = Math.min(game.selectionStart.y, y)
  const maxY = Math.max(game.selectionStart.y, y)

  const boxSize = Math.abs(maxX - minX) + Math.abs(maxY - minY)

  if (boxSize > 10) { // If we actually dragged a box
    console.log(`Drag selection detected: box (${minX}, ${minY}) to (${maxX}, ${maxY})`)
    console.log(`Total units to check: ${game.units.length}`)
    
    if (!e.shiftKey) {
      game.units.forEach(unit => unit.selected = false)
    }

    let selectedCount = 0
    game.units.forEach(unit => {
      console.log(`Unit at (${unit.x.toFixed(1)}, ${unit.y.toFixed(1)}) - intersects: ${unit.intersectsRect(minX, minY, maxX, maxY)}`)
      if (unit.intersectsRect(minX, minY, maxX, maxY) && unit.isAlive()) {
        unit.setSelected(true)
        selectedCount++
      }
    })
    
    console.log(`Drag-selected ${selectedCount} units`)
  } else {
    // Single click
    if (game.obstacleEditMode) {
      // In obstacle edit mode - toggle tile walkability
      const tile = game.grid.worldToGrid(x, y)
      const currentValue = game.grid.getTile(tile.x, tile.y)
      game.grid.setTile(tile.x, tile.y, currentValue === 0 ? 1 : 0)
      console.log(`Tile (${tile.x}, ${tile.y}) set to ${currentValue === 0 ? 'BLOCKED' : 'WALKABLE'}`)
    } else if (game.clickedOnUnit) {
      console.log('Clicked on unit for selection, not issuing move command')
    } else {
      // Move selected units using pathfinding
      const selectedUnits = game.units.filter(unit => unit.selected)
      console.log(`Selected units: ${selectedUnits.length}`)
      if (selectedUnits.length > 0) {
        console.log(`Moving ${selectedUnits.length} units to (${x}, ${y})`)
        moveUnitsToPosition(selectedUnits, x, y)
      } else {
        console.log('No units selected! Click on a unit first to select it.')
      }
    }
  }
  
  // Reset the clicked on unit flag
  game.clickedOnUnit = false
}

/**
 * Move units to a position using pixel-perfect pathfinding
 */
function moveUnitsToPosition(units, worldX, worldY) {
  console.log(`Moving units to exact position: (${worldX.toFixed(1)}, ${worldY.toFixed(1)})`)
  
  // Check if target is in a walkable tile
  const targetTile = game.grid.worldToGrid(worldX, worldY)
  if (!game.grid.isWalkable(targetTile.x, targetTile.y)) {
    console.log('Target tile is not walkable')
    return
  }

  units.forEach(unit => {
    // Use pixel-perfect pathfinding
    const startWorld = { x: unit.x, y: unit.y }
    const goalWorld = { x: worldX, y: worldY }
    
    console.log(`Finding pixel path from (${startWorld.x.toFixed(1)}, ${startWorld.y.toFixed(1)}) to (${goalWorld.x.toFixed(1)}, ${goalWorld.y.toFixed(1)})`)
    
    // Find pixel-perfect path
    const pixelPath = findPixelPath(game.grid, startWorld, goalWorld)
    
    if (pixelPath) {
      // Optimize the path further
      const optimizedPath = optimizePixelPath(game.grid, pixelPath)
      
      console.log(`Pixel path found: ${pixelPath.length} waypoints, optimized to ${optimizedPath.length} waypoints`)
      
      // Set the path for the unit
      unit.setPath(optimizedPath)
    } else {
      console.log('No path found!')
    }
  })
}

function handleRightClick(e) {
  e.preventDefault()

  const rect = game.canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // Check if right-clicking on an enemy unit
  const clickedUnit = game.units.find(unit => unit.isPointInside(x, y))
  const selectedUnits = game.units.filter(unit => unit.selected)

  if (clickedUnit && selectedUnits.length > 0) {
    // Attack command
    selectedUnits.forEach(unit => {
      if (unit !== clickedUnit) {
        unit.setAttackTarget(clickedUnit)
      }
    })
  }

  return false
}

function handleKeyDown(e) {
  game.keys[e.key] = true

  // Debug mode toggle
  if (e.key === 'd' || e.key === 'D') {
    game.debugMode = !game.debugMode
    console.log(`Debug mode ${game.debugMode ? 'enabled' : 'disabled'}`)
    return
  }

  // Map Editor Controls
  if (e.key === 'm' || e.key === 'M') {
    if (game.mapEditor) {
      game.mapEditor.toggle()
    }
  }
  
  // Only handle editor shortcuts if editor is active
  if (game.mapEditor && game.mapEditor.isActive) {
    // Toggle background image mode
    if (e.key === 'b' || e.key === 'B') {
      game.mapEditor.toggleBackgroundMode()
      return
    }
    
    // Background image mode controls
    if (game.mapEditor.backgroundImageMode) {
      // Load background image
      if (e.key === 'o' || e.key === 'O') {
        loadBackgroundImageFromFile()
      }
      // Arrow keys to move background
      else if (e.key === 'ArrowUp') {
        e.preventDefault()
        game.mapEditor.moveBackgroundImage(game, 0, -1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        game.mapEditor.moveBackgroundImage(game, 0, 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        game.mapEditor.moveBackgroundImage(game, -1, 0)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        game.mapEditor.moveBackgroundImage(game, 1, 0)
      }
      // Opacity adjustment
      else if (e.key === '+' || e.key === '=') {
        game.mapEditor.adjustBackgroundOpacity(game, 0.1)
      } else if (e.key === '-' || e.key === '_') {
        game.mapEditor.adjustBackgroundOpacity(game, -0.1)
      }
      // Reset position
      else if (e.key === 'r' || e.key === 'R') {
        game.mapEditor.resetBackgroundPosition(game)
      }
      
      return // Don't process other controls in background mode
    }
    
    // Tile editing mode controls
    // Tool selection
    if (e.key === '1') {
      game.mapEditor.setTool('wall')
    } else if (e.key === '2') {
      game.mapEditor.setTool('eraser')
    }
    
    // Brush size
    else if (e.key === '[') {
      game.mapEditor.setBrushSize(game.mapEditor.brushSize - 1)
    } else if (e.key === ']') {
      game.mapEditor.setBrushSize(game.mapEditor.brushSize + 1)
    }
    
    // Save/Load
    else if (e.key === 's' || e.key === 'S') {
      e.preventDefault()
      const name = prompt('Enter map name:')
      if (name) {
        game.mapEditor.saveMap(name)
        alert('Map saved!')
      }
    } else if (e.key === 'l' || e.key === 'L') {
      showLoadMapDialog()
    }
    
    // Export/Import
    else if (e.key === 'e' || e.key === 'E') {
      game.mapEditor.exportMap()
      alert('Map exported to console and clipboard!')
    } else if (e.key === 'i' || e.key === 'I') {
      const json = prompt('Paste map JSON:')
      if (json) {
        if (game.mapEditor.importMap(json)) {
          alert('Map imported successfully!')
        } else {
          alert('Failed to import map')
        }
      }
    }
    
    // Clear
    else if (e.key === 'c' || e.key === 'C') {
      if (confirm('Clear entire map?')) {
        game.mapEditor.clearMap()
      }
    }
    
    return // Don't process game controls in editor mode
  }

  // Game Controls (only when editor is not active)
  // Spawn unit with spacebar (random color)
  if (e.key === ' ') {
    e.preventDefault()
    const x = Math.random() * (CANVAS_WIDTH - 100) + 50
    const y = Math.random() * (CANVAS_HEIGHT - 100) + 50
    spawnUnit(x, y) // Random color palette
  }
  
  // Kill selected units with Delete or Backspace key
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    const selectedUnits = game.units.filter(unit => unit.selected)
    if (selectedUnits.length > 0) {
      selectedUnits.forEach(unit => {
        unit.die()
      })
      console.log(`Killed ${selectedUnits.length} selected unit(s)`)
    }
  }
  
  // Clear all obstacles with 'C' key
  if (e.key === 'c' || e.key === 'C') {
    if (confirm('Clear all obstacles?')) {
      for (let y = 0; y < game.grid.rows; y++) {
        for (let x = 0; x < game.grid.cols; x++) {
          game.grid.setTile(x, y, 0)
        }
      }
      console.log('All obstacles cleared')
    }
  }
}

/**
 * Show load map dialog
 */
function showLoadMapDialog() {
  const maps = game.mapEditor.getSavedMaps()
  
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
      if (game.mapEditor.loadMap(index)) {
        alert('Map loaded!')
      } else {
        alert('Failed to load map')
      }
    }
  }
}

function handleKeyUp(e) {
  game.keys[e.key] = false
}

function updateStats() {
  document.getElementById('unitCount').textContent = game.units.filter(u => u.isAlive()).length
  document.getElementById('selectedCount').textContent = game.units.filter(u => u.selected).length
}

// Start the game when page loads
init()
