import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { getTacticalStyle } from './TacticalStyles.js';

export class TeamTactics {
    // Compute tactical targets and loose-ball assignments for the whole team
    static compute(team, ball, hasPossession, opponents = []) {
        // Offside line = position of the second-last opponent (keeper + one
        // defender is the usual case). Attacking runs are timed to stay onside.
        let offsideLineX = null;
        if (opponents.length >= 2) {
            const xs = opponents.map((o) => o.mesh.position.x).sort((a, b) => a - b);
            offsideLineX = team.homeTeam ? xs[xs.length - 2] : xs[1];
        }
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

        let anchorZL = THREE.MathUtils.lerp(0, ballPosition.z, Math.min(0.95, style.verticalFollow + 0.25));
        // Smooth the anchor: real teams shift as a unit over a second or two,
        // they do not teleport their shape every time the ball moves. Without
        // this, every target jumps constantly and players sprint forever
        if (!team._smoothAnchor) team._smoothAnchor = { x: anchorX, z: anchorZL };
        team._smoothAnchor.x = THREE.MathUtils.lerp(team._smoothAnchor.x, anchorX, 0.02);
        team._smoothAnchor.z = THREE.MathUtils.lerp(team._smoothAnchor.z, anchorZL, 0.02);
        anchorX = team._smoothAnchor.x;
        const anchorZ = team._smoothAnchor.z;
        const targets = new Map();
        const chasers = new Set();
        const roleDepths = phase === 'ATTACK' ? style.roleDepthAttack : style.roleDepthDefend;

        team.players.forEach((player) => {
            let depth = roleDepths[player.role] ?? roleDepths.MIDFIELDER;
            // Compactness is a phase behaviour: out of possession the lines
            // squeeze together, in possession they stretch the pitch
            if (phase === 'DEFEND') depth *= 0.8;
            if (phase === 'ATTACK') depth *= 1.08;
            const offset = player.formationOffset;
            const roleWidthScale = player.role === 'FORWARD' ? style.widthScale * 0.9 : style.widthScale;

            const targetX = anchorX + attackDir * depth + offset.x * halfWidth * 0.45;
            let targetZ = anchorZ + offset.z * halfHeight * roleWidthScale * (phase === 'DEFEND' ? 0.78 : phase === 'ATTACK' ? 1.08 : 1);

            // Far-side tuck: when the ball is on the opposite flank, far-side
            // players narrow toward the middle instead of hugging their
            // touchline - this is what keeps a real block compact
            if (Math.abs(ballPosition.z) > 8 && Math.sign(targetZ) === -Math.sign(ballPosition.z) && Math.abs(targetZ) > 6) {
                targetZ *= 0.72;
            }

            // Timed runs: when attacking, don't camp beyond the offside line
            let clampedX = targetX;
            if (phase === 'ATTACK' && offsideLineX !== null && player.role !== 'GOALKEEPER') {
                if (team.homeTeam) {
                    clampedX = Math.min(clampedX, Math.max(offsideLineX, ballPosition.x) - 0.5);
                } else {
                    clampedX = Math.max(clampedX, Math.min(offsideLineX, ballPosition.x) + 0.5);
                }
            }

            // Build-up shape: with the ball in our own third, defenders split
            // wide and drop to offer the keeper and each other real outlets
            let finalX = clampedX;
            if (phase === 'ATTACK' && player.role === 'DEFENDER' && Math.abs(ballPosition.x - ownGoalX) < CONSTANTS.FIELD_WIDTH / 3) {
                targetZ *= 1.3;
                finalX = THREE.MathUtils.lerp(finalX, ownGoalX + attackDir * 9, 0.4);
            }

            const tacticalTarget = new THREE.Vector3(
                THREE.MathUtils.clamp(finalX, -CONSTANTS.FIELD_WIDTH / 2, CONSTANTS.FIELD_WIDTH / 2),
                0,
                THREE.MathUtils.clamp(targetZ, -CONSTANTS.FIELD_HEIGHT / 2, CONSTANTS.FIELD_HEIGHT / 2)
            );

            // Hysteresis: if the new spot is barely different from the one
            // the player is already heading to, keep the old one - real
            // players do not micro-adjust their position every half second
            if (player.targetPosition && player.targetPosition.distanceTo(tacticalTarget) < 2) {
                targets.set(player, player.targetPosition.clone());
            } else {
                player.targetPosition.copy(tacticalTarget);
                targets.set(player, tacticalTarget);
            }
        });

        // Support angles: the two nearest teammates offer the carrier a
        // triangle - one ahead-side, one behind-side - instead of everyone
        // standing in formation spots hoping for the ball
        if (phase === 'ATTACK' && ball.possessor && ball.possessor.teamId === team.id) {
            const carrier = ball.possessor;
            const supporters = team.players
                .filter((pl) => pl !== carrier && pl.role !== 'GOALKEEPER')
                .sort((a, b) => a.mesh.position.distanceTo(ballPosition) - b.mesh.position.distanceTo(ballPosition))
                .slice(0, 2);
            supporters.forEach((pl, i) => {
                const side = i === 0 ? 1 : -1;
                let sz = ballPosition.z + side * 8;
                if (sz > CONSTANTS.FIELD_HEIGHT / 2 - 3) sz = ballPosition.z - 8;
                if (sz < -CONSTANTS.FIELD_HEIGHT / 2 + 3) sz = ballPosition.z + 8;
                let sx = ballPosition.x + attackDir * (i === 0 ? 3 : -4);
                if (offsideLineX !== null) {
                    if (team.homeTeam) sx = Math.min(sx, Math.max(offsideLineX, ballPosition.x) - 0.5);
                    else sx = Math.max(sx, Math.min(offsideLineX, ballPosition.x) + 0.5);
                }
                targets.set(pl, new THREE.Vector3(
                    THREE.MathUtils.clamp(sx, -CONSTANTS.FIELD_WIDTH / 2, CONSTANTS.FIELD_WIDTH / 2),
                    0,
                    THREE.MathUtils.clamp(sz, -CONSTANTS.FIELD_HEIGHT / 2, CONSTANTS.FIELD_HEIGHT / 2)
                ));
            });
        }

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

            if (ball.lastTouchTeamId && ball.lastTouchTeamId !== team.id) {
                const interceptor = candidates.find((entry) => entry.player.role === 'DEFENDER' || entry.player.role === 'MIDFIELDER');
                if (interceptor && chasers.size < chaserLimit) chasers.add(interceptor.player);
            }

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
