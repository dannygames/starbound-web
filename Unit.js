// Unit.js - Manages individual Zergling unit state and behavior

export const SPRITE_WIDTH = 40 // Each sprite frame width
export const SPRITE_HEIGHT = 39 // Each sprite frame height
export const SPRITE_OFFSET_X = 2 // Sprite sheet left padding
export const SPRITE_OFFSET_Y = 2 // Sprite sheet top padding
export const SPRITE_SPACING_X = 3 // Horizontal spacing between sprites
export const SPRITE_SPACING_Y = 3 // Vertical spacing between sprites
export const UNIT_SCALE = 1 // Scale up the units

// Sprite sheet layout (based on the Zergling sprite sheet)
// Animations run DOWN columns (vertically), not across rows
export const SPRITE_SHEET = {
  walk: {
    startRow: 0,
    startCol: 0,
    frames: 8,
    directions: 9,
    fps: 12
  },
  attack: {
    startRow: 0,
    startCol: 9,
    frames: 8,
    directions: 9,
    fps: 10
  },
  death: {
    startRow: 9,
    startCol: 0,
    frames: 7,
    directions: 5,
    fps: 8
  }
}

// Unit states
export const UnitState = {
  IDLE: 'idle',
  WALKING: 'walking',
  ATTACKING: 'attacking',
  DEAD: 'dead'
}

/**
 * Unit class - Represents a single Zergling unit
 * Manages position, animation, health, and combat
 */
