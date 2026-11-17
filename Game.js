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
        this.score = { 1: 0, 2: 0 };
        this.matchTime = 0;
        this.lastPossessor = null;
        this.possessionTime = 0;
        this.scoreboardEl = null;
        this.scoreTextEl = null;
        this.clockEl = null;
        this.goalFlashEl = null;
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

        this.buildScoreboard();
        this.resetToKickoff();
    }

    buildScoreboard() {
        if (document.getElementById('scoreboard')) return;
        const style = document.createElement('style');
        style.textContent = `
            #scoreboard { position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
                z-index: 30; font-family: Arial, Helvetica, sans-serif;
                display: flex; align-items: center; gap: 12px; white-space: nowrap;
                background: rgba(8,12,18,0.82); color: #f4f7fb; border: 1px solid rgba(255,255,255,0.12);
                border-radius: 999px; padding: 6px 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
            #scoreboard .score { font-size: 15px; font-weight: 700; letter-spacing: 0.03em; }
            #scoreboard .score .red { color: #ff6f60; } #scoreboard .score .blue { color: #64b5f6; }
            #scoreboard .clock { font-size: 12px; color: #c7d2e0; }
            #scoreboard .controls { display: flex; gap: 6px; }
            #scoreboard button { border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06);
                color: #f8fbff; border-radius: 8px; padding: 5px 10px; font-size: 11px; font-weight: 600; cursor: pointer; }
            #scoreboard button:hover { background: rgba(255,255,255,0.14); }
            #goal-flash { position: fixed; top: 38%; left: 50%; transform: translate(-50%,-50%);
                z-index: 40; font-family: Arial, Helvetica, sans-serif; font-size: 64px; font-weight: 800;
                color: #ffd54f; text-shadow: 0 4px 24px rgba(0,0,0,0.6); display: none; pointer-events: none; }
        `;
        document.head.appendChild(style);

        const bar = document.createElement('div');
        bar.id = 'scoreboard';
        bar.innerHTML = `
            <div class="score"><span class="red">RED</span> <span id="score-text">0 - 0</span> <span class="blue">BLUE</span></div>
            <div class="clock" id="match-clock">00:00</div>
            <div class="controls">
                <button type="button" id="btn-pause">Pause</button>
                <button type="button" id="btn-restart">Restart</button>
            </div>`;
        document.body.appendChild(bar);
        this.scoreboardEl = bar;
        this.scoreTextEl = bar.querySelector('#score-text');
        this.clockEl = bar.querySelector('#match-clock');
        bar.querySelector('#btn-pause').addEventListener('click', () => this.togglePause());
        bar.querySelector('#btn-restart').addEventListener('click', () => this.restartMatch());

        const flash = document.createElement('div');
        flash.id = 'goal-flash';
        flash.textContent = 'GOAL!';
        document.body.appendChild(flash);
        this.goalFlashEl = flash;
    }

    updateScoreboard() {
        if (this.scoreTextEl) this.scoreTextEl.textContent = `${this.score[1]} - ${this.score[2]}`;
        if (this.clockEl) {
            const total = Math.floor(this.matchTime);
            const mm = String(Math.floor(total / 60)).padStart(2, '0');
            const ss = String(total % 60).padStart(2, '0');
            this.clockEl.textContent = `${mm}:${ss}`;
        }
    }

    togglePause() {
        if (this.gameState === CONSTANTS.GAME_STATE.PAUSED) {
            this.gameState = CONSTANTS.GAME_STATE.PLAYING;
        } else if (this.gameState === CONSTANTS.GAME_STATE.PLAYING) {
            this.gameState = CONSTANTS.GAME_STATE.PAUSED;
        }
        const btn = this.scoreboardEl ? this.scoreboardEl.querySelector('#btn-pause') : null;
        if (btn) btn.textContent = this.gameState === CONSTANTS.GAME_STATE.PAUSED ? 'Resume' : 'Pause';
    }

    restartMatch() {
        this.score = { 1: 0, 2: 0 };
        this.matchTime = 0;
        this.updateScoreboard();
        this.resetToKickoff(1);
    }

    showFlash(text, ms = 1400) {
        if (!this.goalFlashEl) return;
        this.goalFlashEl.textContent = text;
        this.goalFlashEl.style.display = 'block';
        setTimeout(() => { this.goalFlashEl.style.display = 'none'; }, ms);
    }

    onGoal(scoringTeamId) {
        this.score[scoringTeamId] += 1;
        this.updateScoreboard();
        console.log(`Goal for Team ${scoringTeamId}! Score: ${this.score[1]} - ${this.score[2]}`);
        this.gameState = CONSTANTS.GAME_STATE.GOAL_SCORED;
        this.showFlash('GOAL!');
        const concedingTeamId = scoringTeamId === 1 ? 2 : 1;
        setTimeout(() => this.resetToKickoff(concedingTeamId), 1600);
    }

    // Award a restart when the ball leaves the pitch (real set pieces instead
    // of the old invisible walls). lastTouch decides who gets the ball.
    takeSetPiece(kind, awardedTeamId, spot) {
        const setPieceId = (this.setPieceId || 0) + 1;
        this.setPieceId = setPieceId;
        this.gameState = CONSTANTS.GAME_STATE.SET_PIECE;
        this.ball.possessor = null;
        this.ball.velocity.set(0, 0, 0);
        this.ball.mesh.position.set(spot.x, CONSTANTS.BALL_RADIUS, spot.z);
        this.lastPossessor = null;
        this.possessionTime = 0;
        const label = kind === 'THROW_IN' ? 'Throw-in' : kind === 'CORNER' ? 'Corner kick' : 'Goal kick';
        console.log(`${label} for Team ${awardedTeamId}`);
        this.showFlash(label, 900);

        const awardedTeam = awardedTeamId === 1 ? this.team1 : this.team2;
        setTimeout(() => {
            if (this.setPieceId !== setPieceId || this.gameState !== CONSTANTS.GAME_STATE.SET_PIECE) return; // Superseded by a restart
            if (kind === 'GOAL_KICK') {
                const gk = awardedTeam.players.find(pl => pl.role === 'GOALKEEPER') || awardedTeam.players[0];
                gk.mesh.position.set(spot.x * 0.92, 0, spot.z * 0.5);
                this.ball.mesh.position.set(gk.mesh.position.x, CONSTANTS.BALL_RADIUS, gk.mesh.position.z);
                this.ball.possessor = gk;
                gk.hasBall = true;
            } else if (kind === 'CORNER') {
                // Nearest taker whips it toward the penalty spot
                const taker = awardedTeam.players.reduce((best, pl) =>
                    pl.mesh.position.distanceToSquared(this.ball.mesh.position) < best.mesh.position.distanceToSquared(this.ball.mesh.position) ? pl : best);
                taker.mesh.position.set(spot.x * 0.98, 0, spot.z);
                this.ball.mesh.position.set(spot.x, CONSTANTS.BALL_RADIUS, spot.z);
                const goalX = awardedTeamId === 1 ? CONSTANTS.FIELD_WIDTH / 2 : -CONSTANTS.FIELD_WIDTH / 2;
                const target = new THREE.Vector3(goalX * 0.78, 0, spot.z * 0.25);
                const dir = target.sub(this.ball.mesh.position).normalize();
                this.ball.lastTouchTeamId = awardedTeamId;
                this.ball.velocity.copy(dir.multiplyScalar(17));
            } else {
                // Throw-in: nearest awarded player takes possession at the spot
                const taker = awardedTeam.players.reduce((best, pl) =>
                    pl.mesh.position.distanceToSquared(this.ball.mesh.position) < best.mesh.position.distanceToSquared(this.ball.mesh.position) ? pl : best);
                taker.mesh.position.set(spot.x, 0, spot.z);
                this.ball.mesh.position.set(spot.x, CONSTANTS.BALL_RADIUS, spot.z);
                this.ball.possessor = taker;
                taker.hasBall = true;
                this.ball.lastTouchTeamId = awardedTeamId;
            }
            this.gameState = CONSTANTS.GAME_STATE.PLAYING;
        }, 900);
    }

    checkOutOfBounds() {
        if (this.ball.possessor) return; // Only a free ball can go out
        const bp = this.ball.mesh.position;
        const halfW = CONSTANTS.FIELD_WIDTH / 2;
        const halfH = CONSTANTS.FIELD_HEIGHT / 2;
        const lastTouch = this.ball.lastTouchTeamId;
        if (Math.abs(bp.z) > halfH + CONSTANTS.BALL_RADIUS) {
            const awarded = lastTouch === 1 ? 2 : 1;
            const spot = new THREE.Vector3(
                THREE.MathUtils.clamp(bp.x, -halfW + 2, halfW - 2), 0,
                Math.sign(bp.z) * (halfH - 0.5));
            this.takeSetPiece('THROW_IN', awarded, spot);
            return;
        }
        if (Math.abs(bp.x) > halfW + CONSTANTS.BALL_RADIUS) {
            const attackingTeam = bp.x > 0 ? 1 : 2; // Team attacking this end
            const inMouth = Math.abs(bp.z) <= CONSTANTS.GOAL_WIDTH / 2;
            if (inMouth) return; // Goal check handles it
            const side = Math.sign(bp.x);
            if (lastTouch === attackingTeam) {
                // Attacker touched it last over the goal line: goal kick
                const defendingTeam = attackingTeam === 1 ? 2 : 1;
                const spot = new THREE.Vector3(side * (halfW - 6), 0, side * 0); // near defending goal
                spot.z = THREE.MathUtils.clamp(bp.z, -8, 8);
                this.takeSetPiece('GOAL_KICK', defendingTeam, spot);
            } else {
                // Defender touched it last: corner to the attackers
                const spot = new THREE.Vector3(side * (halfW - 0.5), 0, Math.sign(bp.z || 1) * (halfH - 0.5));
                this.takeSetPiece('CORNER', attackingTeam, spot);
            }
        }
    }

    resetToKickoff(kickingTeamId = 1) {
        console.log(`Kickoff! Team ${kickingTeamId} starts.`);
        this.lastPossessor = null;
        this.possessionTime = 0;
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

        // Small delay before starting play. The kickoff carrier keeps the ball
        // and normal play develops from there - the old blind kickoff kick just
        // gifted possession to the opponent's forwards every restart.
        setTimeout(() => {
            this.gameState = CONSTANTS.GAME_STATE.PLAYING;
        }, 1000); // 1 second delay
    }

    update() {
        const originalDeltaTime = this.clock.getDelta();
        let deltaTime = originalDeltaTime;

        // Clamp deltaTime to prevent instability when tab is backgrounded
        deltaTime = Math.min(deltaTime, 0.033); // Max ~33ms per frame (approx 30 FPS)

        if (this.gameState === CONSTANTS.GAME_STATE.PAUSED) {
            return; // Frozen until resumed
        }

        if (this.gameState !== CONSTANTS.GAME_STATE.PLAYING) {
            // Only update ball physics if needed when not playing (never during a
            // set piece: the placed ball is dead until the restart is taken)
            if (this.gameState !== CONSTANTS.GAME_STATE.SET_PIECE) {
                this.ball.update(deltaTime, this.team1.players.concat(this.team2.players), this);
            }
            return; // Don't update players if not playing
        }

        this.matchTime += deltaTime;
        this.updateScoreboard();

        // Anti-stall: if one player holds the ball too long without anything
        // happening (e.g. pinned against a boundary), force a clearance toward
        // the opponent's goal so play can never freeze again.
        if (this.ball.possessor) {
            if (this.ball.possessor === this.lastPossessor) {
                this.possessionTime += deltaTime;
            } else {
                this.lastPossessor = this.ball.possessor;
                this.possessionTime = 0;
            }
            if (this.possessionTime > 6) {
                const holder = this.ball.possessor;
                const goalX = holder.teamId === 1 ? CONSTANTS.FIELD_WIDTH / 2 : -CONSTANTS.FIELD_WIDTH / 2;
                const clearDir = new THREE.Vector3(goalX, 0, 0).sub(holder.mesh.position).normalize();
                this.ball.kick(clearDir.multiplyScalar(CONSTANTS.PASS_STRENGTH));
                this.lastPossessor = null;
                this.possessionTime = 0;
            }
        } else {
            this.lastPossessor = null;
            this.possessionTime = 0;
        }

        // Update Ball first (using clamped deltaTime for physics consistency)
        this.ball.update(deltaTime, this.team1.players.concat(this.team2.players), this);

        // Determine which team has possession (if anyone)
        const possessingTeam = this.ball.possessor ? this.ball.possessor.teamId : null;

        // Update Teams/Players - Pass 'this' (the game instance) and originalDeltaTime down
        this.team1.update(deltaTime, originalDeltaTime, this.ball, possessingTeam === 1, this.team2.players, this);
        this.team2.update(deltaTime, originalDeltaTime, this.ball, possessingTeam === 2, this.team1.players, this);

        // Out of bounds -> set pieces (throw-ins, corners, goal kicks)
        this.checkOutOfBounds();
        if (this.gameState !== CONSTANTS.GAME_STATE.PLAYING) return;

        // Check for goals: ball centre past the goal line, inside the goal mouth
        const ballPos = this.ball.mesh.position;
        const inGoalMouth = Math.abs(ballPos.z) <= CONSTANTS.GOAL_WIDTH / 2;
        if (inGoalMouth && ballPos.x > CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.BALL_RADIUS) {
            this.onGoal(1);
            return;
        } else if (inGoalMouth && ballPos.x < -CONSTANTS.FIELD_WIDTH / 2 - CONSTANTS.BALL_RADIUS) {
            this.onGoal(2);
            return;
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
