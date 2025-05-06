import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { SceneSetup } from './SceneSetup.js';
import { Field } from './Field.js';
import { Ball } from './Ball.js';
import { Team } from './Team.js';
import { Player } from './Player.js';
import * as CONSTANTS from './constants.js';

export class Game {
    constructor(renderDiv) {
        this.renderDiv = renderDiv;
        this.sceneSetup = new SceneSetup(renderDiv);
        this.scene = this.sceneSetup.scene;
        this.camera = this.sceneSetup.camera;
        this.renderer = this.sceneSetup.renderer;
        this.clock = new THREE.Clock();
        this.gameObjects = [];
        this.team1 = null;
        this.team2 = null;
        this.ball = null;
        this.gameState = CONSTANTS.GAME_STATE.KICKOFF; // Initial state
        this.possessionIndicator = null;
        this.aimIndicator = null;
        this.setupGame();
    }

    setupGame() {
        // Add Field
        const field = new Field();
        this.scene.add(field.mesh);
        this.scene.add(field.goal1);
        this.scene.add(field.goal2);

        // Add Ball
        this.ball = new Ball();
        this.scene.add(this.ball.mesh);
        this.gameObjects.push(this.ball);

        // Add Teams
        this.team1 = new Team(1, CONSTANTS.TEAM1_COLOR, CONSTANTS.FORMATION_2_3_1, true); // Home team starts left
        this.team2 = new Team(2, CONSTANTS.TEAM2_COLOR, CONSTANTS.FORMATION_2_3_1, false); // Away team starts right

        this.team1.players.forEach(player => {
            this.scene.add(player.mesh);
            this.gameObjects.push(player);
        });

        this.team2.players.forEach(player => {
            this.scene.add(player.mesh);
            this.gameObjects.push(player);
        });

        // Debug: Log all initial Z positions for both teams
        console.log('Team 1 initial Zs:', this.team1.players.map(p => p.initialPosition.z));
        console.log('Team 2 initial Zs:', this.team2.players.map(p => p.initialPosition.z));

        // Possession Indicator
        const indicatorGeometry = new THREE.RingGeometry(
            CONSTANTS.PLAYER_RADIUS * 1.2,
            CONSTANTS.PLAYER_RADIUS * 1.4,
            32
        );
        const indicatorMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        this.possessionIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        this.possessionIndicator.rotation.x = -Math.PI / 2; // Lay flat
        this.possessionIndicator.visible = false; // Initially hidden
        this.scene.add(this.possessionIndicator);

        // Aim Indicator (ArrowHelper)
        const origin = new THREE.Vector3(0, 0, 0);
        const initialDir = new THREE.Vector3(1, 0, 0); // Default direction
        const initialLength = CONSTANTS.AIM_INDICATOR_MIN_LENGTH;
        const headLength = initialLength * CONSTANTS.AIM_INDICATOR_HEAD_LENGTH_RATIO;
        const headWidth = initialLength * CONSTANTS.AIM_INDICATOR_HEAD_WIDTH_RATIO;
        this.aimIndicator = new THREE.ArrowHelper(
            initialDir,
            origin,
            initialLength,
            CONSTANTS.AIM_INDICATOR_COLOR,
            headLength,
            headWidth
        );
        this.aimIndicator.visible = false;
        this.scene.add(this.aimIndicator);

        this.resetToKickoff();
    }

    resetToKickoff(kickingTeamId = 1) {
        console.log(`Kickoff! Team ${kickingTeamId} starts.`);
        this.ball.reset();
        this.team1.resetPositions(true); // Home team left
        this.team2.resetPositions(false); // Away team right
        this.gameState = CONSTANTS.GAME_STATE.KICKOFF;

        // Give ball possession to the kicking team's center forward (or similar)
        const kickingTeam = kickingTeamId === 1 ? this.team1 : this.team2;
        const centerPlayer = kickingTeam.players.reduce((closest, p) => {
            // Simplistic: find player closest to center field at kickoff
            return p.initialPosition.lengthSq() < closest.initialPosition.lengthSq() ? p : closest;
        });

        // Position ball slightly ahead of the center player
        const kickoffOffset = new THREE.Vector3(kickingTeamId === 1 ? 0.5 : -0.5, 0, 0);
        this.ball.mesh.position.copy(centerPlayer.mesh.position).add(kickoffOffset);
        this.ball.possessor = centerPlayer;
        centerPlayer.hasBall = true;

        // Small delay before starting play
        setTimeout(() => {
            this.gameState = CONSTANTS.GAME_STATE.PLAYING;
            if (this.ball.possessor) {
                // Initial "kick" towards opponent goal
                const direction = kickingTeamId === 1
                    ? new THREE.Vector3(1, 0, 0)
                    : new THREE.Vector3(-1, 0, 0);
                this.ball.kick(direction.multiplyScalar(CONSTANTS.INITIAL_KICK_STRENGTH));
                // The kick method already handles setting hasBall=false and possessor=null
            }
        }, 1000); // 1 second delay
    }

