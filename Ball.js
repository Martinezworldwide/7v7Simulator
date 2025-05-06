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
import * as CONSTANTS from './constants.js';
var Ball = /*#__PURE__*/ function() {
    "use strict";
    function Ball() {
        _class_call_check(this, Ball);
        var geometry = new THREE.SphereGeometry(CONSTANTS.BALL_RADIUS, 16, 16);
        var material = new THREE.MeshLambertMaterial({
            color: CONSTANTS.BALL_COLOR
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, CONSTANTS.BALL_RADIUS, 0); // Start slightly above ground
        this.mesh.castShadow = true;
        this.velocity = new THREE.Vector3();
        this.possessor = null; // The player currently controlling the ball
    }
    _create_class(Ball, [
        {
            key: "update",
            value: function update(deltaTime, players, game) {
                if (this.possessor) {
                    // If possessed, stick to the player slightly ahead of them
                    var playerPos = this.possessor.mesh.position;
                    var playerDir = new THREE.Vector3();
                    this.possessor.mesh.getWorldDirection(playerDir); // Get direction player is facing
                    // Offset based on player facing direction
                    var offsetDistance = CONSTANTS.PLAYER_RADIUS + CONSTANTS.BALL_RADIUS + 0.1; // Adjust offset as needed
                    var ballOffset = playerDir.multiplyScalar(offsetDistance);
                    this.mesh.position.copy(playerPos).add(ballOffset);
                    this.mesh.position.y = CONSTANTS.BALL_RADIUS; // Keep ball on ground
                    this.velocity.set(0, 0, 0); // No independent velocity when possessed
                } else {
                    // Apply friction/drag
                    this.velocity.multiplyScalar(1.0 - CONSTANTS.BALL_FRICTION * deltaTime);
                    // Stop if velocity is very low
                    if (this.velocity.lengthSq() < 0.01) {
                        this.velocity.set(0, 0, 0);
                    }
                    // Update position based on velocity
                    this.mesh.position.addScaledVector(this.velocity, deltaTime);
                    // Basic collision with ground (keep y=BALL_RADIUS)
                    this.mesh.position.y = CONSTANTS.BALL_RADIUS;
                    // Basic collision with field boundaries (simple bounce)
                    if (Math.abs(this.mesh.position.z) > CONSTANTS.FIELD_HEIGHT / 2 - CONSTANTS.BALL_RADIUS) {
                        this.mesh.position.z = Math.sign(this.mesh.position.z) * (CONSTANTS.FIELD_HEIGHT / 2 - CONSTANTS.BALL_RADIUS);
                        this.velocity.z *= -0.7; // Lose some energy on bounce
                    }
                    // Check for goal line crossing (handled in Game.js)
                    // if (Math.abs(this.mesh.position.x) > CONSTANTS.FIELD_WIDTH / 2 - CONSTANTS.BALL_RADIUS) {
                    //    // Could implement goal logic here or in Game.js
                    //    // For simplicity, goal checking is in Game.js
                    //    // this.velocity.x *= -0.5;
                    // }
                    // Check for collision with players
                    this.checkPlayerCollision(players);
                }
            }
        },
        {
            key: "checkPlayerCollision",
            value: function checkPlayerCollision(players) {
                var collisionThreshold = CONSTANTS.PLAYER_RADIUS + CONSTANTS.BALL_RADIUS;
                var collisionThresholdSq = collisionThreshold * collisionThreshold;
                var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                try {
                    for(var _iterator = players[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                        var player = _step.value;
                        if (this.possessor === player) continue; // Don't collide with possessor
                        var distanceSq = this.mesh.position.distanceToSquared(player.mesh.position);
                        if (distanceSq < collisionThresholdSq) {
                            // --- Collision occurred ---
                            // If ball was free, player now possesses it
                            if (!this.possessor) {
                                console.log("Player from Team ".concat(player.teamId, " took possession!"));
                                this.possessor = player;
                                player.hasBall = true;
                                this.velocity.set(0, 0, 0); // Stop ball movement
                                break; // Only one player can gain possession per frame
                            } else if (this.possessor && this.possessor.teamId !== player.teamId) {
                                console.log("Tackle/Deflection by Team ".concat(player.teamId, "!"));
                                var bounceDirection = new THREE.Vector3().subVectors(this.mesh.position, player.mesh.position).normalize();
                                var currentSpeed = this.velocity.length(); // Speed before collision
                                var newSpeed = Math.max(currentSpeed * 0.5, CONSTANTS.TACKLE_BOUNCE_SPEED); // Bounce speed
                                // Release possession
                                this.possessor.hasBall = false;
                                this.possessor = null;
                                this.velocity.copy(bounceDirection).multiplyScalar(newSpeed);
                                // Move ball slightly away to avoid immediate re-collision
                                this.mesh.position.addScaledVector(this.velocity, 0.05);
                                break; // Collision handled
                            }
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
            key: "kick",
            value: function kick(forceVector) {
                if (this.possessor) {
                    this.possessor.hasBall = false;
                    this.possessor = null;
                }
                this.velocity.copy(forceVector);
                // Clamp max kick speed
                if (this.velocity.lengthSq() > CONSTANTS.MAX_KICK_SPEED * CONSTANTS.MAX_KICK_SPEED) {
                    this.velocity.normalize().multiplyScalar(CONSTANTS.MAX_KICK_SPEED);
                }
            }
        },
        {
            key: "reset",
            value: function reset() {
                this.mesh.position.set(0, CONSTANTS.BALL_RADIUS, 0);
                this.velocity.set(0, 0, 0);
                if (this.possessor) {
                    this.possessor.hasBall = false;
                }
                this.possessor = null;
            }
        }
    ]);
    return Ball;
}();
export { Ball };
