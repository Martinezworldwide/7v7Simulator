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
var Field = /*#__PURE__*/ function() {
    "use strict";
    function Field() {
        _class_call_check(this, Field);
        this.mesh = new THREE.Group();
        // Main Field Plane
        var fieldGeometry = new THREE.PlaneGeometry(CONSTANTS.FIELD_WIDTH, CONSTANTS.FIELD_HEIGHT);
        var fieldMaterial = new THREE.MeshLambertMaterial({
            color: CONSTANTS.FIELD_COLOR,
            side: THREE.DoubleSide
        });
        var fieldPlane = new THREE.Mesh(fieldGeometry, fieldMaterial);
        fieldPlane.rotation.x = -Math.PI / 2; // Rotate to lay flat
        fieldPlane.receiveShadow = true;
        this.mesh.add(fieldPlane);
        // Field Lines Material
        var lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 2
        }); // Linewidth might not work on all systems
        // Helper to create lines
        var createLine = function(points) {
            var geometry = new THREE.BufferGeometry().setFromPoints(points);
            return new THREE.Line(geometry, lineMaterial);
        };
        var yOffset = 0.01; // Slightly above the field plane
        // Boundary Lines
        var boundaryPoints = [
            new THREE.Vector3(-CONSTANTS.FIELD_WIDTH / 2, yOffset, -CONSTANTS.FIELD_HEIGHT / 2),
            new THREE.Vector3(CONSTANTS.FIELD_WIDTH / 2, yOffset, -CONSTANTS.FIELD_HEIGHT / 2),
            new THREE.Vector3(CONSTANTS.FIELD_WIDTH / 2, yOffset, CONSTANTS.FIELD_HEIGHT / 2),
            new THREE.Vector3(-CONSTANTS.FIELD_WIDTH / 2, yOffset, CONSTANTS.FIELD_HEIGHT / 2),
            new THREE.Vector3(-CONSTANTS.FIELD_WIDTH / 2, yOffset, -CONSTANTS.FIELD_HEIGHT / 2)
        ];
        this.mesh.add(createLine(boundaryPoints));
        // Center Line
        var centerLinePoints = [
            new THREE.Vector3(0, yOffset, -CONSTANTS.FIELD_HEIGHT / 2),
            new THREE.Vector3(0, yOffset, CONSTANTS.FIELD_HEIGHT / 2)
        ];
        this.mesh.add(createLine(centerLinePoints));
        // Center Circle
        var centerCircleGeometry = new THREE.RingGeometry(CONSTANTS.CENTER_CIRCLE_RADIUS - 0.1, CONSTANTS.CENTER_CIRCLE_RADIUS, 64 // segments
        );
        var centerCircleMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        var centerCircle = new THREE.Mesh(centerCircleGeometry, centerCircleMaterial);
        centerCircle.rotation.x = -Math.PI / 2;
        centerCircle.position.y = yOffset;
        this.mesh.add(centerCircle);
        // --- Goals ---
        this.goal1 = this.createGoal(-CONSTANTS.FIELD_WIDTH / 2); // Left goal
        this.goal2 = this.createGoal(CONSTANTS.FIELD_WIDTH / 2); // Right goal
    }
    _create_class(Field, [
        {
            key: "createGoal",
            value: function createGoal(xPosition) {
                var goal = new THREE.Group();
                var postMaterial = new THREE.MeshBasicMaterial({
                    color: 0xcccccc
                });
                var postRadius = 0.1;
                var postHeight = CONSTANTS.GOAL_HEIGHT;
                // Back Posts
                var backPostGeom = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 8);
                var backPost1 = new THREE.Mesh(backPostGeom, postMaterial);
                backPost1.position.set(xPosition, postHeight / 2, -CONSTANTS.GOAL_WIDTH / 2);
                goal.add(backPost1);
                var backPost2 = new THREE.Mesh(backPostGeom, postMaterial);
                backPost2.position.set(xPosition, postHeight / 2, CONSTANTS.GOAL_WIDTH / 2);
                goal.add(backPost2);
                // Top Bar
                var topBarGeom = new THREE.BoxGeometry(CONSTANTS.GOAL_DEPTH, postRadius * 2, CONSTANTS.GOAL_WIDTH);
                var topBar = new THREE.Mesh(topBarGeom, postMaterial);
                topBar.position.set(xPosition + (xPosition > 0 ? -CONSTANTS.GOAL_DEPTH / 2 : CONSTANTS.GOAL_DEPTH / 2), postHeight - postRadius, 0);
                goal.add(topBar);
                // Net Material
                var netMeshMaterial = new THREE.MeshBasicMaterial({
                    color: 0xcccccc,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.5
                });
                var goalDepthDir = xPosition > 0 ? -1 : 1; // Direction goal extends from goal line (-1 for right goal, +1 for left goal)
                var topBarY = postHeight - postRadius; // Y position of the center of the topBar
                // Back Net
                var backNetGeo = new THREE.PlaneGeometry(CONSTANTS.GOAL_WIDTH, postHeight);
                var backNet = new THREE.Mesh(backNetGeo, netMeshMaterial);
                backNet.position.set(xPosition + goalDepthDir * CONSTANTS.GOAL_DEPTH, postHeight / 2, 0 // Centered along the goal line's Z
                );
                backNet.rotation.y = Math.PI / 2; // Rotate to face the field
                goal.add(backNet);
                // Side Nets
                var sideNetGeo = new THREE.PlaneGeometry(CONSTANTS.GOAL_DEPTH, postHeight);
                var leftSideNet = new THREE.Mesh(sideNetGeo, netMeshMaterial);
                leftSideNet.position.set(xPosition + goalDepthDir * CONSTANTS.GOAL_DEPTH / 2, postHeight / 2, -CONSTANTS.GOAL_WIDTH / 2 // Positioned at the side of the goal
                );
                goal.add(leftSideNet);
                var rightSideNet = new THREE.Mesh(sideNetGeo, netMeshMaterial);
                rightSideNet.position.set(xPosition + goalDepthDir * CONSTANTS.GOAL_DEPTH / 2, postHeight / 2, CONSTANTS.GOAL_WIDTH / 2 // Positioned at the other side of the goal
                );
                goal.add(rightSideNet);
                // Top Net (Roof)
                var topNetGeo = new THREE.PlaneGeometry(CONSTANTS.GOAL_WIDTH, CONSTANTS.GOAL_DEPTH); // Width along goal line, Height as goal depth
                var topNet = new THREE.Mesh(topNetGeo, netMeshMaterial);
                topNet.position.set(xPosition + goalDepthDir * CONSTANTS.GOAL_DEPTH / 2, topBarY, 0 // Centered along the goal line's Z
                );
                topNet.rotation.x = -Math.PI / 2; // Rotate to lay flat, normal pointing upwards
                goal.add(topNet);
                // The goal group itself remains at (0,0,0) in the scene.
                // Its children (posts, topBar, nets) are positioned using world coordinates based on xPosition.
                return goal;
            }
        }
    ]);
    return Field;
}();
export { Field };
