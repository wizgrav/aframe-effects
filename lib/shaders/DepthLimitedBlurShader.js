/**
 * @author bhouston / http://clara.io
 *
 * For a horizontal blur, use X_STEP 1, Y_STEP 0
 * For a vertical blur, use X_STEP 0, Y_STEP 1
 *
 * For speed, this shader precomputes uv offsets in vert shader to allow for prefetching
 *
 */

// Adapted by wizgrav to pack depth and AO in a single texture

THREE.DepthLimitedBlurShader = {

	defines: {

		"KERNEL_RADIUS": 4,

	},

	uniforms: {

		"tDiffuse":         { type: "t", value: null },
		"size":             { type: "v2", value: new THREE.Vector2( 512, 512 ) },
		"sampleUvOffsets":  { type: "v2v", value: [ new THREE.Vector2( 0, 0 ) ] },
		"sampleWeights":    { type: "1fv", value: [ 1.0 ] },
		"depthCutoff":      { type: "f", value: 10 },
		"cameraFar":      { type: "f", value: 1 },
		"cameraNear":      { type: "f", value: 1000 },
		"uvrb": { type: "v4", value: new THREE.Vector4() }

	},

	vertexShader: [

		"#include <common>",

		"uniform vec2 size;",

		"varying vec2 vUv;",
		"varying vec2 vInvSize;",

		"void main() {",

			"vUv = uv;",
			"vInvSize = 1.0 / size;",

			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"#include <common>",
		"#include <packing>",

		"uniform sampler2D tDiffuse;",
		
		"uniform vec2 sampleUvOffsets[ KERNEL_RADIUS + 1 ];",
		"uniform float sampleWeights[ KERNEL_RADIUS + 1 ];",
		"uniform float depthCutoff;",
		"uniform float cameraFar;",
		"uniform float cameraNear;",

		"varying vec2 vUv;",
		"varying vec2 vInvSize;",
		
		"uniform vec4 uvrb;",
		"vec2 uvr(vec2 uv) { return vec2(clamp(uv.x * uvrb.x + uvrb.y, uvrb.z, uvrb.w), uv.y); }",

		"float unpackDepth(vec2 comp) {",
		"	return dot(round(comp * 15.0), vec2(1.0 / (255.0 / 16.0), 1.0 / 255.0));",
		"}",

		"float getViewZ( const in float depth ) {",
			"return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );",
		"}",

		"void main() {",
			"vec4 texel = texture2D( tDiffuse, uvr(vUv) );",
			"vec2 orig = texel.rg;",
			"float depth = unpackDepth( orig );",
			"if( depth >= ( 1.0 - EPSILON ) ) {",
				"discard;",
			"}",
			"float centerViewZ = -getViewZ( depth );",
			"bool rBreak = false, lBreak = false;",

			"float weightSum = sampleWeights[0];",
			"float AOSum = texel.a * weightSum;",

			"for( int i = 1; i <= KERNEL_RADIUS; i ++ ) {",

				"float sampleWeight = sampleWeights[i];",
				"vec2 sampleUvOffset = sampleUvOffsets[i] * vInvSize;",

				"vec2 sampleUv = vUv + sampleUvOffset;",
				"texel = texture2D( tDiffuse, uvr(sampleUv) );",
				"float viewZ = -getViewZ(unpackDepth( texel.rg ));",

				"if( abs( viewZ - centerViewZ ) > depthCutoff ) rBreak = true;",

				"if( ! rBreak ) {",
					"AOSum += texel.a * sampleWeight;",
					"weightSum += sampleWeight;",
				"}",

				"sampleUv = vUv - sampleUvOffset;",
				"texel = texture2D( tDiffuse, uvr(sampleUv) );",
				"float viewZ = -getViewZ(unpackDepth( texel.rg ));",

				"if( abs( viewZ - centerViewZ ) > depthCutoff ) lBreak = true;",

				"if( ! lBreak ) {",
					"AOSum += texel.ba * sampleWeight;",
					"weightSum += sampleWeight;",
				"}",

			"}",

			"gl_FragColor = vec4(orig.rg, 0.0, AOSum / weightSum);",

		"}"

	].join( "\n" )

};
