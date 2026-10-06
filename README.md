# Frontline Strike

A small browser-based 3D FPS prototype inspired by fast arcade shooters, built with Three.js.

## Features
- First-person movement with WASD
- Mouse look and pointer lock
- Shooting with aim reticle
- Enemy waves and score system
- Health and survival loop
- Simple arena with cover objects

## Run locally
Because this is a static web app, you can run it in any simple local server.

### Option 1: Python
```bash
cd /path/to/3d-shooting-game
python3 -m http.server 8000
```
Then open: http://localhost:8000

### Option 2: VS Code Live Server or another static server
Open the folder in VS Code and serve it with a static HTML extension.

## Controls
- W/A/S/D: Move
- Mouse: Aim
- Left click: Shoot
- R: Restart after defeat

## Notes
This is a lightweight prototype, not a full AAA shooter. It is built as a playable foundation for future upgrades like:
- weapon switching
- recoil and muzzle flash
- better enemy AI
- sound effects
- larger maps
- save/load progression
- multiplayer or bots

