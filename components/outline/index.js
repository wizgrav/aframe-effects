AFRAME.registerComponent("outline", {
	multiple: true,

    schema: {
        color: { type: "color", default: "#000000" },
		width: { type: "vec2", default: new THREE.Vector2(1,1) },
		range: { type: "vec2", default: new THREE.Vector2(0,1000) },
		strength: {type: "number", default: 1},
		ratio: { type: "number", default: 0.5 },
		sobel: { default: false },
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
            color: { type: "v3", value: new THREE.Color() },
			width: { type: "v2", value: null },
			range: { type: "v2", value: null },
			strength: { type: "f", value: 1 }
        };

		this.materialSobel = this.system.fuse([{
			fragment: this.sobel,
			uniforms: this.tockUniforms,
			includes: ["packing"],
			depth: true
		}], true);

		this.materialFreichen = this.system.fuse([{
			fragment: this.freichen,
			uniforms: this.tockUniforms,
			includes: ["packing"],
			depth: true
		}], true);
		
		this.blurDirection = { type: "v2", value: new THREE.Vector2()};
		
		this.blurMaterial = this.system.fuse([{
			fragment: this.blur,
			uniforms: { resolution: this.resolution, direction: this.blurDirection },
			diffuse: true
		}], true);

		this.uniforms = {
			texture: { type: "t", value: this.renderTarget.texture }
		}
		
		this.system.register(this);
    },

    update: function (oldData) {
        this.tockUniforms.color.value.set(this.data.color);
		this.tockUniforms.width.value = this.data.width;
		this.tockUniforms.range.value = this.data.range;
		this.tockUniforms.strength.value = 1 / this.data.strength;
		this.currentMaterial = this.data.sobel ? this.materialSobel : this.materialFreichen;
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
		"mat3 G[2];",

		"const mat3 g0 = mat3( 1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0 );",
		"const mat3 g1 = mat3( 1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0 );",


		"void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {",
		
			"mat3 I;",
			"float cnv[2];",
			"float d;",

			"G[0] = g0;",
			"G[1] = g1;",

			"for (float i=0.0; i<3.0; i++)",
			"for (float j=0.0; j<3.0; j++) {",
		"           d = texture2D(tDepth, uv + resolution.zw * vec2(i-1.0,j-1.0) ).x;",
        "           d = perspectiveDepthToViewZ(d, cameraNear, cameraFar); ",
		"			I[int(i)][int(j)] = viewZToOrthographicDepth(d, cameraNear, cameraFar);",
			"}",

			"for (int i=0; i<2; i++) {",
				"float dp3 = dot(G[i][0], I[0]) + dot(G[i][1], I[1]) + dot(G[i][2], I[2]);",
				"cnv[i] = dp3 * dp3; ",
			"}",
			"color = vec4($color, sqrt(cnv[0]*cnv[0]+cnv[1]*cnv[1]));",
		"} "
	].join("\n"),

    freichen: [
        "mat3 $G[9];",

		// hard coded matrix values!!!! as suggested in https://github.com/neilmendoza/ofxPostProcessing/blob/master/src/EdgePass.cpp#L45

		"const mat3 $g0 = mat3( 0.3535533845424652, 0, -0.3535533845424652, 0.5, 0, -0.5, 0.3535533845424652, 0, -0.3535533845424652 );",
		"const mat3 $g1 = mat3( 0.3535533845424652, 0.5, 0.3535533845424652, 0, 0, 0, -0.3535533845424652, -0.5, -0.3535533845424652 );",
		"const mat3 $g2 = mat3( 0, 0.3535533845424652, -0.5, -0.3535533845424652, 0, 0.3535533845424652, 0.5, -0.3535533845424652, 0 );",
		"const mat3 $g3 = mat3( 0.5, -0.3535533845424652, 0, -0.3535533845424652, 0, 0.3535533845424652, 0, 0.3535533845424652, -0.5 );",
		"const mat3 $g4 = mat3( 0, -0.5, 0, 0.5, 0, 0.5, 0, -0.5, 0 );",
		"const mat3 $g5 = mat3( -0.5, 0, 0.5, 0, 0, 0, 0.5, 0, -0.5 );",
		"const mat3 $g6 = mat3( 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.6666666865348816, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204 );",
		"const mat3 $g7 = mat3( -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, 0.6666666865348816, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408 );",
		"const mat3 $g8 = mat3( 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408 );",

		"void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {",
        
		"	$G[0] = $g0,",
		"	$G[1] = $g1,",
		"	$G[2] = $g2,",
		"	$G[3] = $g3,",
		"	$G[4] = $g4,",
		"	$G[5] = $g5,",
		"	$G[6] = $g6,",
		"	$G[7] = $g7,",
		"	$G[8] = $g8;",

		"	mat3 I;",
		"	float cnv[9];",
		"	float d = texture2D(tDepth, uv).x;",
		"   d = perspectiveDepthToViewZ(d, cameraNear, cameraFar); ",
		"	float att = mix($width.x, $width.y, smoothstep($range.x, $range.y, -d));",
		"	d = viewZToOrthographicDepth(d, cameraNear, cameraFar);",
		"	I[1][1] = d;",
		"	for (float i=0.0; i<3.0; i++) {",
		"		for (float j=0.0; j<3.0; j++) {",
		"			if (j == 1.0 && i == 1.0) continue;",
        "           d = texture2D(tDepth, uv + att * resolution.zw * vec2(i-1.0,j-1.0) ).x;",
        "           d = perspectiveDepthToViewZ(d, cameraNear, cameraFar); ",
		"			I[int(i)][int(j)] = viewZToOrthographicDepth(d, cameraNear, cameraFar);",
		"		}",
		"	}",

		"	for (int i=0; i<9; i++) {",
		"		float dp3 = dot($G[i][0], I[0]) + dot($G[i][1], I[1]) + dot($G[i][2], I[2]);",
		"		cnv[i] = dp3 * dp3;",
		"	}",

		"	float M = (cnv[0] + cnv[1]) + (cnv[2] + cnv[3]);",
		"	float S = (cnv[4] + cnv[5]) + (cnv[6] + cnv[7]) + (cnv[8] + M);",
        "   float v = smoothstep(0., $strength, sqrt(M/S));",
		"	color = vec4($color, v);",
      	"}"

	].join( "\n" ),

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