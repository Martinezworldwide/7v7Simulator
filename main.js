import { Game } from './Game.js';
import { TacticsUI } from './TacticsUI.js';
import './ChatManager.js';
import './ImageGenerator.js';

// Get the render target
const renderDiv = document.getElementById('renderDiv');

// Initialize the game with the render target
const game = new Game(renderDiv);

// Tactical style buttons for each team
const tacticsUI = new TacticsUI(game);

// Start the game
game.start();
