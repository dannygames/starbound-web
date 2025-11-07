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
    this.speed = 2 // Movement speed in pixels per frame
    this.direction = 0 // 0-7 for 8 directions
    
    // Pathfinding
    this.path = [] // Array of waypoints to follow
    this.currentWaypointIndex = 0
    
    // Stuck detection
    this.stuckTimer = 0
    this.lastPosition = { x, y }
    this.stuckThreshold = 500 // 0.5 seconds without progress = stuck
    this.lastDistanceToWaypoint = Infinity
    this.progressTimer = 0
    
    // Standing still detection (for canceling moves near destination)
    this.standingStillTimer = 0
    this.standingStillThreshold = 1500 // 1.5 seconds standing still
    this.lastMovementCheck = { x, y }
    this.acceptableRange = 50 // Cancel if within 50 pixels of final destination

    // Visual properties
    this.colorPalette = colorPalette // Color palette key (red, blue, green, etc.)
    this.width = SPRITE_WIDTH * UNIT_SCALE
    this.height = SPRITE_HEIGHT * UNIT_SCALE
    this.size = Math.max(this.width, this.height) // Use max for collision radius
    this.collisionRadius = this.size / 4 // Radius for unit-to-unit collision
    this.spriteSheet = spriteSheet
    this.colorShader = colorShader
    this.shadowScale = .8 // Scale factor for shadow size
    this.selectionScale = 1.25 // Scale factor for selection circle size

    // Animation state
    this.state = UnitState.IDLE
    this.currentFrame = 0
    this.frameTimer = 0

    // Walk/Run animation layers
    this.walkLayers = {} // Organized by direction
    this.walkLayersLoaded = false
    this.walkFrameCount = 12 // 12 frames per direction
    this.loadWalkLayers()

    // Death animation layers
    this.deathLayers = []
    this.deathLayersLoaded = false
    this.loadDeathLayers()

    // Death timer (for removing corpses after delay)
    this.deathTimer = 0
    this.deathRemovalDelay = 5000 // 5 seconds

    // Death sound
    this.deathSound = new Audio('/sound/zzedth00.wav')
    this.deathSound.volume = 0.5 // Set volume to 50%

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
   * Load walk/run animation layer images
   * Directions 0-7 (0=Up, going clockwise)
   * Files: 0=UP, 1=UP-RIGHT, 2=RIGHT, 3=DOWN-RIGHT, 8=DOWN
   * Left side (5,6,7) will mirror from right side (3,2,1)
   */
  loadWalkLayers() {
    // Available file directions: 0 (UP), 1, 2, 3, 8 (DOWN), plus 5, 6, 7 which we won't use
    const fileDirections = [0, 1, 2, 3, 5, 6, 7, 8]
    let totalImages = fileDirections.length * this.walkFrameCount
    let loadedCount = 0
    
    fileDirections.forEach(dir => {
      this.walkLayers[dir] = []
      
      for (let frame = 1; frame <= this.walkFrameCount; frame++) {
        const img = new Image()
        img.onload = () => {
          loadedCount++
          if (loadedCount === totalImages) {
            this.walkLayersLoaded = true
            console.log('All walk animation layers loaded!')
          }
        }
        img.onerror = () => {
          console.error(`Failed to load walk layer: /images/maps/units/zergling/run/${dir}_Layer ${frame}.png`)
        }
        img.src = `/images/maps/units/zergling/run/${dir}_Layer ${frame}.png`
        this.walkLayers[dir].push(img)
      }
    })
  }

  /**
   * Load death animation layer images
   */
  loadDeathLayers() {
    const layerCount = 7
    let loadedCount = 0
    
    for (let i = 1; i <= layerCount; i++) {
      const img = new Image()
      img.onload = () => {
        loadedCount++
        if (loadedCount === layerCount) {
          this.deathLayersLoaded = true
        }
      }
      img.onerror = () => {
        console.error(`Failed to load death layer ${i}: /images/maps/units/zergling/death/Layer ${i}.png`)
      }
      img.src = `/images/maps/units/zergling/death/Layer ${i}.png`
      this.deathLayers.push(img)
    }
  }

  /**
   * Main update loop - called every frame
   */
  update(deltaTime, grid = null, units = []) {
    // Always update animation (including death animation)
    this.updateAnimation(deltaTime)
    
    // Skip game logic if dead (but still track death timer)
    if (this.state === UnitState.DEAD) {
      this.deathTimer += deltaTime
      return
    }

    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime
    }

    // Handle combat behavior
    if (this.hasValidAttackTarget()) {
      this.updateCombatBehavior(deltaTime, grid, units)
    } else {
      this.attackTarget = null
      this.move(deltaTime, grid, units)
    }
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
  updateCombatBehavior(deltaTime, grid = null, units = []) {
    const distance = this.distanceTo(this.attackTarget)

    if (distance > this.attackRange) {
      // Move towards target
      this.setTarget(this.attackTarget.x, this.attackTarget.y)
      this.move(deltaTime, grid, units)
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
  move(deltaTime, grid = null, units = []) {
    // Check if unit has been standing still for too long while trying to move
    if (this.path.length > 0) {
      this.checkStandingStill(deltaTime)
    }
    
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
      let moveX = (dx / distance) * this.speed
      let moveY = (dy / distance) * this.speed
      
      // Apply separation force to avoid stacking with other units
      const separation = this.applySeparation(units)
      moveX += separation.x
      moveY += separation.y
      
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
      
      // Check collision with grid and other units if available
      if (grid && !this.canMoveTo(newX, newY, grid, units)) {
        // Try advanced sliding along walls and around units
        const slideResult = this.tryAdvancedSliding(this.x, this.y, newX, newY, moveX, moveY, grid, units)
        if (slideResult.canMove) {
          this.x = slideResult.x
          this.y = slideResult.y
          this.state = UnitState.WALKING
          
          // Check if we're making progress toward waypoint
          this.checkStuckProgress(distance, deltaTime)
        } else {
          // Can't move at all
          this.state = UnitState.IDLE
          
          // Check if we're stuck and need to skip waypoint
          if (this.path.length > 0) {
            this.stuckTimer += deltaTime
            if (this.stuckTimer > this.stuckThreshold) {
              this.skipToNextWaypoint()
            }
          }
        }
      } else {
        // No collision, move normally
        this.x = newX
        this.y = newY
        this.state = distance < this.speed ? UnitState.IDLE : UnitState.WALKING
        
        // Reset stuck detection when moving freely
        this.stuckTimer = 0
        this.progressTimer = 0
        this.lastDistanceToWaypoint = Infinity
      }
    } else {
      // Snap to exact target position
      this.x = this.targetX
      this.y = this.targetY
      this.state = UnitState.IDLE
      
      // Reset stuck detection
      this.stuckTimer = 0
      this.progressTimer = 0
      this.lastDistanceToWaypoint = Infinity
    }
  }
  
  /**
   * Check if unit is stuck (moving but not making progress)
   */
  checkStuckProgress(currentDistance, deltaTime) {
    if (this.path.length === 0) {
      return
    }
    
    // Initialize distance tracking
    if (this.lastDistanceToWaypoint === Infinity) {
      this.lastDistanceToWaypoint = currentDistance
      this.progressTimer = 0
      return
    }
    
    // Check if we're getting closer
    const progressMade = this.lastDistanceToWaypoint - currentDistance
    
    // If we're making meaningful progress (more than 0.5 pixels), reset timer
    if (progressMade > 0.5) {
      this.progressTimer = 0
      this.lastDistanceToWaypoint = currentDistance
      this.stuckTimer = 0
    } else {
      // Not making progress, increment timer
      this.progressTimer += deltaTime
      
      // If stuck for too long, skip waypoint
      if (this.progressTimer > this.stuckThreshold) {
        console.log(`Unit stuck - moving but not progressing (distance: ${currentDistance.toFixed(1)})`)
        this.skipToNextWaypoint()
        this.progressTimer = 0
        this.lastDistanceToWaypoint = Infinity
      }
    }
  }
  
  /**
   * Skip to next waypoint when stuck
   */
  skipToNextWaypoint() {
    console.log('Skipping waypoint')
    this.currentWaypointIndex++
    this.stuckTimer = 0
    this.progressTimer = 0
    this.lastDistanceToWaypoint = Infinity
    
    // If no more waypoints, clear path
    if (this.currentWaypointIndex >= this.path.length) {
      console.log('No more waypoints, clearing path')
      this.path = []
      this.currentWaypointIndex = 0
    }
  }
  
  /**
   * Check if unit has been standing still for too long
   * Only cancels move if unit is within acceptable range of final destination
   */
  checkStandingStill(deltaTime) {
    // Check if unit has moved since last check
    const dx = this.x - this.lastMovementCheck.x
    const dy = this.y - this.lastMovementCheck.y
    const distanceMoved = Math.sqrt(dx * dx + dy * dy)
    
    // If unit moved more than 0.5 pixels, reset standing still timer
    if (distanceMoved > 0.5) {
      this.standingStillTimer = 0
      this.lastMovementCheck.x = this.x
      this.lastMovementCheck.y = this.y
    } else {
      // Unit hasn't moved, increment timer
      this.standingStillTimer += deltaTime
      
      // Only cancel if standing still for too long AND within acceptable range
      if (this.standingStillTimer > this.standingStillThreshold) {
        // Check distance to final destination
        const finalDestination = this.path[this.path.length - 1]
        if (finalDestination) {
          const finalDx = finalDestination.x - this.x
          const finalDy = finalDestination.y - this.y
          const distanceToFinal = Math.sqrt(finalDx * finalDx + finalDy * finalDy)
          
          // Only cancel if within acceptable range
          if (distanceToFinal <= this.acceptableRange) {
            console.log(`Unit close enough to destination (${distanceToFinal.toFixed(1)}px), canceling move`)
            this.cancelMove()
          } else {
            // Too far, just reset timer and keep trying
            console.log(`Unit stuck but too far from destination (${distanceToFinal.toFixed(1)}px), skipping waypoint`)
            this.skipToNextWaypoint()
            this.standingStillTimer = 0
          }
        }
      }
    }
  }
  
  /**
   * Cancel current move and clear path
   */
  cancelMove() {
    this.path = []
    this.currentWaypointIndex = 0
    this.targetX = this.x
    this.targetY = this.y
    this.stuckTimer = 0
    this.progressTimer = 0
    this.lastDistanceToWaypoint = Infinity
    this.standingStillTimer = 0
    this.state = UnitState.IDLE
  }
  
  /**
   * Check if unit can move to a position without colliding with obstacles or other units
   */
  canMoveTo(x, y, grid, units = []) {
    // Check the unit's bounding circle against the grid
    // Use a slightly smaller radius to be less strict (85% of actual size)
    const radius = (this.size / 2) * 0.85
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
    
    // Check collision with other units
    if (this.wouldCollideWithUnits(x, y, units)) {
      return false
    }
    
    return true
  }
  
  /**
   * Check if moving to a position would collide with other units
   */
  wouldCollideWithUnits(x, y, units) {
    for (const other of units) {
      // Skip self and dead units
      if (other === this || !other.isAlive()) continue
      
      // Calculate distance between positions
      const dx = x - other.x
      const dy = y - other.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Check if units would overlap (sum of their collision radii)
      const minDistance = this.collisionRadius + other.collisionRadius
      if (distance < minDistance) {
        return true
      }
    }
    return false
  }
  
  /**
   * Get nearby units within a certain radius
   */
  getNearbyUnits(units, radius) {
    const nearby = []
    for (const other of units) {
      if (other === this || !other.isAlive()) continue
      
      const dx = this.x - other.x
      const dy = this.y - other.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < radius) {
        nearby.push({ unit: other, distance, dx, dy })
      }
    }
    return nearby
  }
  
  /**
   * Apply separation force to avoid stacking with other units
   */
  applySeparation(units) {
    const separationRadius = this.collisionRadius * 3
    const nearby = this.getNearbyUnits(units, separationRadius)
    
    if (nearby.length === 0) return { x: 0, y: 0 }
    
    let separationX = 0
    let separationY = 0
    
    for (const { unit, distance, dx, dy } of nearby) {
      // Units closer to each other have stronger push
      const strength = 1 - (distance / separationRadius)
      separationX += (dx / distance) * strength
      separationY += (dy / distance) * strength
    }
    
    // Normalize and scale
    const magnitude = Math.sqrt(separationX * separationX + separationY * separationY)
    if (magnitude > 0) {
      separationX = (separationX / magnitude) * this.speed * 0.3
      separationY = (separationY / magnitude) * this.speed * 0.3
    }
    
    return { x: separationX, y: separationY }
  }
  
  /**
   * Advanced sliding that tries multiple directions
   */
  tryAdvancedSliding(oldX, oldY, newX, newY, moveX, moveY, grid, units = []) {
    // Try full horizontal slide
    if (this.canMoveTo(newX, oldY, grid, units)) {
      return { canMove: true, x: newX, y: oldY }
    }
    
    // Try full vertical slide
    if (this.canMoveTo(oldX, newY, grid, units)) {
      return { canMove: true, x: oldX, y: newY }
    }
    
    // Try partial movements (50% in each direction)
    const halfX = oldX + moveX * 0.5
    const halfY = oldY + moveY * 0.5
    
    if (this.canMoveTo(halfX, halfY, grid, units)) {
      return { canMove: true, x: halfX, y: halfY }
    }
    
    // Try diagonal alternatives
    const altAngles = [-0.3, 0.3, -0.6, 0.6] // Try angles 17°, 34° off
    for (const angleOffset of altAngles) {
      const angle = Math.atan2(moveY, moveX) + angleOffset
      const altX = oldX + Math.cos(angle) * this.speed
      const altY = oldY + Math.sin(angle) * this.speed
      
      if (this.canMoveTo(altX, altY, grid, units)) {
        return { canMove: true, x: altX, y: altY }
      }
    }
    
    // Can't move at all
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
   * 0=Up, 1=Up-Right, 2=Right, 3=Down-Right, 4=Down, 5=Down-Left, 6=Left, 7=Up-Left
   */
  calculateDirection(dx, dy) {
    // Calculate angle (0 = right, going clockwise due to canvas Y-down coordinate system)
    let angle = Math.atan2(dy, dx)
    // Rotate by +90 degrees to make 0 = up (since canvas Y goes down, dy < 0 is up)
    angle += Math.PI / 2
    // Convert to direction (0-7)
    let dir = Math.round(angle / (Math.PI / 4))
    // Normalize to 0-7 range
    while (dir < 0) dir += 8
    while (dir >= 8) dir -= 8
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
    // Don't animate if idle - keep first frame
    if (this.state === UnitState.IDLE) {
      this.currentFrame = 0
      this.frameTimer = 0
      return
    }
    
    // For death animation with layers
    if (this.state === UnitState.DEAD && this.deathLayersLoaded) {
      this.frameTimer += deltaTime
      const frameDuration = 1000 / 10 // 10 fps for death animation

      if (this.frameTimer >= frameDuration) {
        this.frameTimer = 0
        this.currentFrame++
        
        // Stay on last frame when death animation completes
        if (this.currentFrame >= this.deathLayers.length) {
          this.currentFrame = this.deathLayers.length - 1
        }
      }
      return
    }
    
    // For walk animation with layers
    if (this.state === UnitState.WALKING && this.walkLayersLoaded) {
      this.frameTimer += deltaTime
      const frameDuration = 1000 / 12 // 12 fps for walk animation

      if (this.frameTimer >= frameDuration) {
        this.frameTimer = 0
        this.currentFrame++
        
        // Loop animation
        if (this.currentFrame >= this.walkFrameCount) {
          this.currentFrame = 0
        }
      }
      return
    }
    
    // For normal sprite sheet animations (fallback)
    const animType = this.getAnimationType()
    const anim = SPRITE_SHEET[animType]
    
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

    // Reset stuck detection for new path
    this.stuckTimer = 0
    this.progressTimer = 0
    this.lastDistanceToWaypoint = Infinity
    
    // Reset standing still detection for new path
    this.standingStillTimer = 0
    this.lastMovementCheck.x = this.x
    this.lastMovementCheck.y = this.y

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
    this.frameTimer = 0
    this.deathTimer = 0
    this.selected = false
    this.attackTarget = null
    
    // Play death sound
    if (this.deathSound) {
      this.deathSound.currentTime = 0 // Reset to start in case it's already playing
      this.deathSound.play().catch(error => {
        console.log('Could not play death sound:', error)
      })
    }
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
   * Check if death animation is complete and enough time has passed to remove unit
   */
  isDeathAnimationComplete() {
    if (this.state !== UnitState.DEAD) {
      return false
    }
    
    // Check if death timer has reached the removal delay
    if (this.deathTimer < this.deathRemovalDelay) {
      return false
    }
    
    // Also check if animation frames are complete
    if (this.deathLayersLoaded) {
      return this.currentFrame >= this.deathLayers.length - 1
    }
    return this.currentFrame >= SPRITE_SHEET.death.frames - 1
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

    ctx.save()
    ctx.translate(this.x, this.y)
    
    // Draw shadow (before sprite so it appears underneath)
    this.drawShadow(ctx)
    
    // Draw selection indicator (if selected)
    if (this.selected && this.isAlive()) {
      this.drawSelectionCircle(ctx)
    }

    // If dead and death layers are loaded, use layer-based animation
    if (this.state === UnitState.DEAD && this.deathLayersLoaded && this.deathLayers.length > 0) {
      this.drawDeathAnimation(ctx)
    } else if ((this.state === UnitState.WALKING || this.state === UnitState.IDLE) && this.walkLayersLoaded) {
      // Use walk layer images
      this.drawWalkAnimation(ctx)
    } else {
      // Use sprite sheet for normal animations (fallback)
      this.drawSpriteSheetAnimation(ctx)
    }

    // Draw health bar
    if (this.health < this.maxHealth && this.isAlive()) {
      this.drawHealthBar(ctx)
    }

    ctx.restore()
  }

  /**
   * Draw walk animation using layer images
   * Direction mapping: 0=Up, 1=Up-Right, 2=Right, 3=Down-Right, 4=Down, 5=Down-Left, 6=Left, 7=Up-Left
   * Files available: 0 (UP), 1, 2, 3, 8 (DOWN) - left side mirrors right side
   */
  drawWalkAnimation(ctx) {
    // Map internal direction (0-7) to file direction
    // Right half of circle uses real files, left half mirrors them
    let fileDir = this.direction
    let shouldMirrorHorizontal = false
    
    // Direction mapping:
    // 0 = UP → file 0
    // 1 = UP-RIGHT → file 1
    // 2 = RIGHT → file 2
    // 3 = DOWN-RIGHT → file 3
    // 4 = DOWN → file 8
    // 5 = DOWN-LEFT → mirror file 3
    // 6 = LEFT → mirror file 2
    // 7 = UP-LEFT → mirror file 1
    
    if (this.direction === 4) {
      fileDir = 8 // DOWN uses file 8
    } else if (this.direction === 5) {
      fileDir = 3 // DOWN-LEFT mirrors DOWN-RIGHT
      shouldMirrorHorizontal = true
    } else if (this.direction === 6) {
      fileDir = 2 // LEFT mirrors RIGHT
      shouldMirrorHorizontal = true
    } else if (this.direction === 7) {
      fileDir = 1 // UP-LEFT mirrors UP-RIGHT
      shouldMirrorHorizontal = true
    }
    
    // Get the walk layers for this direction
    const directionLayers = this.walkLayers[fileDir]
    if (!directionLayers) {
      return // No layers for this direction
    }
    
    const frameIndex = Math.floor(this.currentFrame)
    if (frameIndex >= 0 && frameIndex < directionLayers.length) {
      const layer = directionLayers[frameIndex]
      if (layer && layer.complete) {
        // Apply horizontal mirroring if needed (for left side directions)
        if (shouldMirrorHorizontal) {
          ctx.scale(-1, 1)
        }
        
        // Draw the walk layer centered on the unit
        ctx.drawImage(
          layer,
          -layer.width / 2,
          -layer.height / 2
        )
      }
    }
  }

  /**
   * Draw death animation using layer images
   */
  drawDeathAnimation(ctx) {
    const layerIndex = Math.floor(this.currentFrame)
    if (layerIndex >= 0 && layerIndex < this.deathLayers.length) {
      const layer = this.deathLayers[layerIndex]
      if (layer && layer.complete) {
        // Draw the death layer centered on the unit
        ctx.drawImage(
          layer,
          -layer.width / 2,
          -layer.height / 2
        )
      }
    }
  }

  /**
   * Draw animation from sprite sheet
   */
  drawSpriteSheetAnimation(ctx) {
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
  }

  /**
   * Draw shadow under unit
   */
  drawShadow(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)' // Semi-transparent black
    ctx.beginPath()
    // Shadow is an ellipse at the base of the unit
    ctx.ellipse(
      0, // x - centered
      this.height / 6, // y - near bottom of unit
      (this.width / 4) * this.shadowScale, // horizontal radius
      (this.height / 6) * this.shadowScale, // vertical radius (flatter)
      0, // rotation
      0, // start angle
      Math.PI * 2 // end angle
    )
    ctx.fill()
  }

  /**
   * Draw selection circle underneath unit
   */
  drawSelectionCircle(ctx) {
    // Draw outline using same shape as shadow
    ctx.strokeStyle = '#249824'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(
      0, // x - centered
      this.height / 6, // y - near bottom of unit (same as shadow)
      (this.width / 4) * this.shadowScale * this.selectionScale, // horizontal radius
      (this.height / 6) * this.shadowScale * this.selectionScale, // vertical radius
      0, // rotation
      0, // start angle
      Math.PI * 2 // end angle
    )
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

