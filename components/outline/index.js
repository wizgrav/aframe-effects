// Sobel and freichen shaders from three.js examples

AFRAME.registerComponent("outline", {
	multiple: true,

    schema: {
		enabled: { default: true },
        color: { type: "color", default: "#000000" },
		width: { type: "vec2", default: new THREE.Vector2(1,1) },
		range: { type: "vec2", default: new THREE.Vector2(0,1500) },
		strength: {type: "number", default: 1},
		ratio: { type: "number", default: 0.5 },
		smooth: { default: false }  
	},

    init: function () {
        this.system = this.el.sceneEl.systems.effects;
		var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
        this.renderTarget = new THREE.WebGLRenderTarget( 1, 1, pars );
		this.blurTarget = new THREE.WebGLRenderTarget( 1, 1, pars );
		this.needsResize = true;
		this.resolution = { type: "v4", value: new THREE.Vector4()};
		this.tockUniforms = {
			resolution: this.resolution,
            color: { type: "c", value: new THREE.Color() },
			width: { type: "v2", value: null },
			range: { type: "v2", value: null },
			strength: { type: "f", value: 1 }
        };
		
		this.blurDirection = { type: "v2", value: new THREE.Vector2()};
		
		this.exports = {
			sobel: {
				fragment: this.sobel,
				uniforms: this.tockUniforms,
				includes: ["packing"],
				depth: true
			},

			blur: {
				fragment: this.blur,
				uniforms: { resolution: this.tockUniforms.resolution, direction: this.blurDirection },
				diffuse: true
			}
		}
		this.currentMaterial = this.system.fuse([this.exports.sobel], true);

		
		this.blurMaterial = this.system.fuse([this.exports.blur], true);

		this.uniforms = {
			texture: { type: "t", value: this.renderTarget.texture }
		}
		
		this.system.register(this);
    },

    update: function (oldData) {
		this.bypass = !this.data.enabled;
        this.tockUniforms.color.value.set(this.data.color);
		this.tockUniforms.width.value = this.data.width;
		this.tockUniforms.range.value = this.data.range;
		this.tockUniforms.strength.value = 1 / this.data.strength;
    },

	setSize: function(w, h) {
		w = Math.round(w * this.data.ratio);
		h = Math.round(h * this.data.ratio);
		this.renderTarget.setSize(w,h);
		this.blurTarget.setSize(w,h);
		this.resolution.value.set(w, h, 1/w, 1/h);
	},

	tock: function () {
		if (!this.system.isActive(this, true)) return;
		this.system.renderPass(this.currentMaterial, this.renderTarget);
		this.system.tDiffuse.value = this.renderTarget;
		if (!this.data.smooth) return;
		this.blurDirection.value.set(1,0);
		this.system.renderPass(this.blurMaterial, this.blurTarget);
		this.system.tDiffuse.value = this.blurTarget;
		this.blurDirection.value.set(0,1);
		this.system.renderPass(this.blurMaterial, this.renderTarget);
	},

    remove: function () {
        this.system.unregister(this);
    },

    diffuse: true,

    sobel: [
		"mat3 $G[2];",

		"const mat3 $g0 = mat3( 1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0 );",
		"const mat3 $g1 = mat3( 1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0 );",


		"void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {",
		
			"vec3 I[3];",
			"float cnv[2];",
			"float d;",

			"$G[0] = $g0;",
			"$G[1] = $g1;",

			"for (float i=0.0; i<3.0; i++)",
			"for (float j=0.0; j<3.0; j++) {",
		"           d = texture2D(tDepth, uv + resolution.zw * vec2(i-1.0,j-1.0) ).x;",
        "           d = perspectiveDepthToViewZ(d, cameraNear, cameraFar); ",
		"			I[int(i)][int(j)] = viewZToOrthographicDepth(d, cameraNear, cameraFar);",
			"}",

			"for (int i=0; i<2; i++) {",
				"float dp3 = dot($G[i][0], I[0]) + dot($G[i][1], I[1]) + dot($G[i][2], I[2]);",
				"cnv[i] = dp3 * dp3; ",
			"}",
			"color = vec4($color, sqrt(cnv[0]*cnv[0]+cnv[1]*cnv[1]));",
		"} "
	].join("\n"),

	blur: [
		"void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth){",
		"color.a *= 0.44198;",
		"color.a += texture2D(tDiffuse, uv + ($direction * $resolution.zw )).a * 0.27901;",
		"color.a += texture2D(tDiffuse, uv - ($direction * $resolution.zw )).a * 0.27901;",
		"}"
	].join("\n"),

	fragment: [
        "void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth){",
        "	vec4 texel = texture2D($texture, uv);",
		"   color.rgb = mix(color.rgb, texel.rgb, smoothstep(0.1,0.3,texel.a));",
        "}"
    ].join("\n")
});