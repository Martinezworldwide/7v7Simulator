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
var SceneSetup = /*#__PURE__*/ function() {
    "use strict";
    function SceneSetup(renderDiv) {
        _class_call_check(this, SceneSetup);
        this.renderDiv = renderDiv;
        var width = this.renderDiv.clientWidth;
        var height = this.renderDiv.clientHeight;
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x55aa55); // Greenish background
        // Camera (Orthographic for top-down view)
        var aspect = width / height;
        var viewSize = CONSTANTS.FIELD_HEIGHT * 1.1; // Adjust zoom level based on field height
        this.camera = new THREE.OrthographicCamera(-aspect * viewSize / 2, aspect * viewSize / 2, viewSize / 2, -viewSize / 2, 1, 1000);
        this.camera.position.set(0, 50, 0); // Position directly above the center
        this.camera.lookAt(0, 0, 0); // Look down at the center of the field
        this.scene.add(this.camera);
        // Lighting
        var ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        var directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 50, 30);
        directionalLight.castShadow = false; // Shadows can be expensive
        this.scene.add(directionalLight);
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // this.renderer.shadowMap.enabled = true; // Keep shadows off for performance in sim
        this.renderDiv.appendChild(this.renderer.domElement);
        // Handle Resize
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }
    _create_class(SceneSetup, [
        {
            key: "onWindowResize",
            value: function onWindowResize() {
                var width = this.renderDiv.clientWidth;
                var height = this.renderDiv.clientHeight;
                var aspect = width / height;
                var viewSize = CONSTANTS.FIELD_HEIGHT * 1.1;
                this.camera.left = -aspect * viewSize / 2;
                this.camera.right = aspect * viewSize / 2;
                this.camera.top = viewSize / 2;
                this.camera.bottom = -viewSize / 2;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(width, height);
            }
        }
    ]);
    return SceneSetup;
}();
export { SceneSetup };