export class Unit {
  constructor(x, y, colorPalette = 'magenta', spriteSheet = null, colorShader = null) {
    // Position and movement
    this.x = x
    this.y = y
    this.targetX = x
    this.targetY = y
    this.speed = 2 // Increased from 2 to 4 for faster movement
    this.direction = 0 // 0-7 for 8 directions
    
    // Pathfinding
    this.path = [] // Array of waypoints to follow
    this.currentWaypointIndex = 0

    // Visual properties
    this.colorPalette = colorPalette // Color palette key (red, blue, green, etc.)
    this.width = SPRITE_WIDTH * UNIT_SCALE
    this.height = SPRITE_HEIGHT * UNIT_SCALE
    this.size = Math.max(this.width, this.height) // Use max for collision radius
    this.spriteSheet = spriteSheet
    this.colorShader = colorShader

    // Animation state
    this.state = UnitState.IDLE
    this.currentFrame = 0
    this.frameTimer = 0

    // Combat properties
    this.health = 100
    this.maxHealth = 100
    this.attackTarget = null
    this.attackRange = 30
    this.attackDamage = 10
    this.attackCooldown = 0
    this.attackCooldownMax = 1000 // 1 second

    // Selection state
    this.selected = false

    // Unique ID for tracking
    this.id = `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Main update loop - called every frame
   */
  update(deltaTime, grid = null) {
    if (this.state === UnitState.DEAD) return

    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime
    }

    // Handle combat behavior
    if (this.hasValidAttackTarget()) {
      this.updateCombatBehavior(deltaTime, grid)
    } else {
      this.attackTarget = null
      this.move(deltaTime, grid)
    }

    // Update animation
    this.updateAnimation(deltaTime)
  }

  /**
   * Check if the unit has a valid attack target
   */
  hasValidAttackTarget() {
    return this.attackTarget && this.attackTarget.state !== UnitState.DEAD
  }

  /**
   * Update combat behavior - move towards or attack target
   */
  updateCombatBehavior(deltaTime, grid = null) {
    const distance = this.distanceTo(this.attackTarget)

    if (distance > this.attackRange) {
      // Move towards target
      this.setTarget(this.attackTarget.x, this.attackTarget.y)
      this.move(deltaTime, grid)
    } else {
      // In range, perform attack
      this.performAttack(deltaTime)
    }
  }

  /**
   * Perform attack on current target
   */
  performAttack(deltaTime) {
    this.state = UnitState.ATTACKING

    // Update direction to face target
    const dx = this.attackTarget.x - this.x
    const dy = this.attackTarget.y - this.y
    this.direction = this.calculateDirection(dx, dy)

    // Deal damage if cooldown is ready
    if (this.attackCooldown <= 0) {
      this.attackTarget.takeDamage(this.attackDamage)
      this.attackCooldown = this.attackCooldownMax
    }
  }

  /**
   * Move towards target position (following path if available)
   */
  move(deltaTime, grid = null) {
    // If we have a path, follow it
    if (this.path.length > 0) {
      this.followPath()
    }

    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Tighter threshold for pixel-perfect positioning
    // Stop when within 1 pixel of target
    if (distance > 1) {
      // Calculate direction for sprite orientation
      this.direction = this.calculateDirection(dx, dy)

      // Move towards target
      const moveX = (dx / distance) * this.speed
      const moveY = (dy / distance) * this.speed
      
      // Calculate new position
      let newX = this.x
      let newY = this.y
      
      // If we're very close, move exactly to the target to avoid oscillation
      if (distance < this.speed) {
        newX = this.targetX
        newY = this.targetY
      } else {
        newX = this.x + moveX
        newY = this.y + moveY
      }
      
      // Check collision with grid if available
      if (grid && !this.canMoveTo(newX, newY, grid)) {
        // Try sliding along walls
        const slideResult = this.trySlideMovement(this.x, this.y, newX, newY, grid)
        if (slideResult.canMove) {
          this.x = slideResult.x
          this.y = slideResult.y
          this.state = UnitState.WALKING
        } else {
          // Can't move at all, stop
          this.state = UnitState.IDLE
          // Clear path if stuck
          if (this.path.length > 0) {
            this.path = []
            this.currentWaypointIndex = 0
          }
        }
      } else {
        // No collision, move normally
        this.x = newX
        this.y = newY
        this.state = distance < this.speed ? UnitState.IDLE : UnitState.WALKING
      }
    } else {
      // Snap to exact target position
      this.x = this.targetX
      this.y = this.targetY
      this.state = UnitState.IDLE
    }
  }
  
  /**
   * Check if unit can move to a position without colliding with obstacles
   */
  canMoveTo(x, y, grid) {
    // Check the unit's bounding circle against the grid
    const radius = this.size / 2
    const checkPoints = 8 // Check 8 points around the circle
    
    for (let i = 0; i < checkPoints; i++) {
      const angle = (i / checkPoints) * Math.PI * 2
      const checkX = x + Math.cos(angle) * radius
      const checkY = y + Math.sin(angle) * radius
      
      const tile = grid.worldToGrid(checkX, checkY)
      if (!grid.isWalkable(tile.x, tile.y)) {
        return false
      }
    }
    
    // Also check center
    const centerTile = grid.worldToGrid(x, y)
    if (!grid.isWalkable(centerTile.x, centerTile.y)) {
      return false
    }
    
    return true
  }
  
  /**
   * Try to slide along walls when blocked
   */
  trySlideMovement(oldX, oldY, newX, newY, grid) {
    // Try moving only horizontally
    if (this.canMoveTo(newX, oldY, grid)) {
      return { canMove: true, x: newX, y: oldY }
    }
    
    // Try moving only vertically
    if (this.canMoveTo(oldX, newY, grid)) {
      return { canMove: true, x: oldX, y: newY }
    }
    
    // Can't slide, stay in place
    return { canMove: false, x: oldX, y: oldY }
  }

  /**
   * Follow the current path
   */
  followPath() {
    if (this.currentWaypointIndex >= this.path.length) {
      // Reached end of path
      this.path = []
      this.currentWaypointIndex = 0
      return
    }

    const waypoint = this.path[this.currentWaypointIndex]
    const dx = waypoint.x - this.x
    const dy = waypoint.y - this.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Tighter threshold for pixel-perfect movement
    // Use 2 pixels for intermediate waypoints, 1 pixel for final destination
    const threshold = (this.currentWaypointIndex === this.path.length - 1) ? 1 : 2

    // If close enough to waypoint, move to next one
    if (distance < threshold) {
      this.currentWaypointIndex++
      if (this.currentWaypointIndex < this.path.length) {
        const nextWaypoint = this.path[this.currentWaypointIndex]
        this.targetX = nextWaypoint.x
        this.targetY = nextWaypoint.y
      }
    } else {
      // Move towards current waypoint
      this.targetX = waypoint.x
      this.targetY = waypoint.y
    }
  }

  /**
   * Calculate direction (0-7) from dx, dy
   */
  calculateDirection(dx, dy) {
    const angle = Math.atan2(dy, dx)
    let dir = Math.round(angle / (Math.PI / 4)) + 4
    if (dir < 0) dir += 8
    if (dir >= 8) dir -= 8
    return dir
  }

  /**
   * Calculate distance to another unit
   */
  distanceTo(otherUnit) {
    const dx = otherUnit.x - this.x
    const dy = otherUnit.y - this.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Update sprite animation
   */
  updateAnimation(deltaTime) {
    const animType = this.getAnimationType()
    const anim = SPRITE_SHEET[animType]
    
    // Don't animate if idle - keep first frame
    if (this.state === UnitState.IDLE) {
      this.currentFrame = 0
      this.frameTimer = 0
      return
    }
    
    this.frameTimer += deltaTime
    const frameDuration = 1000 / anim.fps

    if (this.frameTimer >= frameDuration) {
      this.frameTimer = 0
      this.currentFrame++
      
      if (this.currentFrame >= anim.frames) {
        if (this.state === UnitState.DEAD) {
          this.currentFrame = anim.frames - 1 // Stay on last frame
        } else {
          this.currentFrame = 0
        }
      }
    }
  }

  /**
   * Get the appropriate animation type based on state
   */
  getAnimationType() {
    switch (this.state) {
      case UnitState.ATTACKING:
        return 'attack'
      case UnitState.DEAD:
        return 'death'
      default:
        return 'walk'
    }
  }

  /**
   * Set movement target (direct movement without pathfinding)
   */
  setTarget(x, y) {
    this.targetX = x
    this.targetY = y
    this.attackTarget = null
    this.path = []
    this.currentWaypointIndex = 0
  }

  /**
   * Set path to follow
   * @param {Array} path - Array of {x, y} world coordinates
   */
  setPath(path) {
    if (!path || path.length === 0) {
      this.path = []
      this.currentWaypointIndex = 0
      return
    }

    this.path = path
    this.currentWaypointIndex = 0
    this.attackTarget = null

    // Set initial target to first waypoint
    if (path.length > 0) {
      this.targetX = path[0].x
      this.targetY = path[0].y
    }
  }

  /**
   * Set attack target
   */
  setAttackTarget(target) {
    if (target && target !== this) {
      this.attackTarget = target
    }
  }

  /**
   * Take damage from an attack
   */
  takeDamage(amount) {
    if (this.state === UnitState.DEAD) return

    this.health -= amount
    if (this.health <= 0) {
      this.die()
    }
  }

  /**
   * Handle unit death
   */
  die() {
    this.health = 0
    this.state = UnitState.DEAD
    this.currentFrame = 0
    this.selected = false
    this.attackTarget = null
  }

  /**
   * Heal the unit
   */
  heal(amount) {
    if (this.state === UnitState.DEAD) return

    this.health = Math.min(this.health + amount, this.maxHealth)
  }

  /**
   * Check if unit is alive
   */
  isAlive() {
    return this.state !== UnitState.DEAD
  }

  /**
   * Check if death animation is complete
   */
  isDeathAnimationComplete() {
    return this.state === UnitState.DEAD && 
           this.currentFrame >= SPRITE_SHEET.death.frames - 1
  }

  /**
   * Draw the unit on canvas
   */
  draw(ctx) {
    if (!this.spriteSheet) {
      // Draw a placeholder circle if sprite sheet isn't loaded
      ctx.save()
      ctx.translate(this.x, this.y)
      ctx.fillStyle = this.colorPalette === 'red' ? '#ff0000' : 
                       this.colorPalette === 'blue' ? '#0000ff' : 
                       this.colorPalette === 'green' ? '#00ff00' : '#ff00ff'
      ctx.beginPath()
      ctx.arc(0, 0, 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }

    const animType = this.getAnimationType()
    const anim = SPRITE_SHEET[animType]

    // Calculate sprite position on sheet
    // Animations run DOWN columns (vertically)
    // For directions 5-7 (upper right quadrant), we mirror from directions 3-1
    let spriteDir = this.direction
    let flipHorizontal = false
    
    if (this.direction >= 5) {
      // Mirror upper-right directions from upper-left
      // Direction 5 (down-right) mirrors from 3 (up-right) -> actually should mirror from direction 7
      // Direction 6 (down) uses direction 2 (up) 
      // Direction 7 (down-left) mirrors from 1 (up-left)
      spriteDir = 8 - this.direction
      flipHorizontal = true
    }
    
    const col = anim.startCol + spriteDir
    const row = anim.startRow + this.currentFrame
    const sx = SPRITE_OFFSET_X + col * (SPRITE_WIDTH + SPRITE_SPACING_X)
    const sy = SPRITE_OFFSET_Y + row * (SPRITE_HEIGHT + SPRITE_SPACING_Y)

    ctx.save()
    ctx.translate(this.x, this.y)
    
    // Apply horizontal flip if needed
    if (flipHorizontal) {
      ctx.scale(-1, 1)
    }
    
    try {
      // Draw sprite with color replacement
      if (this.colorShader && this.colorPalette !== 'magenta') {
        // Use color shader for recolored sprites
        const recoloredSprite = this.colorShader.getRecoloredSprite(
          this.spriteSheet,
          sx, sy,
          SPRITE_WIDTH, SPRITE_HEIGHT,
          this.colorPalette
        )
        ctx.drawImage(
          recoloredSprite,
          0, 0, SPRITE_WIDTH, SPRITE_HEIGHT,
          -this.width / 2, -this.height / 2, this.width, this.height
        )
      } else {
        // Draw original sprite
        ctx.drawImage(
          this.spriteSheet,
          sx, sy, SPRITE_WIDTH, SPRITE_HEIGHT,
          -this.width / 2, -this.height / 2, this.width, this.height
        )
      }
    } catch (error) {
      // Fallback to circle if there's an error
      ctx.fillStyle = '#ff0000'
      ctx.beginPath()
      ctx.arc(0, 0, 20, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw selection circle
    if (this.selected && this.isAlive()) {
      this.drawSelectionCircle(ctx)
    }

    // Draw health bar
    if (this.health < this.maxHealth && this.isAlive()) {
      this.drawHealthBar(ctx)
    }

    ctx.restore()
  }

  /**
   * Draw selection circle around unit
   */
  drawSelectionCircle(ctx) {
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, this.size / 2 + 5, 0, Math.PI * 2)
    ctx.stroke()
  }

  /**
   * Draw health bar above unit
   */
  drawHealthBar(ctx) {
    const barWidth = this.width
    const barHeight = 4
    const barY = -this.height / 2 - 10

    // Background (red)
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight)

    // Health (green)
    const healthWidth = (this.health / this.maxHealth) * barWidth
    ctx.fillStyle = '#00ff00'
    ctx.fillRect(-barWidth / 2, barY, healthWidth, barHeight)

    // Border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight)
  }

  /**
   * Check if a point is inside the unit's bounds
   */
  isPointInside(x, y) {
    const dx = x - this.x
    const dy = y - this.y
    return Math.sqrt(dx * dx + dy * dy) <= this.size / 2
  }

  /**
   * Check if unit intersects with a rectangle
   */
  intersectsRect(minX, minY, maxX, maxY) {
    return this.x >= minX && this.x <= maxX && 
           this.y >= minY && this.y <= maxY
  }

  /**
   * Set the sprite sheet reference
   */
  setSpriteSheet(spriteSheet) {
    this.spriteSheet = spriteSheet
  }

  /**
   * Set the color shader reference
   */
  setColorShader(colorShader) {
    this.colorShader = colorShader
  }

  /**
   * Change the unit's color palette
   */
  setColorPalette(paletteKey) {
    this.colorPalette = paletteKey
  }

  /**
   * Toggle selection state
   */
  toggleSelection() {
    if (this.isAlive()) {
      this.selected = !this.selected
    }
  }

  /**
   * Set selection state
   */
  setSelected(selected) {
    if (this.isAlive()) {
      this.selected = selected
    }
  }

  /**
   * Get unit info for debugging
   */
  getInfo() {
    return {
      id: this.id,
      position: { x: Math.round(this.x), y: Math.round(this.y) },
      state: this.state,
      health: this.health,
      selected: this.selected,
      direction: this.direction,
      frame: this.currentFrame
    }
  }
}

