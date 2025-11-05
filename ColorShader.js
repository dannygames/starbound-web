// ColorShader.js - Color replacement system for sprite recoloring

/**
 * Color palette definitions
 * Each palette maps magenta shades to new colors
 */
export const COLOR_PALETTES = {
  magenta: {
    name: 'Magenta',
    // Original colors (no replacement)
    colors: {}
  },
  red: {
    name: 'Red',
    colors: {
      0xff00ff: 0xf70f0f,
      0xde00de: 0xbf1717,
      0xbd00bd: 0xbf1717,
      0x9c009c: 0xa20f0f,
      0x7c007c: 0x820000,
      0x5b005b: 0x6b0000,
      0x3a003a: 0x550000,
      0x190019: 0x190019
    }
  },
  blue: {
    name: 'Blue',
    colors: {
      0xff00ff: 0x0f6fff,
      0xde00de: 0x1759bf,
      0xbd00bd: 0x1759bf,
      0x9c009c: 0x0f47a2,
      0x7c007c: 0x003582,
      0x5b005b: 0x00256b,
      0x3a003a: 0x001a55,
      0x190019: 0x190019
    }
  },
  green: {
    name: 'Green',
    colors: {
      0xff00ff: 0x0ff70f,
      0xde00de: 0x17bf17,
      0xbd00bd: 0x17bf17,
      0x9c009c: 0x0fa20f,
      0x7c007c: 0x008200,
      0x5b005b: 0x006b00,
      0x3a003a: 0x005500,
      0x190019: 0x190019
    }
  },
  yellow: {
    name: 'Yellow',
    colors: {
      0xff00ff: 0xffff0f,
      0xde00de: 0xdede17,
      0xbd00bd: 0xdede17,
      0x9c009c: 0xbcbc0f,
      0x7c007c: 0x9c9c00,
      0x5b005b: 0x7b7b00,
      0x3a003a: 0x5a5a00,
      0x190019: 0x190019
    }
  }
}

/**
 * Convert hex color to RGB object
 */
function hexToRgb(hex) {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff
  }
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r, g, b) {
  return (r << 16) | (g << 8) | b
}

/**
 * ColorShader class - Handles sprite recoloring with caching
 */
