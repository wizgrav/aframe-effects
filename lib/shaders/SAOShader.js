/**
 * @author bhouston / http://clara.io/
 *
 * Scalable Ambient Occlusion
 *
 */

module.exports = function (isFirst) {
	return {
		defines: {},

		uniforms: {

			"tDepth":       { type: "t", value: null },
			
			"cameraNear":   { type: "f", value: 1 },
			"cameraFar":    { type: "f", value: 100 },
			"cameraProjectionMatrix": { type: "m4", value: new THREE.Matrix4() },
			"cameraInverseProjectionMatrix": { type: "m4", value: new THREE.Matrix4() },

			"scale":        { type: "f", value: 1.0 },
			"bias":         { type: "f", value: 0.5 },

			"minResolution": { type: "f", value: 0.0 },
			"kernelRadius": { type: "f", value: 0.5 },
			"randomSeed":   { type: "f", value: 0.0 },
			"maxDepth":   { type: "f", value: 1.0 }
		},

		vertexShader: [

			"varying vec2 vUv;",
			"void main() {",

				"vUv = uv;",

				"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

			"}"

		].join( "\n" ),

		fragmentShader: [

			// total number of samples at each fragment",
			
			"#include <common>",
			"#include <packing>",

			"varying vec2 vUv;",

			"uniform sampler2D tDepth;",

			"uniform float cameraNear;",
			"uniform float cameraFar;",
			"uniform mat4 cameraProjectionMatrix;",
			"uniform mat4 cameraInverseProjectionMatrix;",

			"uniform float scale;",
			"uniform float intensity;",
			"uniform float bias;",
			"uniform float kernelRadius;",
			"uniform float minResolution;",
			"uniform float randomSeed;",
			"uniform float maxDepth;",
			
			
			"float unpackDepth(vec3 pack) {",
			"	float depth = dot( pack, 1.0 / vec3(1.0, 256.0, 256.0*256.0) );",
  			"	return depth * (256.0*256.0*256.0) / (256.0*256.0*256.0 - 1.0);",
			"}",
			
			"vec3 packDepth(float depth) {",
			"	float depthVal = depth * (256.0*256.0*256.0 - 1.0) / (256.0*256.0*256.0);",
   			"	vec4 encode = fract( depthVal * vec4(1.0, 256.0, 256.0*256.0, 256.0*256.0*256.0) );",
    		"	return encode.xyz - encode.yzw / 256.0 + 1.0/512.0;",
			"}",

			
			"float getViewZ( const in float depth ) {",

				"return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );",

			"}",

			"vec3 getViewPosition( const in vec2 screenPosition, const in float depth, const in float viewZ ) {",

				"float clipW = cameraProjectionMatrix[2][3] * viewZ + cameraProjectionMatrix[3][3];",
				"vec4 clipPosition = vec4( ( vec3( screenPosition, depth ) - 0.5 ) * 2.0, 1.0 );",
				"clipPosition *= clipW;", // unprojection.
				"return ( cameraInverseProjectionMatrix * clipPosition ).xyz;",

			"}",

			"vec3 getViewNormal( const in vec3 viewPosition, const in vec2 screenPosition ) {",

				"return normalize( cross( dFdx( viewPosition ), dFdy( viewPosition ) ) );",
			
			"}",

			"float scaleDividedByCameraFar;",
			"float minResolutionMultipliedByCameraFar;",

			"float getOcclusion( const in vec3 centerViewPosition, const in vec3 centerViewNormal, const in vec3 sampleViewPosition ) {",

				"vec3 viewDelta = sampleViewPosition - centerViewPosition;",
				"float viewDistance = length( viewDelta );",
				"float scaledScreenDistance = scaleDividedByCameraFar * viewDistance;",
				"return max(0.0, (dot(centerViewNormal, viewDelta) - minResolutionMultipliedByCameraFar) / scaledScreenDistance - bias) / (1.0 + pow2( scaledScreenDistance ) );",

			"}",

			// moving costly divides into consts
			"const float ANGLE_STEP = PI2 * RINGS / SAMPLES;",
			"const float INV_NUM_SAMPLES = 1.0 / SAMPLES;",

			"float getAmbientOcclusion( const in vec3 centerViewPosition) {",

				// precompute some variables require in getOcclusion.
				"scaleDividedByCameraFar = scale;",
				"minResolutionMultipliedByCameraFar = minResolution * cameraFar;",
				"vec3 centerViewNormal = getViewNormal( centerViewPosition, vUv );",

				// jsfiddle that shows sample pattern: https://jsfiddle.net/a16ff1p7/
				"float angle = rand( vUv + randomSeed ) * PI2;",
				"vec2 radius = vec2( kernelRadius * INV_NUM_SAMPLES );",
				"vec2 radiusStep = radius;",
				"float occlusionSum = 0.;",
				"float weightSum = 0.;",
				"for( int i = 0; i < int(SAMPLES); i ++ ) {",
					"vec2 sampleUv = vUv + vec2( cos( angle ), sin( angle ) ) * radius;",
					"radius += radiusStep;",
					"angle += ANGLE_STEP;",

					"float sampleDepth = textureVR( tDepth, sampleUv ).x;",
					"if( sampleDepth >= ( 1.0 - EPSILON ) ) {",
						"continue;",
					"}",

					"float sampleViewZ = getViewZ( sampleDepth );",
					"vec3 sampleViewPosition = getViewPosition( sampleUv, sampleDepth, sampleViewZ );",
					"occlusionSum += getOcclusion( centerViewPosition, centerViewNormal, sampleViewPosition );",
					"weightSum += 1.0;",

				"}",

				"if( weightSum == 0.0 ) discard;",
				"return occlusionSum / weightSum;",
				
			"}",


			"void main() {",
				"vec4 texel = texture2D( tDepth, vUv );",
				"float centerDepth = texel.x;",
				
				"if( centerDepth >= ( maxDepth - EPSILON ) ) {",
					"discard;",
				"}",

				"float centerViewZ = getViewZ( centerDepth );",
				"vec3 viewPosition = getViewPosition( vUv, centerDepth, centerViewZ );",

				"gl_FragColor =  vec4(packDepth(texel.x), getAmbientOcclusion( viewPosition));",
			"}"

		].join( "\n" )

	};
}