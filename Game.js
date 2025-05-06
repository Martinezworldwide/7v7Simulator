function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
import * as THREE from 'three';
import { SceneSetup } from './SceneSetup.js';
import { Field } from './Field.js';
import { Ball } from './Ball.js';
import { Team } from './Team.js';
import { Player } from './Player.js';
import * as CONSTANTS from './constants.js';
var Game = /*#__PURE__*/ function() {
    "use strict";
    function Game(renderDiv) {
        _class_call_check(this, Game);
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
    _create_class(Game, [
        {
            key: "setupGame",
            value: function setupGame() {
                var _this = this;
                // Add Field
                var field = new Field();
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
                this.team1.players.forEach(function(player) {
                    _this.scene.add(player.mesh);
                    _this.gameObjects.push(player);
                });
                this.team2.players.forEach(function(player) {
                    _this.scene.add(player.mesh);
                    _this.gameObjects.push(player);
                });
                // Possession Indicator
                var indicatorGeometry = new THREE.RingGeometry(CONSTANTS.PLAYER_RADIUS * 1.2, CONSTANTS.PLAYER_RADIUS * 1.4, 32);
                var indicatorMaterial = new THREE.MeshBasicMaterial({
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
                var origin = new THREE.Vector3(0, 0, 0);
                var initialDir = new THREE.Vector3(1, 0, 0); // Default direction
                var initialLength = CONSTANTS.AIM_INDICATOR_MIN_LENGTH;
                var headLength = initialLength * CONSTANTS.AIM_INDICATOR_HEAD_LENGTH_RATIO;
                var headWidth = initialLength * CONSTANTS.AIM_INDICATOR_HEAD_WIDTH_RATIO;
                this.aimIndicator = new THREE.ArrowHelper(initialDir, origin, initialLength, CONSTANTS.AIM_INDICATOR_COLOR, headLength, headWidth);
                this.aimIndicator.visible = false;
                this.scene.add(this.aimIndicator);
                this.resetToKickoff();
            }
        },
        {
            key: "resetToKickoff",
            value: function resetToKickoff() {
                var _this = this;
                var kickingTeamId = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 1;
                console.log("Kickoff! Team ".concat(kickingTeamId, " starts."));
                this.ball.reset();
                this.team1.resetPositions(true); // Home team left
                this.team2.resetPositions(false); // Away team right
                this.gameState = CONSTANTS.GAME_STATE.KICKOFF;
                // Give ball possession to the kicking team's center forward (or similar)
                var kickingTeam = kickingTeamId === 1 ? this.team1 : this.team2;
                var centerPlayer = kickingTeam.players.reduce(function(closest, p) {
                    // Simplistic: find player closest to center field at kickoff
                    return p.initialPosition.lengthSq() < closest.initialPosition.lengthSq() ? p : closest;
                });
                // Position ball slightly ahead of the center player
                var kickoffOffset = new THREE.Vector3(kickingTeamId === 1 ? 0.5 : -0.5, 0, 0);
                this.ball.mesh.position.copy(centerPlayer.mesh.position).add(kickoffOffset);
                this.ball.possessor = centerPlayer;
                centerPlayer.hasBall = true;
                // Small delay before starting play
                setTimeout(function() {
                    _this.gameState = CONSTANTS.GAME_STATE.PLAYING;
                    if (_this.ball.possessor) {
                        // Initial "kick" towards opponent goal
                        var direction = kickingTeamId === 1 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(-1, 0, 0);
                        _this.ball.kick(direction.multiplyScalar(CONSTANTS.INITIAL_KICK_STRENGTH));
                    // The kick method already handles setting hasBall=false and possessor=null
                    }
                }, 1000); // 1 second delay
            }
        },
        {
            key: "update",
            value: function update() {
                var originalDeltaTime = this.clock.getDelta();
                var deltaTime = originalDeltaTime;
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
                var possessingTeam = this.ball.possessor ? this.ball.possessor.teamId : null;
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
                var allPlayers = this.team1.players.concat(this.team2.players);
                var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                try {
                    for(var _iterator = allPlayers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                        var player = _step.value;
                        if ((player.actionState === 'SHOOTING' || player.actionState === 'PASSING') && player.kickAimDirection) {
                            this.aimIndicator.position.copy(player.mesh.position);
                            this.aimIndicator.position.y = CONSTANTS.BALL_RADIUS; // Position slightly above ground
                            this.aimIndicator.setDirection(player.kickAimDirection);
                            var arrowLength = THREE.MathUtils.clamp(player.kickAimStrength * CONSTANTS.AIM_INDICATOR_LENGTH_SCALE, CONSTANTS.AIM_INDICATOR_MIN_LENGTH, CONSTANTS.AIM_INDICATOR_MAX_LENGTH);
                            var headLength = arrowLength * CONSTANTS.AIM_INDICATOR_HEAD_LENGTH_RATIO;
                            var headWidth = arrowLength * CONSTANTS.AIM_INDICATOR_HEAD_WIDTH_RATIO;
                            this.aimIndicator.setLength(arrowLength, headLength, headWidth);
                            this.aimIndicator.setColor(CONSTANTS.AIM_INDICATOR_COLOR); // Could be dynamic later
                            this.aimIndicator.visible = true;
                            break; // Show for one player only
                        }
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally{
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return != null) {
                            _iterator.return();
                        }
                    } finally{
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            }
        },
        {
            key: "render",
            value: function render() {
                this.renderer.render(this.scene, this.camera);
            }
        },
        {
            key: "start",
            value: function start() {
                var _this = this;
                var animate = function() {
                    requestAnimationFrame(animate);
                    _this.update();
                    _this.render();
                };
                animate();
            }
        }
    ]);
    return Game;
}();
export { Game };
