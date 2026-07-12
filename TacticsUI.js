import { TACTICAL_STYLE_ORDER, getTacticalStyle } from './TacticalStyles.js';
import * as CONSTANTS from './constants.js';

// Build per-team tactical control panels with real football style presets
export class TacticsUI {
    constructor(game) {
        this.game = game;
        this.root = null;
        this.teamPanels = {};
        this.injectStyles();
        this.build();
    }

    injectStyles() {
        if (document.getElementById('tactics-ui-styles')) return;

        const style = document.createElement('style');
        style.id = 'tactics-ui-styles';
        style.textContent = `
            #tactics-ui {
                position: fixed;
                inset: 0;
                pointer-events: none;
                z-index: 20;
                font-family: Arial, Helvetica, sans-serif;
            }
            .tactics-panel {
                position: absolute;
                top: 16px;
                width: 220px;
                pointer-events: auto;
                background: rgba(8, 12, 18, 0.82);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 12px;
                padding: 12px;
                color: #f4f7fb;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
                backdrop-filter: blur(8px);
            }
            .tactics-panel.team1 { left: 16px; border-top: 3px solid #e53935; }
            .tactics-panel.team2 { right: 16px; border-top: 3px solid #1e88e5; }
            .tactics-title {
                font-size: 14px;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                margin-bottom: 4px;
            }
            .tactics-active {
                font-size: 12px;
                color: #c7d2e0;
                margin-bottom: 10px;
                min-height: 32px;
            }
            .tactics-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
            }
            .tactics-btn {
                border: 1px solid rgba(255, 255, 255, 0.14);
                background: rgba(255, 255, 255, 0.05);
                color: #f8fbff;
                border-radius: 8px;
                padding: 8px 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
            }
            .tactics-btn:hover {
                background: rgba(255, 255, 255, 0.12);
                transform: translateY(-1px);
            }
            .tactics-btn.active {
                border-color: rgba(255, 255, 255, 0.55);
                background: rgba(255, 255, 255, 0.2);
            }
            .tactics-btn.team1.active { box-shadow: inset 0 0 0 1px #e53935; }
            .tactics-btn.team2.active { box-shadow: inset 0 0 0 1px #1e88e5; }
            .tactics-description {
                margin-top: 10px;
                font-size: 11px;
                line-height: 1.35;
                color: #9fb0c2;
            }
        `;
        document.head.appendChild(style);
    }

    build() {
        this.root = document.createElement('div');
        this.root.id = 'tactics-ui';
        document.body.appendChild(this.root);

        this.createTeamPanel(1, this.game.team1, 'Team 1 (Red)');
        this.createTeamPanel(2, this.game.team2, 'Team 2 (Blue)');
    }

    createTeamPanel(teamId, team, label) {
        const panel = document.createElement('div');
        panel.className = `tactics-panel team${teamId}`;

        const title = document.createElement('div');
        title.className = 'tactics-title';
        title.textContent = `${label} Tactics`;

        const activeLabel = document.createElement('div');
        activeLabel.className = 'tactics-active';

        const grid = document.createElement('div');
        grid.className = 'tactics-grid';

        const description = document.createElement('div');
        description.className = 'tactics-description';

        TACTICAL_STYLE_ORDER.forEach((styleId) => {
            const style = getTacticalStyle(styleId);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `tactics-btn team${teamId}`;
            button.dataset.styleId = style.id;
            button.textContent = style.shortName;
            button.title = style.description;
            button.addEventListener('click', () => {
                team.setTacticalStyle(style.id);
                this.refresh();
            });
            grid.appendChild(button);
        });

        panel.appendChild(title);
        panel.appendChild(activeLabel);
        panel.appendChild(grid);
        panel.appendChild(description);
        this.root.appendChild(panel);

        this.teamPanels[teamId] = {
            team,
            activeLabel,
            description,
            buttons: grid.querySelectorAll('.tactics-btn')
        };

        this.refresh();
    }

    refresh() {
        Object.entries(this.teamPanels).forEach(([teamId, panelState]) => {
            const style = panelState.team.getTacticalStyleConfig();
            panelState.activeLabel.textContent = `Active: ${style.name}`;
            panelState.description.textContent = style.description;
            panelState.buttons.forEach((button) => {
                button.classList.toggle('active', button.dataset.styleId === style.id);
            });
        });
    }
}
