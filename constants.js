// Field Dimensions
export var FIELD_WIDTH = 68; // meters (reduced slightly for better viewing)
export var FIELD_HEIGHT = 105; // meters (length)
export var GOAL_WIDTH = 7.32 * 1.5; // Scaled for visibility
export var GOAL_HEIGHT = 2.44 * 1.5; // Scaled for visibility
export var GOAL_DEPTH = 2;
export var CENTER_CIRCLE_RADIUS = 9.15;
// Player Properties
export var PLAYER_RADIUS = 0.5;
export var PLAYER_HEIGHT = 1.8;
export var PLAYER_MAX_SPEED = 7.0; // m/s (adjust for game speed)
export var PLAYER_ACCELERATION = 15.0; // m/s^2 (how quickly players reach max speed)
export var PLAYER_DAMPING = 3.0; // How quickly players slow down when not accelerating
export var PLAYERS_PER_TEAM = 7; // 7v7
export var PLAYER_SEPARATION_DISTANCE = 2.0; // Min distance between teammates
export var PLAYER_SEPARATION_FORCE = 5.0; // How strongly they push apart
export var PLAYER_TURN_SPEED = 5.0; // Radians per second (how fast they turn)
// Ball Properties
export var BALL_RADIUS = 0.22;
export var BALL_FRICTION = 0.9; // Drag factor per second
export var BALL_COLOR = 0xffffff; // White
export var MAX_KICK_SPEED = 25.0; // m/s
export var PASS_STRENGTH = 15.0; // Speed for a basic pass/kick
export var INITIAL_KICK_STRENGTH = 10.0; // Speed for kickoff
export var TACKLE_BOUNCE_SPEED = 5.0; // Speed ball bounces off a tackler
// Team Properties
export var TEAM1_COLOR = 0xff0000; // Red
export var TEAM2_COLOR = 0x0000ff; // Blue
// AI / Behavior
export var KICK_RANGE = 1.5; // How close player needs to be to ball to potentially kick
export var SUPPORT_DISTANCE = 20.0; // How far attacking players look for ball
export var DEFENSIVE_DISTANCE = 5.0; // How far behind ball defenders try to stay (ideal distance)
export var DEFENSIVE_ZONE_STRENGTH = 0.4; // How much players stick to their initial Z-lane when defending (0-1)
export var POSSESSION_RANGE = PLAYER_RADIUS + BALL_RADIUS + 0.1; // Distance to gain possession
export var PASS_MAX_RANGE = 35.0; // Max distance to look for a pass target
export var PASS_MIN_RANGE = 4.0; // Min distance to attempt a pass (avoid tiny passes)
export var PASS_PROBABILITY = 0.15; // Base chance to pass per update frame if target found (increased slightly)
export var PASS_PRESSURE_DISTANCE = 7.0; // If opponent is closer than this, more likely to pass (increased slightly)
export var SHOOTING_RANGE = 35.0; // Max distance from goal center X-line to attempt a shot
// Visual Indicators
export var AIM_INDICATOR_COLOR = 0xffffff; // White
export var AIM_INDICATOR_LENGTH_SCALE = 0.25; // Multiplier for kick strength to get arrow length
export var AIM_INDICATOR_MIN_LENGTH = 2.0;
export var AIM_INDICATOR_MAX_LENGTH = 8.0;
export var AIM_INDICATOR_HEAD_LENGTH_RATIO = 0.25; // Proportion of arrow length
export var AIM_INDICATOR_HEAD_WIDTH_RATIO = 0.15; // Proportion of arrow length
// Game States
export var GAME_STATE = {
    KICKOFF: 'KICKOFF',
    PLAYING: 'PLAYING',
    GOAL_SCORED: 'GOAL_SCORED',
    PAUSED: 'PAUSED'
};
// Colors
export var FIELD_COLOR = 0x3a7d3a; // Darker Green
// Formations (Positions relative to center field, x=[-1, 1], z=[-1, 1])
// Positive X is towards the right goal (away team goal if homeTeam=true)
// Positive Z is 'up' the field (towards top sideline from center)
export var FORMATION_2_3_1 = {
    name: '2-3-1',
    positions: [
        // Goalkeeper (implicitly center-back) - Not explicitly needed if no specific GK logic
        // { x: -0.9, y: 0, z: 0.0, role: 'GOALKEEPER' }, // We'll omit specific GK for now
        // Defenders (2)
        {
            x: -0.7,
            y: 0,
            z: -0.3,
            role: 'DEFENDER'
        },
        {
            x: -0.7,
            y: 0,
            z: 0.3,
            role: 'DEFENDER'
        },
        // Midfielders (3)
        {
            x: -0.2,
            y: 0,
            z: 0.0,
            role: 'MIDFIELDER'
        },
        {
            x: -0.3,
            y: 0,
            z: -0.6,
            role: 'MIDFIELDER'
        },
        {
            x: -0.3,
            y: 0,
            z: 0.6,
            role: 'MIDFIELDER'
        },
        // Forwards (1 + 1, making it 7 players total)
        {
            x: 0.3,
            y: 0,
            z: -0.2,
            role: 'FORWARD'
        },
        {
            x: 0.3,
            y: 0,
            z: 0.2,
            role: 'FORWARD'
        }
    ]
}; // Add other formations here if needed later
 // export const FORMATION_3_2_1 = { ... }
