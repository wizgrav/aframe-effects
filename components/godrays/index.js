// Ported from the shader in Three.js examples
// with the addition of a separate input pass

AFRAME.registerComponent("godrays", {
    schema: {
        "tint": { type: "color", default: "#FFFFFF" },
        "threshold": { type: "vec4", default: new THREE.Vector4(0,1,1) },
        "src": { type: "selector", default: null },
        "intensity": { default: 1 },
        "filter": { type: "array", default: [] },
        "ratio": { default: 0.25 }
	},

    init: function () {
        this.system = this.el.sceneEl.systems.effects;
        var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
		this.rtFilter = new THREE.WebGLRenderTarget( 1, 1, pars );
        this.rtTextureGodRays1 = new THREE.WebGLRenderTarget( 1, 1, pars );
		this.rtTextureGodRays2 = new THREE.WebGLRenderTarget( 1, 1, pars );
        
        this.exports = {
            filter: {
                includes: ["packing"],
                uniforms: {
                    "tint": { type: "c", value: new THREE.Color() },
                    "threshold": { type: "v2", value: new THREE.Vector2(0,1) },
                },
                depth: true, 
                fragment: [
                    "void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {",
                    "   float v = viewZToOrthographicDepth(perspectiveDepthToViewZ(depth, cameraNear, cameraFar), cameraNear, cameraFar);",
                    "   color.rgb = vec3(smoothstep($threshold.x, $threshold.y, v)) * $tint;",
                    "}"
                ].join( "\n" ),
            },
            blur: {
                uniforms: {
                    step: { type:"f", value: 1.0 },
                    src: { type: "v3", value: new THREE.Vector3( 0.5, 0.5, 0. ) }
                },
                fragment: [
                    "void $main(inout vec4 color, vec4 orig, vec2 uv, float depth) {",
                        "vec2 center = vec2(mix(uvClamp.x, uvClamp.y, $src.x), $src.y);",
                        "vec2 delta = center - uv;",
                        "float dist = length( delta );",
                        "vec2 stepv = $step * delta / dist;",
                        "float iters = dist/$step;",
                        "vec4 col = vec4(0.0);",
                        "if ( 0.0 <= iters && uv.y < 1.0 ) col += textureVR( tDiffuse, uv );",
                        "uv += stepv;",
                        "if ( 1.0 <= iters && uv.y < 1.0 ) col += textureVR( tDiffuse, uv );",
                        "uv += stepv;",
                        "if ( 2.0 <= iters && uv.y < 1.0 ) col += textureVR( tDiffuse, uv );",
                        "uv += stepv;",
                        "if ( 3.0 <= iters && uv.y < 1.0 ) col += textureVR( tDiffuse, uv );",
                        "uv += stepv;",
                        "if ( 4.0 <= iters && uv.y < 1.0 ) col += textureVR( tDiffuse, uv );",
                        "uv += stepv;",
                        "if ( 5.0 <= iters && uv.y < 1.0 ) col += textureVR( tDiffuse, uv );",
                        "color = col/6.0;",
                    "}"

                ].join( "\n" )
            }
        }
        
        this.materialGodraysGenerate = this.system.fuse([this.exports.blur]);
        this.uniforms = {
            "intensity": { type: "f", value: 1 },
            "attenuation": {type: "f", value: 1 },
            "texture": { type: "t", value: this.rtTextureGodRays2 }
	    };

        this.materialFilter = null;
        
        this.needsResize = true;
        this.system.register(this);
    },

    setSize: function (w,h) {
       w = Math.round(w * this.data.ratio);
       h = Math.round(h * this.data.ratio);
       this.rtTextureGodRays1.setSize(w,h);
       this.rtTextureGodRays2.setSize(w,h);
       this.rtFilter.setSize(w,h);
    },

    update: function (oldData) {
        this.exports.filter.uniforms.tint.value.set(this.data.tint);
        this.uniforms.intensity.value = this.data.intensity;
        if(this.data.filter !== oldData.filter) {
            if(this.materialFilter) this.materialFilter.dispose();
            this.materialFilter = this.system.fuse(this.data.filter.length ? this.data.filter : [this.exports.filter]);
        }
        this.bypass = this.data.src === null;
    },

    tock: function () {
        if (!this.system.isActive(this, true)) return;
        var self = this;
        
        this.system.tDiffuse.value = this.system.renderTarget.texture;
        this.system.renderPass(this.materialFilter, this.rtFilter, fn )

        var fn = function (material, camera, eye) {
            var cp3 = new THREE.Vector3(), cd3 = new THREE.Vector3();
            var v3 = self.exports.blur.uniforms[ "src" ].value;
            self.data.src.object3D.getWorldPosition(v3);
            camera.getWorldPosition(cp3);
            camera.getWorldDirection(cd3);
            cp3.sub(v3);
            cp3.normalize();
            cd3.normalize();
            self.uniforms.attenuation.value = Math.pow(Math.max(0, -cd3.dot(cp3)), 1.33);
            
            v3.project( camera );
            v3.set((v3.x + 1 ) / 2, (v3.y + 1 ) / 2, 0);
            
        };

        var filterLen = 1.0;
		var TAPS_PER_PASS = 6.0;
        
        var pass = 1.0;
        var stepLen = filterLen * Math.pow( TAPS_PER_PASS, -pass );
        this.exports.blur.uniforms[ "step" ].value = stepLen;
        this.system[ "tDiffuse" ].value = this.rtFilter.texture;
        this.system.renderPass(this.materialGodraysGenerate, this.rtTextureGodRays2, fn )
        
        pass = 2.0;
        stepLen = filterLen * Math.pow( TAPS_PER_PASS, -pass );
        this.exports.blur.uniforms[ "step" ].value = stepLen;
        this.system[ "tDiffuse" ].value = this.rtTextureGodRays2.texture;
        this.system.renderPass(this.materialGodraysGenerate, this.rtTextureGodRays1, fn );
        
        pass = 3.0;
        stepLen = filterLen * Math.pow( TAPS_PER_PASS, -pass );
        this.exports.blur.uniforms[ "step" ].value = stepLen;
        this.system[ "tDiffuse" ].value = this.rtTextureGodRays1.texture;
        this.system.renderPass(this.materialGodraysGenerate, this.rtTextureGodRays2, fn )
    },

    remove: function () {
        this.rtTextureGodRays1.dispose();
        this.rtTextureGodRays2.dispose();
        this.rtFilter.dispose();

        this.materialGodraysGenerate.dispose();
        this.materialFilter.dispose();
        this.system.unregister(this);
    },

    diffuse: true,

    fragment: [
        "float $blendScreen(float base, float blend) {",
        "    return 1.0-((1.0-base)*(1.0-blend));",
        "}",

        "vec3 $blendScreen(vec3 base, vec3 blend) {",
        "    return vec3($blendScreen(base.r,blend.r),$blendScreen(base.g,blend.g),$blendScreen(base.b,blend.b));",
        "}",

        "vec3 $blendScreen(vec3 base, vec3 blend, float opacity) {",
	    "    return ($blendScreen(base, blend) * opacity + base * (1.0 - opacity));",
        "}",

		"void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {",
		"   vec4 texel = texture2D($texture, uv);",
        "   color.rgb = $blendScreen( color.rgb, texel.rgb, $intensity * $attenuation);",
        "}"
	].join( "\n" )
});