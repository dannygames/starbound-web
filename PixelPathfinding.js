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
 * Uses grid for obstacle checking with thorough sampling
 */
export function hasLineOfSightWorld(grid, fromWorld, toWorld) {
  const dx = toWorld.x - fromWorld.x
  const dy = toWorld.y - fromWorld.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  if (distance === 0) return true
  
  // Sample points along the line - use at least 4 samples per tile
  // This ensures we don't miss obstacles even at diagonal angles
  const samplesPerTile = 4
  const distanceInTiles = distance / grid.tileSize
  const samples = Math.ceil(distanceInTiles * samplesPerTile)
  
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
 * Uses line-of-sight checking with maximum segment length limit
 */
export function optimizePixelPath(grid, path, maxSegmentTiles = 8) {
  if (!path || path.length <= 2) return path
  
  const maxSegmentLength = maxSegmentTiles * grid.tileSize
  
  const optimized = [path[0]] // Always keep starting position
  let currentIndex = 0
  
  // Special handling for first waypoint: 
  // If unit is far from the center of its starting tile, ensure we don't skip
  // the waypoint that helps navigate to the path properly
  if (path.length > 2) {
    const startTile = grid.worldToGrid(path[0].x, path[0].y)
    const tileCenter = grid.gridToWorld(startTile.x, startTile.y)
    const distFromCenter = Math.sqrt(
      Math.pow(path[0].x - tileCenter.x, 2) + 
      Math.pow(path[0].y - tileCenter.y, 2)
    )
    
    // If unit is far from tile center (more than 30% of tile size)
    // keep the first intermediate waypoint to help navigate
    if (distFromCenter > grid.tileSize * 0.3) {
      // Check if the second waypoint would help navigate
      const dx1 = path[1].x - path[0].x
      const dy1 = path[1].y - path[0].y
      const dx2 = path[2].x - path[0].x
      const dy2 = path[2].y - path[0].y
      
      // Calculate angle difference
      const angle1 = Math.atan2(dy1, dx1)
      const angle2 = Math.atan2(dy2, dx2)
      let angleDiff = Math.abs(angle2 - angle1)
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff
      
      // If there's a significant direction change (more than 30 degrees)
      // keep the intermediate waypoint
      if (angleDiff > Math.PI / 6) {
        optimized.push(path[1])
        currentIndex = 1
      }
    }
  }
  
  // Continue optimizing from current position with length limit
  while (currentIndex < path.length - 1) {
    let furthestIndex = currentIndex + 1
    
    // Find the furthest visible point within max segment length
    for (let i = currentIndex + 2; i < path.length; i++) {
      const from = path[currentIndex]
      const to = path[i]
      
      // Calculate distance in pixels
      const dx = to.x - from.x
      const dy = to.y - from.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Check distance limit and line of sight
      if (distance <= maxSegmentLength && hasLineOfSightWorld(grid, from, to)) {
        furthestIndex = i
      } else if (distance > maxSegmentLength) {
        // Stop checking once we exceed max length
        break
      } else {
        // No line of sight, stop checking
        break
      }
    }
    
    optimized.push(path[furthestIndex])
    currentIndex = furthestIndex
  }
  
  return optimized
}

