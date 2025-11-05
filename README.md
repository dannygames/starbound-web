# Starbound Web - Zergling Commander 🎮

A 2D real-time strategy game inspired by StarCraft, featuring animated Zerglings with full sprite animations!

## Features

- 🎯 **RTS-Style Controls**: Click to move, right-click to attack
- 🗺️ **Tile-Based Grid**: 50x50px tile system with visual grid overlay
- 🧭 **A* Pathfinding**: Intelligent unit movement with obstacle avoidance and diagonal movement
- 📍 **Path Smoothing**: Optimized paths that remove unnecessary waypoints
- 🎨 **Sprite Animations**: Walk, attack, and death animations from original StarCraft sprite sheets
- 🌈 **Color System**: Real-time sprite recoloring with shader-like pixel manipulation (Red, Blue, Green, Yellow, Magenta)
- 👾 **Multiple Units**: Spawn and control multiple Zerglings with different colors
- ⚔️ **Combat System**: Units can attack each other with health bars and damage
- 📦 **Unit Selection**: Drag to select multiple units or click individual units
- 🎮 **Smooth Gameplay**: Canvas-based rendering with 8-directional movement
- ⚡ **Performance**: Smart sprite caching for efficient recoloring

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

## Controls

- **Left Click (empty tile)**: Move selected units using A* pathfinding
- **Left Click (unit)**: Select/deselect unit
- **Right Click**: Attack target (select units first)
- **Drag Selection**: Click and drag to select multiple units
- **Shift + Click**: Add units to selection
- **Spacebar**: Spawn a new Zergling at random position
- **Hover**: See tile highlighting under cursor

## Project Structure

- `index.html` - Main HTML file with game UI
- `main.js` - Game loop, event handling, and rendering
- `Unit.js` - Unit class that manages Zergling state, behavior, and animations
- `Grid.js` - Tile-based grid system for spatial management
- `Pathfinding.js` - A* pathfinding algorithm with path smoothing
- `ColorShader.js` - Color replacement system with palette management and caching
- `style.css` - Styled UI with StarCraft-inspired theme
- `vite.config.js` - Vite configuration
- `public/images/` - Sprite sheets and assets

## Architecture

### Unit Class (`Unit.js`)

The `Unit` class is a comprehensive state manager for individual Zergling units:

**State Management:**
- Position and movement (x, y, target, speed, direction)
- Animation state (current frame, frame timer, sprite animations)
- Combat state (health, attack target, cooldowns, damage)
- Selection state (selected status, unique ID)

**Key Methods:**
- `update(deltaTime)` - Main update loop for AI, movement, and combat
- `move(deltaTime)` - Movement with path following
- `followPath()` - Navigate through waypoints
- `setPath(path)` - Set path for unit to follow
- `performAttack()` - Combat system with cooldowns
- `updateAnimation(deltaTime)` - Frame-based sprite animation
- `draw(ctx)` - Renders unit, health bar, and selection circle
- `takeDamage(amount)` - Damage handling and death
- `isAlive()` / `isDeathAnimationComplete()` - State queries

**Exported Constants:**
- `UnitState` - Enum for unit states (IDLE, WALKING, ATTACKING, DEAD)
- `SPRITE_SHEET` - Animation configuration for walk/attack/death
- `SPRITE_WIDTH`, `SPRITE_HEIGHT`, `SPRITE_OFFSET`, `SPRITE_SPACING` - Sprite sheet layout
- `UNIT_SCALE` - Visual constants

### ColorShader Class (`ColorShader.js`)

The `ColorShader` class provides real-time sprite recoloring using pixel-level color replacement:

**Color System:**
- Uses lookup tables to map magenta shades to new colors
- Supports multiple color palettes (Red, Blue, Green, Yellow, Magenta)
- Processes sprites on-demand with intelligent caching

**Key Features:**
- `getRecoloredSprite()` - Returns a recolored sprite canvas (cached)
- `applyColorReplacement()` - Pixel-level color mapping
- `preloadPalette()` - Preload all sprites for a color palette
- `clearCache()` - Clear sprite cache

**Color Palettes:**
```javascript
COLOR_PALETTES = {
  red: { /* magenta → red mapping */ },
  blue: { /* magenta → blue mapping */ },
  green: { /* magenta → green mapping */ },
  yellow: { /* magenta → yellow mapping */ },
  magenta: { /* original colors */ }
}
```

**How It Works:**
1. Extract sprite region from source sprite sheet
2. Read pixel data using Canvas 2D API
3. Replace magenta shades with target palette colors
4. Cache the recolored canvas for reuse
5. Draw cached canvas to game (no per-frame reprocessing)

### Grid Class (`Grid.js`)

The `Grid` class provides a tile-based spatial system:

**Features:**
- 50x50px tiles covering the game world
- Walkable/blocked tile system
- World ↔ Grid coordinate conversion
- Neighbor detection (4-directional and 8-directional)
- Visual grid rendering with tile highlighting

**Key Methods:**
- `worldToGrid(x, y)` - Convert pixel coordinates to tile coordinates
- `gridToWorld(x, y)` - Convert tile coordinates to pixel coordinates (center)
- `isWalkable(x, y)` - Check if a tile is traversable
- `getNeighbors(x, y, diagonal)` - Get adjacent walkable tiles
- `draw(ctx)` - Render grid visualization
- `highlightTile(ctx, x, y)` - Highlight specific tiles
- `drawPath(ctx, path)` - Visualize paths on the grid

### Pathfinding (`Pathfinding.js`)

Implements the A* pathfinding algorithm:

**A* Algorithm:**
- Finds optimal path between two points
- Uses heuristic (Euclidean distance) for efficiency
- Supports diagonal movement
- Handles obstacle avoidance
- Cost-based pathfinding (diagonal moves cost √2)

**Key Functions:**
- `findPath(grid, start, goal, diagonal)` - Find optimal path
- `smoothPath(grid, path)` - Remove unnecessary waypoints using line-of-sight
- `findNearestWalkable(grid, x, y)` - Find closest walkable tile

**How It Works:**
1. User clicks on a tile
2. System converts click position to grid coordinates
3. A* algorithm finds path from each selected unit to target
4. Path is smoothed to remove redundant waypoints
5. Path is converted to world coordinates
6. Units follow the path waypoint by waypoint
7. Visual path overlay shows the route (green line)

## Build for Production

```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

