import './style.css'
import { Unit, UnitState, SPRITE_SHEET, SPRITE_WIDTH, SPRITE_HEIGHT, 
         SPRITE_OFFSET_X, SPRITE_OFFSET_Y, SPRITE_SPACING_X, SPRITE_SPACING_Y } from './Unit.js'
import { ColorShader, getRandomPalette } from './ColorShader.js'
import { Grid, TILE_SIZE } from './Grid.js'
import { findPath, smoothPath } from './Pathfinding.js'

// Game constants
const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 600

// Game state
const game = {
  canvas: null,
  ctx: null,
  spriteSheet: null,
  colorShader: null,
  grid: null,
  units: [],
  selectedUnits: [],
  isSelecting: false,
  selectionStart: { x: 0, y: 0 },
  selectionEnd: { x: 0, y: 0 },
  keys: {},
  mouse: { x: 0, y: 0 },
  hoveredTile: null,
  clickedOnUnit: false,
  obstacleEditMode: false
}

// Initialize game
function init() {
  game.canvas = document.getElementById('gameCanvas')
  game.ctx = game.canvas.getContext('2d')
  
  game.canvas.width = CANVAS_WIDTH
  game.canvas.height = CANVAS_HEIGHT

  // Initialize grid
  game.grid = new Grid(CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE)
  
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
 * Create obstacles on the map
 */
function createObstacles() {
  // Create some walls and obstacles
  
  // Vertical wall on left side
  for (let y = 2; y < 10; y++) {
    game.grid.setTile(4, y, 1) // 1 = blocked
  }
  
  // Horizontal wall in middle
  for (let x = 8; x < 16; x++) {
    game.grid.setTile(x, 5, 1)
  }
  
  // Small building/obstacle
  for (let y = 8; y < 11; y++) {
    for (let x = 10; x < 13; x++) {
      game.grid.setTile(x, y, 1)
    }
  }
  
  // Another vertical wall
  for (let y = 1; y < 6; y++) {
    game.grid.setTile(18, y, 1)
  }
  
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
  // Update all units
  game.units.forEach(unit => unit.update(deltaTime))

  // Remove dead units after death animation
  game.units = game.units.filter(unit => !unit.isDeathAnimationComplete())

  updateStats()
}

function render() {
  const ctx = game.ctx

  // Clear canvas
  ctx.fillStyle = '#0a0a15'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Draw tile grid (show grid lines and blocked tiles)
  game.grid.draw(ctx, true, true)

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

  // Draw units
  game.units.forEach(unit => {
    unit.draw(ctx)
  })
  
  // Debug: Show unit count and mode
  ctx.fillStyle = 'white'
  ctx.font = '12px monospace'
  ctx.fillText(`Units: ${game.units.length}`, 10, 20)
  
  if (game.obstacleEditMode) {
    ctx.fillStyle = '#ff6600'
    ctx.font = 'bold 14px monospace'
    ctx.fillText('OBSTACLE EDIT MODE (O to toggle)', 10, 40)
    ctx.fillText('Click tiles to add/remove obstacles', 10, 60)
  }

  // Draw selection box
  if (game.isSelecting) {
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(
      game.selectionStart.x,
      game.selectionStart.y,
      game.selectionEnd.x - game.selectionStart.x,
      game.selectionEnd.y - game.selectionStart.y
    )
    ctx.setLineDash([])
  }
}

function handleMouseDown(e) {
  const rect = game.canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

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

  // Update hovered tile
  game.hoveredTile = game.grid.worldToGrid(x, y)

  if (game.isSelecting) {
    game.selectionEnd = { x, y }
  }
}

function handleMouseUp(e) {
  if (!game.isSelecting) return

  const rect = game.canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  game.isSelecting = false

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
 * Move units to a position using pathfinding
 */
function moveUnitsToPosition(units, worldX, worldY) {
  // Convert click position to grid coordinates
  const targetTile = game.grid.worldToGrid(worldX, worldY)
  
  console.log(`Target tile: (${targetTile.x}, ${targetTile.y})`)
  
  // Make sure target tile is walkable
  if (!game.grid.isWalkable(targetTile.x, targetTile.y)) {
    console.log('Target tile is not walkable')
    return
  }

  const targetWorld = game.grid.gridToWorld(targetTile.x, targetTile.y)

  units.forEach(unit => {
    // Convert unit position to grid coordinates
    const startTile = game.grid.worldToGrid(unit.x, unit.y)
    
    console.log(`Finding path from (${startTile.x}, ${startTile.y}) to (${targetTile.x}, ${targetTile.y})`)
    
    // Find path from unit to target
    const gridPath = findPath(game.grid, startTile, targetTile, true)
    
    if (gridPath) {
      console.log(`Path found with ${gridPath.length} waypoints`)
      
      // Convert grid path to world coordinates
      const worldPath = gridPath.map(node => game.grid.gridToWorld(node.x, node.y))
      
      // Smooth the path
      const gridPathSmoothed = smoothPath(game.grid, gridPath)
      const worldPathSmoothed = gridPathSmoothed.map(node => game.grid.gridToWorld(node.x, node.y))
      
      console.log(`Smoothed path: ${worldPathSmoothed.length} waypoints`)
      
      // Set the path for the unit
      unit.setPath(worldPathSmoothed)
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

  // Spawn unit with spacebar (random color)
  if (e.key === ' ') {
    e.preventDefault()
    const x = Math.random() * (CANVAS_WIDTH - 100) + 50
    const y = Math.random() * (CANVAS_HEIGHT - 100) + 50
    spawnUnit(x, y) // Random color palette
  }
  
  // Toggle obstacle editing mode with 'O' key
  if (e.key === 'o' || e.key === 'O') {
    game.obstacleEditMode = !game.obstacleEditMode
    console.log(`Obstacle edit mode: ${game.obstacleEditMode ? 'ON - Click tiles to toggle obstacles' : 'OFF'}`)
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

function handleKeyUp(e) {
  game.keys[e.key] = false
}

function updateStats() {
  document.getElementById('unitCount').textContent = game.units.filter(u => u.isAlive()).length
  document.getElementById('selectedCount').textContent = game.units.filter(u => u.selected).length
}

// Start the game when page loads
init()
