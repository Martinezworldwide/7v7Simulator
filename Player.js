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
var Player = /*#__PURE__*/ function() {
    "use strict";
    function Player(teamId, color, initialPosition) {
        var role = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 'FIELD_PLAYER';
        _class_call_check(this, Player);
        this.teamId = teamId;
        this.role = role; // 'GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD' (simplified for now)
        this.initialPosition = initialPosition.clone(); // Store starting pos
        this.targetPosition = initialPosition.clone(); // Where the player intends to go
        var geometry = new THREE.CapsuleGeometry(CONSTANTS.PLAYER_RADIUS, CONSTANTS.PLAYER_HEIGHT, 4, 10);
        // Offset geometry so the base is at y=0
        geometry.translate(0, CONSTANTS.PLAYER_HEIGHT / 2 + CONSTANTS.PLAYER_RADIUS, 0);
        var material = new THREE.MeshLambertMaterial({
            color: color
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(initialPosition);
        this.mesh.castShadow = true;
        this.velocity = new THREE.Vector3();
        this.hasBall = false;
        this.actionState = 'IDLE'; // e.g., IDLE, MOVING_TO_BALL, SUPPORTING, DEFENDING
        this.maxSpeed = CONSTANTS.PLAYER_MAX_SPEED * (Math.random() * 0.4 + 0.8); // Slight variation
        this.kickAimDirection = null; // For aim indicator
        this.kickAimStrength = 0; // For aim indicator length
    }
    _create_class(Player, [
        {
            // Note: Added 'game' parameter and 'originalDeltaTime'
            key: "update",
            value: function update(deltaTime, originalDeltaTime, ball, teamHasPossession, opponents, game) {
                var _this = this;
                // If a large time jump occurred (e.g., tab was backgrounded), reset velocity
                // to prevent players from continuing in a straight line with stale momentum.
                // 0.2 seconds is a somewhat arbitrary threshold for a "long pause".
                if (originalDeltaTime > 0.2) {
                    console.log("Player ".concat(this.mesh.uuid.substring(0, 5), " - Long Pause Detected! originalDeltaTime: ").concat(originalDeltaTime.toFixed(3), "s"));
                    console.log("  Before Reset - Action: ".concat(this.actionState, ", Velocity: (").concat(this.velocity.x.toFixed(2), ", ").concat(this.velocity.y.toFixed(2), ", ").concat(this.velocity.z.toFixed(2), ")"));
                    this.velocity.set(0, 0, 0);
                    // Force AI to re-evaluate by setting state to IDLE
                    this.actionState = 'IDLE';
                    console.log("  After Reset  - Action: ".concat(this.actionState, ", Velocity: (").concat(this.velocity.x.toFixed(2), ", ").concat(this.velocity.y.toFixed(2), ", ").concat(this.velocity.z.toFixed(2), ")"));
                }
                // State transition for actions completed last frame
                if (this.actionState === 'PASSING' || this.actionState === 'SHOOTING') {
                    // Kick was initiated last frame, player no longer has ball. Transition to IDLE or other.
                    this.actionState = 'IDLE'; // Simple transition for now
                }
                // Reset aim details at the start of each update. They'll be set if a kick is decided this frame.
                this.kickAimDirection = null;
                this.kickAimStrength = 0;
                var ballPosition = ball.mesh.position;
                var myPosition = this.mesh.position;
                // --- Basic AI Decision Making ---
                var distanceToBall = myPosition.distanceTo(ballPosition);
                var desiredDirection = new THREE.Vector3();
                var targetSpeed = this.maxSpeed;
                if (teamHasPossession) {
                    // --- ATTACKING LOGIC ---
                    if (this.hasBall) {
                        var goalX = this.teamId === 1 ? CONSTANTS.FIELD_WIDTH / 2 : -CONSTANTS.FIELD_WIDTH / 2;
                        var ownGoalX = this.teamId === 1 ? -CONSTANTS.FIELD_WIDTH / 2 : CONSTANTS.FIELD_WIDTH / 2;
                        var goalDirection = new THREE.Vector3(goalX, 0, 0).sub(myPosition).normalize();
                        var potentialPassTarget = null;
                        var distToPotentialPassTarget = Infinity; // Initialize with a high value
                        var passTargetScore = -Infinity;
                        var allies = this.teamId === 1 ? game.team1.players : game.team2.players;
                        allies.forEach(function(ally) {
                            if (ally === _this) return;
                            var vectorToAlly = new THREE.Vector3().subVectors(ally.mesh.position, myPosition);
                            var distToAlly = vectorToAlly.length();
                            if (distToAlly < CONSTANTS.PASS_MAX_RANGE && distToAlly > CONSTANTS.PASS_MIN_RANGE) {
                                var myDistToGoalX = Math.abs(goalX - myPosition.x);
                                var allyDistToGoalX = Math.abs(goalX - ally.mesh.position.x);
                                // Check if ally is generally ahead
                                var isAllyAhead = _this.teamId === 1 && ally.mesh.position.x > myPosition.x || _this.teamId === 2 && ally.mesh.position.x < myPosition.x;
                                if (isAllyAhead && allyDistToGoalX < myDistToGoalX) {
                                    var score = myDistToGoalX - allyDistToGoalX; // How much closer to goal
                                    score -= distToAlly * 0.1; // Penalize very long passes slightly
                                    // Bonus for being more central
                                    score += (CONSTANTS.FIELD_HEIGHT / 2 - Math.abs(ally.mesh.position.z)) * 0.05;
                                    if (score > passTargetScore) {
                                        passTargetScore = score;
                                        potentialPassTarget = ally;
                                        distToPotentialPassTarget = distToAlly; // Store the distance to this specific ally
                                    }
                                }
                            }
                        });
                        var closestOpponentDist = this.getClosestOpponentDistance(opponents);
                        var shouldAttemptPass = potentialPassTarget && (Math.random() < CONSTANTS.PASS_PROBABILITY || closestOpponentDist < CONSTANTS.PASS_PRESSURE_DISTANCE);
                        if (shouldAttemptPass) {
                            var passDirection = new THREE.Vector3().subVectors(potentialPassTarget.mesh.position, myPosition);
                            // Add a slight lead to the pass target
                            var leadFactor = THREE.MathUtils.clamp(passDirection.length() / CONSTANTS.PASS_MAX_RANGE, 0.1, 0.5);
                            passDirection.addScaledVector(potentialPassTarget.velocity, leadFactor); // Simple lead pass
                            passDirection.normalize();
                            var passStrength = CONSTANTS.PASS_STRENGTH * THREE.MathUtils.clamp(distToPotentialPassTarget / CONSTANTS.PASS_MAX_RANGE, 0.7, 1.2);
                            var kickVector = passDirection.multiplyScalar(passStrength);
                            this.actionState = 'PASSING';
                            this.kickAimDirection = kickVector.clone().normalize();
                            this.kickAimStrength = kickVector.length();
                            this.tryKick(ball, kickVector);
                        } else {
                            // Dribble or Shoot
                            desiredDirection = goalDirection;
                            this.actionState = 'DRIBBLE';
                            var distToGoal = myPosition.distanceTo(new THREE.Vector3(goalX, 0, myPosition.z)); // Use X-distance for shooting range
                            if (closestOpponentDist < CONSTANTS.KICK_RANGE * 2.0 && distToGoal < CONSTANTS.SHOOTING_RANGE) {
                                var shootStrength = CONSTANTS.MAX_KICK_SPEED * THREE.MathUtils.lerp(0.6, 1.0, (CONSTANTS.SHOOTING_RANGE - distToGoal) / CONSTANTS.SHOOTING_RANGE);
                                var kickVector1 = goalDirection.clone().multiplyScalar(shootStrength);
                                this.actionState = 'SHOOTING';
                                this.kickAimDirection = kickVector1.clone().normalize();
                                this.kickAimStrength = kickVector1.length();
                                this.tryKick(ball, kickVector1);
                            }
                        }
                    } else {
                        // Move towards ball if close, otherwise find space towards goal
                        if (distanceToBall < CONSTANTS.SUPPORT_DISTANCE) {
                            desiredDirection.subVectors(ballPosition, myPosition).normalize();
                            this.actionState = 'SUPPORTING';
                        } else {
                            // Move towards a position ahead of the ball carrier or towards goal
                            var goalX1 = this.teamId === 1 ? CONSTANTS.FIELD_WIDTH / 2 : -CONSTANTS.FIELD_WIDTH / 2;
                            // Target a point generally towards the opponent's goal
                            var targetX = THREE.MathUtils.lerp(myPosition.x, goalX1, 0.2); // Move more decisively towards goal direction
                            // Influence Z position: blend initial lane, ball's Z, and some variation
                            var targetZ = this.initialPosition.z; // Start with their initial lane
                            // Move somewhat towards the ball's current Z-coordinate, but not entirely
                            targetZ = THREE.MathUtils.lerp(targetZ, ballPosition.z, 0.3);
                            // Add some strategic lateral variation based on role or randomness
                            var lateralSpread = this.role === 'FORWARD' ? 5 : 10; // Forwards can be more direct, mids spread more
                            targetZ += (Math.random() - 0.5) * lateralSpread;
                            // Ensure the target is reasonably ahead if they are behind the ball
                            if (this.teamId === 1 && targetX < ballPosition.x || this.teamId === 2 && targetX > ballPosition.x) {
                                targetX = ballPosition.x + (this.teamId === 1 ? 5 : -5); // Get slightly ahead of the ball
                            }
                            var spaceTarget = new THREE.Vector3(targetX, myPosition.y, targetZ);
                            // Clamp to field bounds
                            spaceTarget.x = THREE.MathUtils.clamp(spaceTarget.x, -CONSTANTS.FIELD_WIDTH / 2, CONSTANTS.FIELD_WIDTH / 2);
                            spaceTarget.z = THREE.MathUtils.clamp(spaceTarget.z, -CONSTANTS.FIELD_HEIGHT / 2, CONSTANTS.FIELD_HEIGHT / 2);
                            desiredDirection.subVectors(spaceTarget, myPosition).normalize();
                            this.actionState = 'FINDING_SPACE';
                            targetSpeed *= 0.7; // Move slower when finding space
                        }
                    }
                } else {
                    // --- DEFENDING LOGIC ---
                    // Move towards the ball, but maybe stay between ball and own goal
                    var ownGoalPosition = new THREE.Vector3(this.teamId === 1 ? -CONSTANTS.FIELD_WIDTH / 2 : CONSTANTS.FIELD_WIDTH / 2, 0, 0);
                    var vectorToGoal = new THREE.Vector3().subVectors(ownGoalPosition, ballPosition);
                    var vectorToMe = new THREE.Vector3().subVectors(myPosition, ballPosition);
                    // If I'm further from goal than the ball, move directly towards ball
                    if (vectorToMe.lengthSq() > vectorToGoal.lengthSq()) {
                        desiredDirection.subVectors(ballPosition, myPosition).normalize();
                        this.actionState = 'PRESSING';
                    } else {
                        // Try to get goal-side of the ball, considering initial Z-position
                        var idealDefensivePos = ballPosition.clone().add(vectorToGoal.normalize().multiplyScalar(CONSTANTS.DEFENSIVE_DISTANCE));
                        // Blend the ideal Z position with the player's initial Z position
                        // This encourages players to stay roughly in their assigned vertical lane
                        var targetZ1 = THREE.MathUtils.lerp(idealDefensivePos.z, this.initialPosition.z, CONSTANTS.DEFENSIVE_ZONE_STRENGTH // How strongly they stick to their zone (0=ignore zone, 1=always stay in zone)
                        );
                        var defensivePosition = new THREE.Vector3(idealDefensivePos.x, myPosition.y, targetZ1);
                        // Clamp to field bounds
                        defensivePosition.x = THREE.MathUtils.clamp(defensivePosition.x, -CONSTANTS.FIELD_WIDTH / 2, CONSTANTS.FIELD_WIDTH / 2);
                        defensivePosition.z = THREE.MathUtils.clamp(defensivePosition.z, -CONSTANTS.FIELD_HEIGHT / 2, CONSTANTS.FIELD_HEIGHT / 2);
                        desiredDirection.subVectors(defensivePosition, myPosition).normalize();
                        this.actionState = 'DEFENDING_POSITION';
                        targetSpeed *= 0.8;
                    }
                }
                // --- Movement ---
                // Apply steering behavior (simplified)
                // Calculate desired velocity
                var desiredVelocity = desiredDirection.multiplyScalar(targetSpeed);
                // Calculate steering force (acceleration) towards desired velocity
                var steeringForce = desiredVelocity.clone().sub(this.velocity);
                steeringForce.multiplyScalar(CONSTANTS.PLAYER_ACCELERATION * deltaTime); // Scale by acceleration and time
                // Apply steering force to velocity
                this.velocity.add(steeringForce);
                // Apply damping/friction if not actively accelerating hard
                // This helps players slow down more naturally when not pushing in a direction
                var desiredSpeedSq = desiredVelocity.lengthSq();
                if (desiredSpeedSq < 0.1) {
                    this.velocity.multiplyScalar(1.0 - CONSTANTS.PLAYER_DAMPING * deltaTime);
                }
                // Clamp velocity to the player's current maximum possible speed (targetSpeed)
                if (this.velocity.lengthSq() > targetSpeed * targetSpeed) {
                    this.velocity.normalize().multiplyScalar(targetSpeed);
                }
                // Stop if velocity is very low
                if (this.velocity.lengthSq() < 0.01) {
                    this.velocity.set(0, 0, 0);
                }
                // Apply position update
                this.mesh.position.addScaledVector(this.velocity, deltaTime);
                // Keep player on the field (simple clamp) - Y is fixed
                this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, -CONSTANTS.FIELD_WIDTH / 2, CONSTANTS.FIELD_WIDTH / 2);
                this.mesh.position.z = THREE.MathUtils.clamp(this.mesh.position.z, -CONSTANTS.FIELD_HEIGHT / 2, CONSTANTS.FIELD_HEIGHT / 2);
                this.mesh.position.y = 0; // Ensure player stays on ground plane
                // Smoothly rotate player to face movement direction
                if (this.velocity.lengthSq() > 0.01) {
                    var targetDirection = this.velocity.clone().normalize();
                    // Create a target quaternion representing the desired rotation
                    var targetQuaternion = new THREE.Quaternion();
                    var targetLookAt = this.mesh.position.clone().add(targetDirection);
                    // Use a temporary matrix to get the lookAt quaternion
                    var tempMatrix = new THREE.Matrix4();
                    tempMatrix.lookAt(targetLookAt, this.mesh.position, this.mesh.up);
                    targetQuaternion.setFromRotationMatrix(tempMatrix);
                    // Slerp towards the target quaternion
                    this.mesh.quaternion.slerp(targetQuaternion, CONSTANTS.PLAYER_TURN_SPEED * deltaTime);
                }
            // Prevent players from clustering too tightly (simple repulsion)
            // This needs optimization or simplification for many players
            // const nearbyAllies = allies.filter(p => p !== this && this.mesh.position.distanceTo(p.mesh.position) < CONSTANTS.PLAYER_SEPARATION_DISTANCE);
            // nearbyAllies.forEach(ally => {
            //     const repulsion = new THREE.Vector3().subVectors(this.mesh.position, ally.mesh.position);
            //     repulsion.normalize().multiplyScalar(CONSTANTS.PLAYER_SEPARATION_FORCE * deltaTime);
            //     this.velocity.add(repulsion);
            // });
            // Basic check for ball collision handled by Ball class now
            }
        },
        {
            key: "getClosestOpponentDistance",
            value: function getClosestOpponentDistance(opponents) {
                var _this = this;
                var minDistSq = Infinity;
                opponents.forEach(function(opp) {
                    var distSq = _this.mesh.position.distanceToSquared(opp.mesh.position);
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                    }
                });
                return Math.sqrt(minDistSq);
            }
        },
        {
            key: "tryKick",
            value: function tryKick(ball, kickVector) {
                if (this.hasBall && ball.possessor === this) {
                    console.log("Team ".concat(this.teamId, " Player Kicking!"));
                    ball.kick(kickVector);
                    this.hasBall = false;
                    ball.possessor = null;
                }
            }
        },
        {
            key: "resetPosition",
            value: function resetPosition() {
                this.mesh.position.copy(this.initialPosition);
                this.velocity.set(0, 0, 0);
                this.hasBall = false;
                this.actionState = 'IDLE';
            }
        }
    ]);
    return Player;
}();
export { Player };
