/**
 * Animated cursor class
 * Handles loading and animating cursor images with support for multiple cursor states
 */
export class Cursor {
  constructor(cursorStates, animationSpeed = 100) {
    this.states = {} // Object to store different cursor states
    this.currentState = 'default'
    this.currentFrame = 0
    this.animationTimer = 0
    this.animationSpeed = animationSpeed // milliseconds per frame
    this.position = { x: 0, y: 0 }
    this.allLoaded = false
    
    if (cursorStates) {
      this.loadCursorStates(cursorStates)
    }
  }
  
  /**
   * Load cursor states with their respective images
   * @param {Object} cursorStates - Object with state names as keys and image paths (array or string) as values
   */
  loadCursorStates(cursorStates) {
    const stateNames = Object.keys(cursorStates)
    let loadedStates = 0
    
    stateNames.forEach(stateName => {
      const paths = Array.isArray(cursorStates[stateName]) 
        ? cursorStates[stateName] 
        : [cursorStates[stateName]]
      
      this.states[stateName] = {
        images: [],
        loaded: false,
        animated: paths.length > 1
      }
      
      this.loadStateImages(stateName, paths, () => {
        loadedStates++
        if (loadedStates === stateNames.length) {
          this.allLoaded = true
          console.log('All cursor states loaded!')
        }
      })
    })
  }
  
  /**
   * Load images for a specific cursor state
   */
  loadStateImages(stateName, imagePaths, onComplete) {
    let loadedCount = 0
    
    imagePaths.forEach((path, index) => {
      const img = new Image()
      img.onload = () => {
        loadedCount++
        if (loadedCount === imagePaths.length) {
          this.states[stateName].loaded = true
          console.log(`Cursor state '${stateName}' loaded!`)
          if (onComplete) onComplete()
        }
      }
      img.onerror = () => {
        console.error(`Failed to load cursor image for state '${stateName}':`, path)
      }
      img.src = path
      this.states[stateName].images[index] = img
    })
  }
  
  /**
   * Update cursor animation (only for animated states)
   */
  update(deltaTime) {
    const state = this.states[this.currentState]
    if (state && state.loaded && state.animated) {
      this.animationTimer += deltaTime
      if (this.animationTimer >= this.animationSpeed) {
        this.animationTimer = 0
        this.currentFrame = (this.currentFrame + 1) % state.images.length
      }
    }
  }
  
  /**
   * Update cursor position
   */
  setPosition(x, y) {
    this.position.x = x
    this.position.y = y
  }
  
  /**
   * Set the current cursor state
   */
  setState(stateName) {
    if (this.states[stateName]) {
      this.currentState = stateName
      this.currentFrame = 0 // Reset animation frame when changing state
      this.animationTimer = 0
    } else {
      console.warn(`Cursor state '${stateName}' not found`)
    }
  }
  
  /**
   * Get current state name
   */
  getState() {
    return this.currentState
  }
  
  /**
   * Draw the cursor
   */
  draw(ctx) {
    const state = this.states[this.currentState]
    if (state && state.loaded && state.images.length > 0) {
      const cursorImg = state.images[this.currentFrame]
      if (cursorImg && cursorImg.complete) {
        ctx.drawImage(cursorImg, this.position.x, this.position.y)
      }
    }
  }
  
  /**
   * Set animation speed
   */
  setAnimationSpeed(speed) {
    this.animationSpeed = speed
  }
  
  /**
   * Get current frame index
   */
  getCurrentFrame() {
    return this.currentFrame
  }
  
  /**
   * Check if all cursor states are loaded
   */
  isLoaded() {
    return this.allLoaded
  }
}