export class ColorShader {
  constructor() {
    // Cache for recolored sprites
    // Key format: "paletteKey_col_row"
    this.cache = new Map()
    
    // Offscreen canvas for processing
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })
  }

  /**
   * Get a recolored sprite from the sprite sheet
   * @param {Image} spriteSheet - Source sprite sheet
   * @param {number} sx - Source X position
   * @param {number} sy - Source Y position
   * @param {number} width - Sprite width
   * @param {number} height - Sprite height
   * @param {string} paletteKey - Color palette key
   * @returns {Canvas} Canvas with recolored sprite
   */
  getRecoloredSprite(spriteSheet, sx, sy, width, height, paletteKey = 'magenta') {
    const cacheKey = `${paletteKey}_${sx}_${sy}_${width}_${height}`
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    // Create new canvas for this sprite
    const spriteCanvas = document.createElement('canvas')
    spriteCanvas.width = width
    spriteCanvas.height = height
    const spriteCtx = spriteCanvas.getContext('2d', { willReadFrequently: true })

    // Draw original sprite
    spriteCtx.drawImage(spriteSheet, sx, sy, width, height, 0, 0, width, height)

    // Apply color replacement if palette exists
    const palette = COLOR_PALETTES[paletteKey]
    if (palette && Object.keys(palette.colors).length > 0) {
      this.applyColorReplacement(spriteCtx, width, height, palette.colors)
    }

    // Cache the result
    this.cache.set(cacheKey, spriteCanvas)
    
    return spriteCanvas
  }

  /**
   * Apply color replacement to image data
   * @param {CanvasRenderingContext2D} ctx - Context to modify
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {Object} colorMap - Color replacement map
   */
  applyColorReplacement(ctx, width, height, colorMap) {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    // Convert color map to RGB for faster lookup
    const rgbMap = new Map()
    for (const [fromHex, toHex] of Object.entries(colorMap)) {
      const from = hexToRgb(parseInt(fromHex))
      const to = hexToRgb(parseInt(toHex))
      // Create key from RGB values
      const key = `${from.r},${from.g},${from.b}`
      rgbMap.set(key, to)
    }

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]

      // Skip transparent pixels
      if (a === 0) continue

      // Check if this color should be replaced
      const key = `${r},${g},${b}`
      const replacement = rgbMap.get(key)

      if (replacement) {
        data[i] = replacement.r
        data[i + 1] = replacement.g
        data[i + 2] = replacement.b
        // Keep original alpha
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }

  /**
   * Clear the cache (useful when changing sprite sheets)
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  getCacheSize() {
    return this.cache.size
  }

  /**
   * Preload all sprites for a palette
   * @param {Image} spriteSheet - Source sprite sheet
   * @param {Object} config - Sprite configuration
   * @param {string} paletteKey - Color palette key
   */
  preloadPalette(spriteSheet, config, paletteKey) {
    const { SPRITE_WIDTH, SPRITE_HEIGHT, SPRITE_OFFSET_X, SPRITE_OFFSET_Y, 
            SPRITE_SPACING_X, SPRITE_SPACING_Y, SPRITE_SHEET } = config

    console.log(`Preloading palette: ${paletteKey}`)
    let count = 0

    // Preload all walk animations
    for (let dir = 0; dir < SPRITE_SHEET.walk.directions; dir++) {
      for (let frame = 0; frame < SPRITE_SHEET.walk.frames; frame++) {
        const col = SPRITE_SHEET.walk.startCol + dir
        const row = SPRITE_SHEET.walk.startRow + frame
        const sx = SPRITE_OFFSET_X + col * (SPRITE_WIDTH + SPRITE_SPACING_X)
        const sy = SPRITE_OFFSET_Y + row * (SPRITE_HEIGHT + SPRITE_SPACING_Y)
        this.getRecoloredSprite(spriteSheet, sx, sy, SPRITE_WIDTH, SPRITE_HEIGHT, paletteKey)
        count++
      }
    }

    // Preload all attack animations
    for (let dir = 0; dir < SPRITE_SHEET.attack.directions; dir++) {
      for (let frame = 0; frame < SPRITE_SHEET.attack.frames; frame++) {
        const col = SPRITE_SHEET.attack.startCol + dir
        const row = SPRITE_SHEET.attack.startRow + frame
        const sx = SPRITE_OFFSET_X + col * (SPRITE_WIDTH + SPRITE_SPACING_X)
        const sy = SPRITE_OFFSET_Y + row * (SPRITE_HEIGHT + SPRITE_SPACING_Y)
        this.getRecoloredSprite(spriteSheet, sx, sy, SPRITE_WIDTH, SPRITE_HEIGHT, paletteKey)
        count++
      }
    }

    // Preload all death animations
    for (let dir = 0; dir < SPRITE_SHEET.death.directions; dir++) {
      for (let frame = 0; frame < SPRITE_SHEET.death.frames; frame++) {
        const col = SPRITE_SHEET.death.startCol + dir
        const row = SPRITE_SHEET.death.startRow + frame
        const sx = SPRITE_OFFSET_X + col * (SPRITE_WIDTH + SPRITE_SPACING_X)
        const sy = SPRITE_OFFSET_Y + row * (SPRITE_HEIGHT + SPRITE_SPACING_Y)
        this.getRecoloredSprite(spriteSheet, sx, sy, SPRITE_WIDTH, SPRITE_HEIGHT, paletteKey)
        count++
      }
    }

    console.log(`Preloaded ${count} sprites for ${paletteKey} palette`)
  }
}

/**
 * Get random palette key
 */
export function getRandomPalette() {
  const keys = Object.keys(COLOR_PALETTES)
  return keys[Math.floor(Math.random() * keys.length)]
}

/**
 * Get all palette keys
 */
export function getAllPaletteKeys() {
  return Object.keys(COLOR_PALETTES)
}

