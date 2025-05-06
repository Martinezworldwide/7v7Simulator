import * as THREE from 'three';
import * as CONSTANTS from './constants.js';

export class Ball {
    constructor() {
        const geometry = new THREE.SphereGeometry(CONSTANTS.BALL_RADIUS, 16, 16);
        const material = new THREE.MeshLambertMaterial({
            color: CONSTANTS.BALL_COLOR
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, CONSTANTS.BALL_RADIUS, 0); // Start slightly above ground
        this.mesh.castShadow = true;
        this.velocity = new THREE.Vector3();
        this.possessor = null; // The player currently controlling the ball
    }

    update(deltaTime, players, game) {
        if (this.possessor) {
            // If possessed, stick to the player slightly ahead of them
            const playerPos = this.possessor.mesh.position;
            const playerDir = new THREE.Vector3();
            this.possessor.mesh.getWorldDirection(playerDir); // Get direction player is facing
            
            // Offset based on player facing direction
            const offsetDistance = CONSTANTS.PLAYER_RADIUS + CONSTANTS.BALL_RADIUS + 0.1; // Adjust offset as needed
            const ballOffset = playerDir.multiplyScalar(offsetDistance);
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
            
            // Check for collision with players
            this.checkPlayerCollision(players);
        }
    }

    checkPlayerCollision(players) {
        const collisionThreshold = CONSTANTS.PLAYER_RADIUS + CONSTANTS.BALL_RADIUS;
        const collisionThresholdSq = collisionThreshold * collisionThreshold;

        for (const player of players) {
            if (this.possessor === player) continue; // Don't collide with possessor
            
            const distanceSq = this.mesh.position.distanceToSquared(player.mesh.position);
            if (distanceSq < collisionThresholdSq) {
                // --- Collision occurred ---
                // If ball was free, player now possesses it
                if (!this.possessor) {
                    console.log(`Player from Team ${player.teamId} took possession!`);
                    this.possessor = player;
                    player.hasBall = true;
                    this.velocity.set(0, 0, 0); // Stop ball movement
                    break; // Only one player can gain possession per frame
                } else if (this.possessor && this.possessor.teamId !== player.teamId) {
                    console.log(`Tackle/Deflection by Team ${player.teamId}!`);
                    const bounceDirection = new THREE.Vector3()
                        .subVectors(this.mesh.position, player.mesh.position)
                        .normalize();
                    const currentSpeed = this.velocity.length(); // Speed before collision
                    const newSpeed = Math.max(currentSpeed * 0.5, CONSTANTS.TACKLE_BOUNCE_SPEED); // Bounce speed
                    
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
    }

    kick(forceVector) {
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

    reset() {
        this.mesh.position.set(0, CONSTANTS.BALL_RADIUS, 0);
        this.velocity.set(0, 0, 0);
        if (this.possessor) {
            this.possessor.hasBall = false;
        }
        this.possessor = null;
    }
}
