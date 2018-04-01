var SAOShader = require("../../lib/shaders/SAOShader");
var DepthLimitedBlurShader = require("../../lib/shaders/DepthLimitedBlurShader");

AFRAME.registerComponent("ssao", {
    schema: {
        "samples": { type: "number", default: 16},
        "rings": { type: "number", default: 7 },
        "radius": { type: "number", default: 0.5 },
        "ratio": { default: 0.5 },
        "intensity": { default: 1.0 },
        "maxDepth": { default: 0.99 },
        "bias": { default: 0.05 },
        "scale": { default: 0.15 },
        "blurRadius": { default: 7 },
        "depthCutoff":  { default: 10 }
	},

    init: function () {
        this.system = this.el.sceneEl.systems.effects;
        var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
        this.renderTargets = [];
		this.renderTargets.push(new THREE.WebGLRenderTarget( 1, 1, pars));
		this.renderTargets.push(new THREE.WebGLRenderTarget( 1, 1, pars));	
        this.uniforms = {
            "texture": { type: "t", value: this.renderTargets[0].texture },
            "intensity": { type: "f", value: 1.0 },
            "maxDepth": { type: "f", value: 0.99 },
            "depthCutoff": { type: "f", default: 1}
	    };
        this.SAOMaterial = null;
        this.hBlurMaterial = null;
        this.vBlurMaterial = null;
        this.sizeUniform = { type: "v2", value: new THREE.Vector2()};
        this.system.register(this);
    },

    update: function (od) {
        var d = this.data, self=this;

        this.rebuild(d.rings !== od.rings || d.samples !== od.samples, d.blurRadius !== od.blurRadius);
        this.uniforms.depthCutoff.value = d.depthCutoff;
        this.uniforms.intensity.value = d.intensity;
        this.uniforms.maxDepth.value = d.maxDepth;
        this.SAOMaterial.uniforms.bias.value = d.bias;
        this.SAOMaterial.uniforms.scale.value = d.scale;
        this.SAOMaterial.uniforms.kernelRadius.value = d.radius;
        this.hBlurMaterial.uniforms.depthCutoff.value = d.depthCutoff;
        this.vBlurMaterial.uniforms.depthCutoff.value = d.depthCutoff;
    },

    rebuild: function (sao, blur) {
        var d = this.data;
        if(sao) {
            if (this.SAOMaterial) {
                this.SAOMaterial.dispose();
            }
            this.SAOMaterial = this.system.materialize(SAOShader(true));
			this.SAOMaterial.defines["RINGS"] = parseInt(d.rings) + ".";
			this.SAOMaterial.defines["SAMPLES"] = parseInt(d.samples) + ".";
			this.SAOMaterial.uniforms.cameraFar = this.system.cameraFar;
            this.SAOMaterial.uniforms.cameraNear = this.system.cameraNear;
        }
        if(blur) {
            if (this.hBlurMaterial) {
                this.hBlurMaterial.dispose();
                this.vBlurMaterial.dispose();
            }
            this.hBlurMaterial = this.system.materialize(DepthLimitedBlurShader(d.blurRadius, d.blurRadius/2, new THREE.Vector2(1,0)));
            this.vBlurMaterial = this.system.materialize(DepthLimitedBlurShader(d.blurRadius, d.blurRadius/2, new THREE.Vector2(0,1)));
            this.hBlurMaterial.uniforms.size = this.sizeUniform;
            this.vBlurMaterial.uniforms.size = this.sizeUniform;
            this.hBlurMaterial.uniforms.cameraFar = this.system.cameraFar;
            this.hBlurMaterial.uniforms.cameraNear = this.system.cameraNear;
            this.vBlurMaterial.uniforms.cameraFar = this.system.cameraFar;
            this.vBlurMaterial.uniforms.cameraNear = this.system.cameraNear;
        }
    },

    setSize: function(w, h) {
        w = Math.ceil(w * this.data.ratio);
        h = Math.ceil(h * this.data.ratio);
        
        this.sizeUniform.value.set(w,h);

        this.renderTargets.forEach(function (rt) {
            rt.setSize(w,h);
        });
    },

    tock: function (time) {
        if (!this.system.isActive(this, true)) return;
        //this.SAOMaterial.uniforms.randomSeed.value = Math.random();
        this.SAOMaterial.uniforms[ 'cameraInverseProjectionMatrix' ].value.getInverse( this.el.sceneEl.camera.projectionMatrix );
		this.SAOMaterial.uniforms[ 'cameraProjectionMatrix' ].value = this.el.sceneEl.camera.projectionMatrix;
    
        this.SAOMaterial.uniforms.tDepth.value = this.el.sceneEl.renderTarget.depthTexture;
        this.system.renderPass(this.SAOMaterial, this.renderTargets[0], true);

		if(this.data.blurRadius) {
			this.hBlurMaterial.uniforms.tDiffuse.value = this.renderTargets[0].texture;
			this.system.renderPass(this.hBlurMaterial, this.renderTargets[1], true);

			this.vBlurMaterial.uniforms.tDiffuse.value = this.renderTargets[1].texture;
			this.system.renderPass(this.vBlurMaterial, this.renderTargets[0], true);
		}
	},

    remove: function () {
        this.SAOMaterial.dispose();
        this.hBlurMaterial.dispose();
        this.vBlurMaterial.dispose();
        this.renderTargets[0].dispose();
        this.renderTargets[1].dispose();
        this.system.unregister(this);
    },

    includes: ["packing"],

    depth: true,

    diffuse: true,
    
    fragment: [
        "float $unpackDepth(vec3 pack) {",
        "	float depth = dot( pack, 1.0 / vec3(1.0, 256.0, 256.0*256.0) );",
        "	return depth * (256.0*256.0*256.0) / (256.0*256.0*256.0 - 1.0);",
        "}",
		"void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {",
		"   vec4 texel = texture2D($texture, uv);",
        "   float z = perspectiveDepthToViewZ( $unpackDepth(texel.xyz), cameraNear, cameraFar );",
        "   float Z = perspectiveDepthToViewZ( depth, cameraNear, cameraFar );",
        "   color.rgb *= abs(z-Z) > $depthCutoff || Z >= $maxDepth * cameraFar ? 1.0  :  1.0 - texel.a * $intensity;",
        "}"
	].join( "\n" )
});