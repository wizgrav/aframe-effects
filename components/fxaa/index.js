// Uses matdesl's three-fxaa-shader

var FXAAShader = require('../../lib/shaders/FXAAShader');

AFRAME.registerComponent("fxaa", {
    schema: { default: true },

    init: function () {
        this.system = this.el.sceneEl.systems.effects;
        this.material = new THREE.ShaderMaterial({
            fragmentShader: FXAAShader.fragmentShader,
            vertexShader: FXAAShader.vertexShader,
            uniforms: {
                tDiffuse: this.system.tDiffuse,
                resolution: { type: 'v2', value: new THREE.Vector2() }
            }
        });
        this.system.register(this);
        this.needsResize = true;
    },

    update: function () {
        this.bypass = !this.data;
    },

    setSize: function (w, h) {
        this.material.uniforms.resolution.value.set(w, h);
    },

    resize: true,

    remove: function () {
        this.material.dispose();
        this.system.unregister(this);
    }
});