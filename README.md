# 7v7 Soccer Simulator

A 3D soccer simulator built with Three.js and Cannon.js physics engine.

https://martinezworldwide.github.io/7v7Simulator


## Features

- Realistic 7v7 soccer simulation
- Physics-based ball and player movement
- Team formations and AI
- Goal detection and scoring
- Possession tracking
- Aim indicators for shooting and passing

## How the AI plays

### Realism overhaul
- **Human movement model** - players live in speed zones (walk ~1.7 m/s, jog ~3.4, run ~5.8, sprint only for decisive moments like chasing a loose ball or carrying it), with acceleration limits and speed-dependent turn rates, so runs curve instead of pivoting robotically. In simulated matches sprinting is ~3% of player time, like real football.
- **Team shape as a unit** - the whole block shifts side-to-side with the ball on a smoothed anchor, squeezes compact when defending, stretches wide in possession, tucks far-side players in, and splits defenders wide to build out of the back.
- **Support triangles** - the two nearest teammates offer the carrier ahead-side and behind-side angles instead of standing in formation spots.
- **Dribbling is the default** - carriers first carry the ball into space, veering away from the nearest opponent and off the touchline; passing and shooting are decisions made under pressure, at range, or when a lane opens. Passes are led into the receiver's run with human aim error that grows with distance and pressure, and clogged sides trigger switches of play to the far-side free man.
- **Defending with restraint** - the presser approaches goal-side on a curved run and jockeys at close range instead of diving in; teammates hold a compact shape and step into passing lanes to intercept.
- **Goalkeepers** - arc positioning that steps out as a sweeper when the ball is far away, short distribution to a free defender when available, long clearance only when needed.


The AI is built on real football principles:

- **Eight real tactical systems** per team (Balanced, Tiki-Taka, Counter Attack,
  Gegenpress, Low Block, Wing Play, Long Ball, Total Football), each tuning line
  height, compactness, pressing triggers, width, and pass risk
- **Role-based team shape** (GK + 2-3-1) that shifts with the ball, compresses
  when defending, and only sends designated players to chase loose balls
- **Offside awareness**: runs are timed to the second-last defender and passes
  are never played to an offside teammate
- **Space-based passing**: receivers are valued on forward progression, how much
  space they have, and whether an opponent can step into the passing lane
- **Stamina**: sprinting drains players and tired players lose top speed;
  jogging recovers them
- **Real set pieces**: throw-ins, corners, and goal kicks awarded on the last
  touch when the ball leaves the pitch, plus a goalkeeper who guards the line,
  rushes loose balls, and clears upfield
- **Tackles** require sustained close pressure, and an anti-stall rule clears
  the ball if a carrier holds it too long, so play never freezes

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Deployment

The project can be deployed to any static hosting service. Here are some options:

1. **GitHub Pages**:
   - Push your code to a GitHub repository
   - Enable GitHub Pages in repository settings
   - Set the source to the `dist` directory

2. **Netlify**:
   - Connect your GitHub repository to Netlify
   - Set build command to `npm run build`
   - Set publish directory to `dist`

3. **Vercel**:
   - Connect your GitHub repository to Vercel
   - It will automatically detect the Vite project and deploy it

## Controls

- The match is fully autonomous: both teams play on their own with role-based tactics
- Use the **Team 1 / Team 2 Tactics** panels to switch each team's style live
  (Balanced, Tiki-Taka, Counter, Gegenpress, Low Block, Wing Play, Long Ball, Total Football)
- The scoreboard (top centre) tracks the score and match clock, with **Pause** and **Restart match**
- The yellow ring marks the player in possession; the white arrow shows shot/pass aim

## Development

The project uses:
- Vite for building and development
- Three.js for 3D rendering
- Cannon.js for physics simulation
