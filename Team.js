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
import { Player } from './Player.js';
import * as CONSTANTS from './constants.js';
var Team = /*#__PURE__*/ function() {
    "use strict";
    function Team(id, color, formation) {
        var homeTeam = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : true;
        _class_call_check(this, Team);
        this.id = id;
        this.color = color;
        this.players = [];
        this.formation = formation; // e.g., FORMATION_2_3_1
        this.homeTeam = homeTeam; // True = starts on left (-x), False = starts on right (+x)
        this.setupPlayers();
    }
    _create_class(Team, [
        {
            key: "setupPlayers",
            value: function setupPlayers() {
                var _this = this;
                this.formation.positions.forEach(function(posData, index) {
                    var basePosition = new THREE.Vector3(posData.x, 0, posData.z);
                    // Mirror position for away team
                    var initialX = _this.homeTeam ? basePosition.x : -basePosition.x;
                    var initialZ = _this.homeTeam ? basePosition.z : -basePosition.z; // Also mirror Z for intuitive formation setup
                    var position = new THREE.Vector3(initialX, 0, initialZ);
                    // Scale position based on field dimensions from [-1, 1] range to field coords
                    position.x *= CONSTANTS.FIELD_WIDTH / 2 * 0.8; // Place slightly within half
                    position.z *= CONSTANTS.FIELD_HEIGHT / 2 * 0.8;
                    var player = new Player(_this.id, _this.color, position, posData.role);
                    _this.players.push(player);
                });
                if (this.players.length !== CONSTANTS.PLAYERS_PER_TEAM) {
                    console.warn("Team ".concat(this.id, " formation has ").concat(this.players.length, " players, expected ").concat(CONSTANTS.PLAYERS_PER_TEAM));
                }
            }
        },
        {
            // Note: Added 'game' parameter and 'originalDeltaTime' to pass down to players
            key: "update",
            value: function update(deltaTime, originalDeltaTime, ball, hasPossession, opponents, game) {
                var allies = this.players;
                this.players.forEach(function(player) {
                    // Pass 'game' and 'originalDeltaTime' down
                    player.update(deltaTime, originalDeltaTime, ball, hasPossession, opponents, game);
                });
            }
        },
        {
            key: "resetPositions",
            value: function resetPositions() {
                var _this = this;
                // Use the original logic to recalculate based on home/away status
                this.formation.positions.forEach(function(posData, index) {
                    var basePosition = new THREE.Vector3(posData.x, 0, posData.z);
                    var initialX = _this.homeTeam ? basePosition.x : -basePosition.x;
                    var initialZ = _this.homeTeam ? basePosition.z : -basePosition.z;
                    var position = new THREE.Vector3(initialX, 0, initialZ);
                    position.x *= CONSTANTS.FIELD_WIDTH / 2 * 0.8;
                    position.z *= CONSTANTS.FIELD_HEIGHT / 2 * 0.8;
                    if (_this.players[index]) {
                        _this.players[index].initialPosition.copy(position); // Update initial pos reference
                        _this.players[index].resetPosition(); // Reset player state and mesh position
                    }
                });
            }
        }
    ]);
    return Team;
}();
export { Team };
