import * as THREE from 'three';
import * as CONSTANTS from './constants.js';

// Role-based tactical offsets and shape parameters for realistic team play
const ROLE_TACTICS = {
    DEFENDER: {
        attackDepth: -14,
        defendDepth: -10,
        widthScale: 1.0,
        maxLooseBallChasers: 0
    },
    MIDFIELDER: {
        attackDepth: 2,
        defendDepth: -4,
        widthScale: 1.1,
        maxLooseBallChasers: 1
    },
    FORWARD: {
        attackDepth: 14,
        defendDepth: 6,
        widthScale: 0.85,
        maxLooseBallChasers: 1
    }
};

export class TeamTactics {
    // Compute tactical targets and loose-ball assignments for the whole team
    static compute(team, ball, hasPossession) {
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

        // Formation anchor shifts with the ball but stays compact when defending
        let anchorX;
        if (phase === 'ATTACK') {
            anchorX = ballPosition.x + attackDir * CONSTANTS.TACTICAL_ATTACK_PUSH;
        } else if (phase === 'DEFEND') {
            anchorX = THREE.MathUtils.lerp(
                ballPosition.x - attackDir * CONSTANTS.DEFENSIVE_DISTANCE,
                ownGoalX + attackDir * CONSTANTS.TACTICAL_DEFENSIVE_LINE,
                CONSTANTS.TACTICAL_COMPACTNESS
            );
        } else {
            anchorX = THREE.MathUtils.lerp(
                ballPosition.x,
                ownGoalX + attackDir * CONSTANTS.TACTICAL_DEFENSIVE_LINE,
                0.35
            );
        }

        const anchorZ = THREE.MathUtils.lerp(0, ballPosition.z, CONSTANTS.TACTICAL_VERTICAL_FOLLOW);
        const targets = new Map();
        const chasers = new Set();

        team.players.forEach((player) => {
            const roleTactic = ROLE_TACTICS[player.role] || ROLE_TACTICS.MIDFIELDER;
            const depth = phase === 'ATTACK' ? roleTactic.attackDepth : roleTactic.defendDepth;
            const offset = player.formationOffset;

            const targetX = anchorX + attackDir * depth + offset.x * halfWidth * 0.45;
            const targetZ = anchorZ + offset.z * halfHeight * roleTactic.widthScale;

            const tacticalTarget = new THREE.Vector3(
                THREE.MathUtils.clamp(targetX, -CONSTANTS.FIELD_WIDTH / 2, CONSTANTS.FIELD_WIDTH / 2),
                0,
                THREE.MathUtils.clamp(targetZ, -CONSTANTS.FIELD_HEIGHT / 2, CONSTANTS.FIELD_HEIGHT / 2)
            );

            targets.set(player, tacticalTarget);
        });

        // Only assign a small number of role-appropriate players to chase loose balls
        if (!ball.possessor) {
            const candidates = team.players
                .map((player) => ({
                    player,
                    distance: player.mesh.position.distanceTo(ballPosition)
                }))
                .filter((entry) => entry.distance < CONSTANTS.CHASE_LOOSE_BALL_RANGE)
                .sort((a, b) => a.distance - b.distance);

            const ballIsSlow = ball.velocity.lengthSq() < CONSTANTS.TACTICAL_STATIONARY_BALL_SPEED_SQ;
            const chaserLimit = ballIsSlow
                ? CONSTANTS.TACTICAL_MAX_LOOSE_BALL_CHASERS + 1
                : CONSTANTS.TACTICAL_MAX_LOOSE_BALL_CHASERS;

            const roleOrder = ['MIDFIELDER', 'FORWARD', 'DEFENDER'];
            roleOrder.forEach((role) => {
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

        return { phase, targets, chasers };
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
