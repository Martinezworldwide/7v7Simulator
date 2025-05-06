# 7v7 Soccer Simulator

A 3D soccer simulator built with Three.js and Cannon.js physics engine.

## Features

- Realistic 7v7 soccer simulation
- Physics-based ball and player movement
- Team formations and AI
- Goal detection and scoring
- Possession tracking
- Aim indicators for shooting and passing

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

- Click and drag to move players
- Click to shoot/pass when in possession
- The aim indicator shows the direction and power of shots/passes

## Development

The project uses:
- Vite for building and development
- Three.js for 3D rendering
- Cannon.js for physics simulation 