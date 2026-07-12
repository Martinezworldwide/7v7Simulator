import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { getTacticalStyle } from './TacticalStyles.js';

export class TeamTactics {
    // Compute tactical targets and loose-ball assignments for the whole team
    static compute(team, ball, hasPossession) {
        const style = team.getTacticalStyleConfig();
        const ballPosition = ball.mesh.position;
        const attackDir = team.homeTeam ? 1 : -1;
        const ownGoalX = team.homeTeam ? -CONSTANTS.FIELD_WIDTH / 2 : CONSTANTS.FIELD_WIDTH / 2;
        const halfWidth = CONSTANTS.FIELD_WIDTH / 2 * 0.8;
        const halfHeight = CONSTANTS.FIELD_HEIGHT / 2 * 0.8;

        // Determine whether the team is attacking, defending, or contesting a loose ball
        let phase = 'NEUTRAL';
        if (hasPossession) {
            phase = 'ATTACK';
        } else if (ball.possessor && ball.possessor.teamId !== team.id) {
            phase = 'DEFEND';
        }

        // Formation anchor shifts with the ball and the selected tactical style
        let anchorX;
        if (phase === 'ATTACK') {
            anchorX = ballPosition.x + attackDir * style.attackPush;
        } else if (phase === 'DEFEND') {
            anchorX = THREE.MathUtils.lerp(
                ballPosition.x - attackDir * CONSTANTS.DEFENSIVE_DISTANCE,
                ownGoalX + attackDir * style.defensiveLine,
                style.compactness
            );
        } else {
            anchorX = THREE.MathUtils.lerp(
                ballPosition.x,
                ownGoalX + attackDir * style.defensiveLine,
                style.compactness * 0.75
            );
        }

        const anchorZ = THREE.MathUtils.lerp(0, ballPosition.z, style.verticalFollow);
        const targets = new Map();
        const chasers = new Set();
        const roleDepths = phase === 'ATTACK' ? style.roleDepthAttack : style.roleDepthDefend;

        team.players.forEach((player) => {
            const depth = roleDepths[player.role] ?? roleDepths.MIDFIELDER;
            const offset = player.formationOffset;
            const roleWidthScale = player.role === 'FORWARD' ? style.widthScale * 0.9 : style.widthScale;

            const targetX = anchorX + attackDir * depth + offset.x * halfWidth * 0.45;
            const targetZ = anchorZ + offset.z * halfHeight * roleWidthScale;

            const tacticalTarget = new THREE.Vector3(
                THREE.MathUtils.clamp(targetX, -CONSTANTS.FIELD_WIDTH / 2, CONSTANTS.FIELD_WIDTH / 2),
                0,
                THREE.MathUtils.clamp(targetZ, -CONSTANTS.FIELD_HEIGHT / 2, CONSTANTS.FIELD_HEIGHT / 2)
            );

            targets.set(player, tacticalTarget);
        });

        // Assign chasers based on tactical style (gegenpress swarms, low block stays disciplined)
        if (!ball.possessor) {
            const candidates = team.players
                .map((player) => ({
                    player,
                    distance: player.mesh.position.distanceTo(ballPosition)
                }))
                .filter((entry) => entry.distance < CONSTANTS.CHASE_LOOSE_BALL_RANGE)
                .sort((a, b) => a.distance - b.distance);

            const ballIsSlow = ball.velocity.lengthSq() < CONSTANTS.TACTICAL_STATIONARY_BALL_SPEED_SQ;
            const chaserLimit = ballIsSlow ? style.maxChasers + 1 : style.maxChasers;

            style.chaserRoles.forEach((role) => {
                if (chasers.size >= chaserLimit) return;
                const match = candidates.find((entry) => entry.player.role === role && !chasers.has(entry.player));
                if (match) chasers.add(match.player);
            });

            // Guarantee at least one contestant so play never freezes again
            if (chasers.size === 0 && candidates.length > 0) {
                chasers.add(candidates[0].player);
            }

            // When the ball is nearly stopped, let the closest player finish the duel
            if (ballIsSlow && candidates.length > 0 && !chasers.has(candidates[0].player)) {
                if (chasers.size >= chaserLimit) {
                    const farthest = [...chasers].sort(
                        (a, b) => b.mesh.position.distanceTo(ballPosition) - a.mesh.position.distanceTo(ballPosition)
                    )[0];
                    chasers.delete(farthest);
                }
                chasers.add(candidates[0].player);
            }
        }

        return { phase, style, targets, chasers };
    }

    // Move toward a tactical point with safe normalization
    static directionToward(fromPosition, toPosition, outDirection) {
        outDirection.subVectors(toPosition, fromPosition);
        if (outDirection.lengthSq() > 0.0001) {
            outDirection.normalize();
            return true;
        }
        outDirection.set(0, 0, 0);
        return false;
    }
}
