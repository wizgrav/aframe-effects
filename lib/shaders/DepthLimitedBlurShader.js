/**
 * @author bhouston / http://clara.io
 *
 * For a horizontal blur, use X_STEP 1, Y_STEP 0
 * For a vertical blur, use X_STEP 0, Y_STEP 1
 *
 *
 */

// Adapted by wizgrav to pack depth and AO in a single rgba texture

THREE.BlurShaderUtils = {

	createSampleWeights: function( kernelRadius, stdDev ) {

		var gaussian = function( x, stdDev ) {
			return Math.exp( - ( x*x ) / ( 2.0 * ( stdDev * stdDev ) ) ) / ( Math.sqrt( 2.0 * Math.PI ) * stdDev );
		};

		var weights = [];

		for( var i = 0; i <= kernelRadius; i ++ ) {
			weights.push( gaussian( i, stdDev ) );
		}

		return weights;
	},

	createSampleOffsets: function( kernelRadius, uvIncrement ) {

		var offsets = [];

		for( var i = 0; i <= kernelRadius; i ++ ) {
			offsets.push( uvIncrement.clone().multiplyScalar( i ) );
		}

		return offsets;

	},

	configure: function( kernelRadius, stdDev, uvIncrement ) {
		return {
			'sampleUvOffsets': THREE.BlurShaderUtils.createSampleOffsets( kernelRadius, uvIncrement ),
			'sampleWeights': THREE.BlurShaderUtils.createSampleWeights( kernelRadius, stdDev )
		}
	}

};


module.exports =  function (radius, stdDev, uvIncrement) {
	radius = radius || 4;
	var config = THREE.BlurShaderUtils.configure(radius, stdDev, uvIncrement )
	return {
		defines: {

			"KERNEL_RADIUS": radius,

		},

		uniforms: {

			"tDiffuse":         { type: "t", value: null },
			"size":             { type: "v2", value: new THREE.Vector2( 512, 512 ) },
			"sampleUvOffsets":  { type: "v2v", value: config.sampleUvOffsets },
			"sampleWeights":    { type: "1fv", value: config.sampleWeights },
			"depthCutoff":      { type: "f", value: 10 },
			"cameraFar":      { type: "f", value: 1 },
			"cameraNear":      { type: "f", value: 1000 }
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
			
			"float unpackDepth(vec3 pack) {",
			"	float depth = dot( pack, 1.0 / vec3(1.0, 256.0, 256.0*256.0) );",
  			"	return depth * (256.0*256.0*256.0) / (256.0*256.0*256.0 - 1.0);",
			"}",
			
			"float getViewZ( const in float depth ) {",

			 "return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );",

		 	"}",
			"void main() {",
				"vec4 texel = texture2D( tDiffuse, vUv );",
				"vec3 orig = texel.xyz;",
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
					"texel = textureVR( tDiffuse, sampleUv );",
					"float viewZ = -getViewZ(unpackDepth( texel.xyz ));",

					"if( abs( viewZ - centerViewZ ) > depthCutoff ) rBreak = true;",

					"if( ! rBreak ) {",
						"AOSum += texel.a * sampleWeight;",
						"weightSum += sampleWeight;",
					"}",

					"sampleUv = vUv - sampleUvOffset;",
					"texel = textureVR( tDiffuse, sampleUv );",
					"viewZ = -getViewZ(unpackDepth( texel.xyz ));",

					"if( abs( viewZ - centerViewZ ) > depthCutoff ) lBreak = true;",

					"if( ! lBreak ) {",
						"AOSum += texel.a * sampleWeight;",
						"weightSum += sampleWeight;",
					"}",

				"}",

				"gl_FragColor = vec4(orig, AOSum / weightSum);",

			"}"

		].join( "\n" )

};
}