// Pathfinding.js - A* pathfinding algorithm

/**
 * Node class for A* algorithm
 */
class PathNode {
  constructor(x, y, g = 0, h = 0, parent = null) {
    this.x = x
    this.y = y
    this.g = g // Cost from start to this node
    this.h = h // Heuristic cost from this node to goal
    this.f = g + h // Total cost
    this.parent = parent
  }

  equals(other) {
    return this.x === other.x && this.y === other.y
  }
}

/**
 * Calculate heuristic distance (Manhattan distance)
 */
function heuristic(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2)
}

/**
 * Calculate heuristic distance (Euclidean distance) for diagonal movement
 */
function heuristicDiagonal(x1, y1, x2, y2) {
  const dx = Math.abs(x1 - x2)
  const dy = Math.abs(y1 - y2)
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * A* pathfinding algorithm
 * @param {Grid} grid - The grid to search
 * @param {Object} start - Start position {x, y} in grid coordinates
 * @param {Object} goal - Goal position {x, y} in grid coordinates
 * @param {boolean} diagonal - Allow diagonal movement
 * @returns {Array} Path as array of {x, y} grid coordinates, or null if no path found
 */
export function findPath(grid, start, goal, diagonal = true) {
  // Validate start and goal
  if (!grid.isWalkable(start.x, start.y) || !grid.isWalkable(goal.x, goal.y)) {
    return null
  }

  // If start equals goal, return empty path
  if (start.x === goal.x && start.y === goal.y) {
    return [{ x: start.x, y: start.y }]
  }

  const openList = []
  const closedSet = new Set()
  
  // Create start node
  const startNode = new PathNode(
    start.x, 
    start.y, 
    0, 
    diagonal ? heuristicDiagonal(start.x, start.y, goal.x, goal.y) : heuristic(start.x, start.y, goal.x, goal.y)
  )
  
  openList.push(startNode)

  // Maximum iterations to prevent infinite loops
  const maxIterations = grid.cols * grid.rows * 2
  let iterations = 0

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++

    // Find node with lowest f cost
    let currentIndex = 0
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[currentIndex].f) {
        currentIndex = i
      }
    }

    const current = openList[currentIndex]

    // Check if we reached the goal
    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(current)
    }

    // Move current from open to closed
    openList.splice(currentIndex, 1)
    closedSet.add(`${current.x},${current.y}`)

    // Check all neighbors
    const neighbors = grid.getNeighbors(current.x, current.y, diagonal)
    
    for (const neighborPos of neighbors) {
      const key = `${neighborPos.x},${neighborPos.y}`
      
      // Skip if already evaluated
      if (closedSet.has(key)) continue

      // Calculate cost to neighbor
      const isDiagonal = Math.abs(neighborPos.x - current.x) === 1 && 
                        Math.abs(neighborPos.y - current.y) === 1
      const moveCost = isDiagonal ? 1.414 : 1 // sqrt(2) for diagonal
      const g = current.g + moveCost
      const h = diagonal ? 
        heuristicDiagonal(neighborPos.x, neighborPos.y, goal.x, goal.y) :
        heuristic(neighborPos.x, neighborPos.y, goal.x, goal.y)

      // Check if neighbor is already in open list
      let neighborNode = openList.find(n => n.x === neighborPos.x && n.y === neighborPos.y)

      if (!neighborNode) {
        // Add new node to open list
        neighborNode = new PathNode(neighborPos.x, neighborPos.y, g, h, current)
        openList.push(neighborNode)
      } else if (g < neighborNode.g) {
        // Update existing node if we found a better path
        neighborNode.g = g
        neighborNode.f = g + neighborNode.h
        neighborNode.parent = current
      }
    }
  }

  // No path found
  return null
}

/**
 * Reconstruct path from goal node to start
 */
function reconstructPath(goalNode) {
  const path = []
  let current = goalNode

  while (current) {
    path.unshift({ x: current.x, y: current.y })
    current = current.parent
  }

  return path
}

/**
 * Smooth a path by removing unnecessary waypoints
 * Uses line-of-sight check to skip intermediate nodes
 */
export function smoothPath(grid, path) {
  if (!path || path.length <= 2) return path

  const smoothed = [path[0]]
  let currentIndex = 0

  while (currentIndex < path.length - 1) {
    let furthestIndex = currentIndex + 1

    // Find the furthest visible point
    for (let i = currentIndex + 2; i < path.length; i++) {
      if (hasLineOfSight(grid, path[currentIndex], path[i])) {
        furthestIndex = i
      } else {
        break
      }
    }

    smoothed.push(path[furthestIndex])
    currentIndex = furthestIndex
  }

  return smoothed
}

/**
 * Check if there's a clear line of sight between two points
 */
function hasLineOfSight(grid, from, to) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const steps = Math.max(Math.abs(dx), Math.abs(dy))

  if (steps === 0) return true

  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const x = Math.round(from.x + dx * t)
    const y = Math.round(from.y + dy * t)

    if (!grid.isWalkable(x, y)) {
      return false
    }
  }

  return true
}

/**
 * Find nearest walkable tile to a target position
 */
export function findNearestWalkable(grid, targetX, targetY) {
  if (grid.isWalkable(targetX, targetY)) {
    return { x: targetX, y: targetY }
  }

  // Search in expanding radius
  for (let radius = 1; radius < Math.max(grid.cols, grid.rows); radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        // Only check the perimeter of the current radius
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue

        const x = targetX + dx
        const y = targetY + dy

        if (grid.isWalkable(x, y)) {
          return { x, y }
        }
      }
    }
  }

  // No walkable tile found (shouldn't happen in normal cases)
  return null
}