    update() {
        const originalDeltaTime = this.clock.getDelta();
        let deltaTime = originalDeltaTime;

        // Clamp deltaTime to prevent instability when tab is backgrounded
        deltaTime = Math.min(deltaTime, 0.033); // Max ~33ms per frame (approx 30 FPS)

        if (this.gameState !== CONSTANTS.GAME_STATE.PLAYING) {
            // Only update ball physics if needed when not playing
            // Pass clamped deltaTime for ball physics if not playing, as player AI isn't running.
            this.ball.update(deltaTime, this.team1.players.concat(this.team2.players), this);
            return; // Don't update players if not playing
        }

        // Update Ball first (using clamped deltaTime for physics consistency)
        this.ball.update(deltaTime, this.team1.players.concat(this.team2.players), this);

        // Determine which team has possession (if anyone)
        const possessingTeam = this.ball.possessor ? this.ball.possessor.teamId : null;

        // Update Teams/Players - Pass 'this' (the game instance) and originalDeltaTime down
        this.team1.update(deltaTime, originalDeltaTime, this.ball, possessingTeam === 1, this.team2.players, this);
        this.team2.update(deltaTime, originalDeltaTime, this.ball, possessingTeam === 2, this.team1.players, this);

        // Check for goals
        if (this.ball.mesh.position.x > CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.GOAL_DEPTH / 2) {
            console.log("Goal for Team 1!");
            this.resetToKickoff(2); // Team 2 kicks off next
        } else if (this.ball.mesh.position.x < -CONSTANTS.FIELD_WIDTH / 2 - CONSTANTS.GOAL_DEPTH / 2) {
            console.log("Goal for Team 2!");
            this.resetToKickoff(1); // Team 1 kicks off next
        }

        // Update possession indicator
        if (this.ball.possessor) {
            this.possessionIndicator.visible = true;
            this.possessionIndicator.position.copy(this.ball.possessor.mesh.position);
            this.possessionIndicator.position.y = 0.05; // Slightly above ground
        } else {
            this.possessionIndicator.visible = false;
        }

        // Update Aim indicator
        this.aimIndicator.visible = false; // Default to hidden
        const allPlayers = this.team1.players.concat(this.team2.players);
        for (const player of allPlayers) {
            if ((player.actionState === 'SHOOTING' || player.actionState === 'PASSING') && player.kickAimDirection) {
                this.aimIndicator.position.copy(player.mesh.position);
                this.aimIndicator.position.y = CONSTANTS.BALL_RADIUS; // Position slightly above ground
                this.aimIndicator.setDirection(player.kickAimDirection);
                const arrowLength = THREE.MathUtils.clamp(
                    player.kickAimStrength * CONSTANTS.AIM_INDICATOR_LENGTH_SCALE,
                    CONSTANTS.AIM_INDICATOR_MIN_LENGTH,
                    CONSTANTS.AIM_INDICATOR_MAX_LENGTH
                );
                const headLength = arrowLength * CONSTANTS.AIM_INDICATOR_HEAD_LENGTH_RATIO;
                const headWidth = arrowLength * CONSTANTS.AIM_INDICATOR_HEAD_WIDTH_RATIO;
                this.aimIndicator.setLength(arrowLength, headLength, headWidth);
                this.aimIndicator.setColor(CONSTANTS.AIM_INDICATOR_COLOR); // Could be dynamic later
                this.aimIndicator.visible = true;
                break; // Show for one player only
            }
        }
    }

    render() {
        this.update();
        this.renderer.render(this.scene, this.camera);
    }

    start() {
        const animate = () => {
            requestAnimationFrame(animate);
            this.render();
        };
        animate();
    }
}
