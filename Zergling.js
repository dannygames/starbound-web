// Zergling.js - Zergling unit implementation

import { Unit, UnitState } from './Unit.js'
import { COLOR_PALETTES } from './ColorShader.js'

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

/**
 * Zergling class - Represents a Zergling unit
 * Extends the base Unit class with Zergling-specific rendering and animation
 */
export class Zergling extends Unit {
  constructor(x, y, colorPalette = 'magenta', spriteSheet = null, colorShader = null) {
    // Call parent constructor with Zergling-specific config
    super(x, y, {
      speed: 2,
      width: SPRITE_WIDTH * UNIT_SCALE,
      height: SPRITE_HEIGHT * UNIT_SCALE,
      health: 100,
      maxHealth: 100,
      attackRange: 30,
      attackDamage: 10,
      attackCooldownMax: 1000,
      colorPalette: colorPalette,
      spriteSheet: spriteSheet,
      colorShader: colorShader,
      shadowScale: 0.8,
      selectionScale: 1.25,
      collisionRadius: (Math.max(SPRITE_WIDTH, SPRITE_HEIGHT) * UNIT_SCALE) / 4
    })

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
            this.recolorWalkLayers()
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
          this.recolorDeathLayers()
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
   * Recolor all walk animation layers using the color shader
   */
  recolorWalkLayers() {
    if (!this.colorShader || this.colorPalette === 'magenta') {
      return // No recoloring needed
    }

    const fileDirections = [0, 1, 2, 3, 5, 6, 7, 8]
    
    fileDirections.forEach(dir => {
      if (!this.walkLayers[dir]) return
      
      const recoloredLayers = []
      for (let i = 0; i < this.walkLayers[dir].length; i++) {
        const originalImg = this.walkLayers[dir][i]
        const recoloredCanvas = this.recolorImage(originalImg)
        recoloredLayers.push(recoloredCanvas)
      }
      this.walkLayers[dir] = recoloredLayers
    })
  }

  /**
   * Recolor all death animation layers using the color shader
   */
  recolorDeathLayers() {
    if (!this.colorShader || this.colorPalette === 'magenta') {
      return // No recoloring needed
    }

    const recoloredLayers = []
    for (let i = 0; i < this.deathLayers.length; i++) {
      const originalImg = this.deathLayers[i]
      const recoloredCanvas = this.recolorImage(originalImg)
      recoloredLayers.push(recoloredCanvas)
    }
    this.deathLayers = recoloredLayers
  }

  /**
   * Recolor a single image using the color shader
   * @param {Image} img - Source image
   * @returns {Canvas} Canvas with recolored image
   */
  recolorImage(img) {
    if (!img.complete) {
      return img // Return original if not loaded yet
    }

    // Create canvas to hold the recolored image
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    // Draw original image
    ctx.drawImage(img, 0, 0)

    // Apply color shader
    if (this.colorShader && this.colorPalette !== 'magenta') {
      const palette = COLOR_PALETTES[this.colorPalette]
      
      if (palette && palette.colors) {
        this.colorShader.applyColorReplacement(
          ctx, 
          canvas.width, 
          canvas.height, 
          palette.colors
        )
      }
    }

    return canvas
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
   * Handle unit death
   */
  die() {
    super.die()
    this.deathTimer = 0
    
    // Play death sound
    if (this.deathSound) {
      this.deathSound.currentTime = 0 // Reset to start in case it's already playing
      this.deathSound.play().catch(error => {
        console.log('Could not play death sound:', error)
      })
    }
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
      // Call parent draw if sprite sheet isn't loaded
      super.draw(ctx)
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
      // Check if layer is ready: Canvas elements don't have .complete, Images do
      const isReady = layer && (layer instanceof HTMLCanvasElement || layer.complete)
      if (isReady) {
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
      // Check if layer is ready: Canvas elements don't have .complete, Images do
      const isReady = layer && (layer instanceof HTMLCanvasElement || layer.complete)
      if (isReady) {
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
   * Change the unit's color palette
   */
  setColorPalette(paletteKey) {
    super.setColorPalette(paletteKey)
    
    // Recolor the layers if they're loaded
    if (this.walkLayersLoaded) {
      this.recolorWalkLayers()
    }
    if (this.deathLayersLoaded) {
      this.recolorDeathLayers()
    }
  }
}

