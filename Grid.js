// Grid.js - Tile-based grid system for pathfinding

export const TILE_SIZE = 50 // Size of each tile in pixels

/**
 * Grid class - Manages the tile-based map
 */
export class Grid {
  constructor(width, height, tileSize = TILE_SIZE) {
    this.width = width
    this.height = height
    this.tileSize = tileSize
    this.cols = Math.floor(width / tileSize)
    this.rows = Math.floor(height / tileSize)
    
    // Create tile array (0 = walkable, 1 = blocked)
    this.tiles = []
    for (let y = 0; y < this.rows; y++) {
      this.tiles[y] = []
      for (let x = 0; x < this.cols; x++) {
        this.tiles[y][x] = 0 // All tiles walkable by default
      }
    }
  }

  /**
   * Convert world coordinates to grid coordinates
   */
  worldToGrid(worldX, worldY) {
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize)
    }
  }

  /**
   * Convert grid coordinates to world coordinates (center of tile)
   */
  gridToWorld(gridX, gridY) {
    return {
      x: gridX * this.tileSize + this.tileSize / 2,
      y: gridY * this.tileSize + this.tileSize / 2
    }
  }

  /**
   * Check if grid coordinates are valid
   */
  isValidTile(x, y) {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows
  }

  /**
   * Check if a tile is walkable
   */
  isWalkable(x, y) {
    if (!this.isValidTile(x, y)) return false
    return this.tiles[y][x] === 0
  }

  /**
   * Set a tile as blocked or walkable
   */
  setTile(x, y, value) {
    if (this.isValidTile(x, y)) {
      this.tiles[y][x] = value
    }
  }

  /**
   * Get tile value
   */
  getTile(x, y) {
    if (!this.isValidTile(x, y)) return 1 // Out of bounds = blocked
    return this.tiles[y][x]
  }

  /**
   * Get neighbors of a tile (4-directional or 8-directional)
   */
  getNeighbors(x, y, diagonal = true) {
    const neighbors = []
    
    // Cardinal directions
    const directions = [
      { x: 0, y: -1 },  // North
      { x: 1, y: 0 },   // East
      { x: 0, y: 1 },   // South
      { x: -1, y: 0 }   // West
    ]

    // Add diagonal directions
    if (diagonal) {
      directions.push(
        { x: 1, y: -1 },  // Northeast
        { x: 1, y: 1 },   // Southeast
        { x: -1, y: 1 },  // Southwest
        { x: -1, y: -1 }  // Northwest
      )
    }

    for (const dir of directions) {
      const nx = x + dir.x
      const ny = y + dir.y
      
      if (this.isWalkable(nx, ny)) {
        // For diagonal movement, check if both adjacent tiles are walkable
        if (diagonal && dir.x !== 0 && dir.y !== 0) {
          if (this.isWalkable(x + dir.x, y) && this.isWalkable(x, y + dir.y)) {
            neighbors.push({ x: nx, y: ny })
          }
        } else {
          neighbors.push({ x: nx, y: ny })
        }
      }
    }

    return neighbors
  }

  /**
   * Draw the grid
   */
  draw(ctx, showGrid = true, showBlocked = true) {
    // Draw tiles
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const worldPos = this.gridToWorld(x, y)
        const tileX = x * this.tileSize
        const tileY = y * this.tileSize

        // Draw blocked tiles with better visuals
        if (showBlocked && this.tiles[y][x] === 1) {
          // Dark red/brown fill
          ctx.fillStyle = 'rgba(80, 20, 20, 0.7)'
          ctx.fillRect(tileX, tileY, this.tileSize, this.tileSize)
          
          // Red border
          ctx.strokeStyle = 'rgba(180, 40, 40, 0.9)'
          ctx.lineWidth = 2
          ctx.strokeRect(tileX + 1, tileY + 1, this.tileSize - 2, this.tileSize - 2)
          
          // Diagonal lines pattern
          ctx.strokeStyle = 'rgba(120, 30, 30, 0.5)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(tileX, tileY)
          ctx.lineTo(tileX + this.tileSize, tileY + this.tileSize)
          ctx.moveTo(tileX + this.tileSize, tileY)
          ctx.lineTo(tileX, tileY + this.tileSize)
          ctx.stroke()
        }

        // Draw grid lines
        if (showGrid) {
          ctx.strokeStyle = 'rgba(138, 43, 226, 0.2)'
          ctx.lineWidth = 1
          ctx.strokeRect(tileX, tileY, this.tileSize, this.tileSize)
        }
      }
    }
  }

  /**
   * Highlight a specific tile
   */
  highlightTile(ctx, gridX, gridY, color = 'rgba(255, 255, 0, 0.5)') {
    if (!this.isValidTile(gridX, gridY)) return
    
    const tileX = gridX * this.tileSize
    const tileY = gridY * this.tileSize
    
    ctx.fillStyle = color
    ctx.fillRect(tileX, tileY, this.tileSize, this.tileSize)
    
    ctx.strokeStyle = color.replace('0.5', '1')
    ctx.lineWidth = 2
    ctx.strokeRect(tileX, tileY, this.tileSize, this.tileSize)
  }

  /**
   * Draw a path on the grid
   */
  drawPath(ctx, path, color = 'rgba(0, 255, 0, 0.5)') {
    if (!path || path.length === 0) return

    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    const start = this.gridToWorld(path[0].x, path[0].y)
    ctx.moveTo(start.x, start.y)

    for (let i = 1; i < path.length; i++) {
      const pos = this.gridToWorld(path[i].x, path[i].y)
      ctx.lineTo(pos.x, pos.y)
    }

    ctx.stroke()

    // Draw dots at waypoints
    ctx.fillStyle = color
    for (const node of path) {
      const pos = this.gridToWorld(node.x, node.y)
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

