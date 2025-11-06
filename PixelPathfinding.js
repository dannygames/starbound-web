// PixelPathfinding.js - Pixel-perfect pathfinding that uses grid for obstacles only

import { findPath, smoothPath } from './Pathfinding.js'

/**
 * Find path to exact pixel coordinates
 * Uses grid-based A* for obstacle avoidance but targets exact pixel position
 * @param {Grid} grid - The grid for obstacle detection
 * @param {Object} startWorld - Start position {x, y} in world coordinates
 * @param {Object} goalWorld - Goal position {x, y} in world coordinates
 * @returns {Array} Path as array of {x, y} world coordinates, or null if no path found
 */
export function findPixelPath(grid, startWorld, goalWorld) {
  // Convert to grid coordinates
  const startTile = grid.worldToGrid(startWorld.x, startWorld.y)
  const goalTile = grid.worldToGrid(goalWorld.x, goalWorld.y)
  
  // Check if goal is in a walkable tile
  if (!grid.isWalkable(goalTile.x, goalTile.y)) {
    console.log('Goal tile not walkable')
    return null
  }
  
  // If we're in the same tile, just go directly to the pixel location
  if (startTile.x === goalTile.x && startTile.y === goalTile.y) {
    return [
      { x: startWorld.x, y: startWorld.y },
      { x: goalWorld.x, y: goalWorld.y }
    ]
  }
  
  // Find grid path using A*
  const gridPath = findPath(grid, startTile, goalTile, true)
  
  if (!gridPath || gridPath.length === 0) {
    return null
  }
  
  // Smooth the grid path
  const smoothedGridPath = smoothPath(grid, gridPath)
  
  // Convert to world coordinates (using tile centers)
  const worldPath = smoothedGridPath.map(node => grid.gridToWorld(node.x, node.y))
  
  // Replace the last waypoint with the exact pixel destination
  if (worldPath.length > 0) {
    worldPath[worldPath.length - 1] = { x: goalWorld.x, y: goalWorld.y }
  }
  
  // If we have multiple waypoints, we can also refine the first one
  // to start from exact current position instead of tile center
  if (worldPath.length > 1) {
    worldPath[0] = { x: startWorld.x, y: startWorld.y }
  }
  
  return worldPath
}

/**
 * Check if there's a clear line of sight between two world positions
 * Uses grid for obstacle checking
 */
export function hasLineOfSightWorld(grid, fromWorld, toWorld) {
  const dx = toWorld.x - fromWorld.x
  const dy = toWorld.y - fromWorld.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  if (distance === 0) return true
  
  // Sample points along the line
  const samples = Math.ceil(distance / (grid.tileSize / 2))
  
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const x = fromWorld.x + dx * t
    const y = fromWorld.y + dy * t
    
    const tile = grid.worldToGrid(x, y)
    if (!grid.isWalkable(tile.x, tile.y)) {
      return false
    }
  }
  
  return true
}

/**
 * Optimize pixel path by removing unnecessary waypoints
 * Uses line-of-sight checking
 */
export function optimizePixelPath(grid, path) {
  if (!path || path.length <= 2) return path
  
  const optimized = [path[0]]
  let currentIndex = 0
  
  while (currentIndex < path.length - 1) {
    let furthestIndex = currentIndex + 1
    
    // Find the furthest visible point
    for (let i = currentIndex + 2; i < path.length; i++) {
      if (hasLineOfSightWorld(grid, path[currentIndex], path[i])) {
        furthestIndex = i
      } else {
        break
      }
    }
    
    optimized.push(path[furthestIndex])
    currentIndex = furthestIndex
  }
  
  return optimized
}

