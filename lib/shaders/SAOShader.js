/**
 * @author bhouston / http://clara.io/
 *
 * Scalable Ambient Occlusion
 *
 */

THREE.SAOShader = {

	defines: {
		'NUM_SAMPLES': 7,
		'NUM_RINGS': 4
	},

	uniforms: {

		"tDepth":       { type: "t", value: null },
		"size":         { type: "v2", value: new THREE.Vector2( 512, 512 ) },

		"cameraNear":   { type: "f", value: 1 },
		"cameraFar":    { type: "f", value: 100 },
		"cameraProjectionMatrix": { type: "m4", value: new THREE.Matrix4() },
		"cameraInverseProjectionMatrix": { type: "m4", value: new THREE.Matrix4() },

		"scale":        { type: "f", value: 1.0 },
		"intensity":    { type: "f", value: 0.1 },
		"bias":         { type: "f", value: 0.5 },

		"minResolution": { type: "f", value: 0.0 },
		"kernelRadius": { type: "f", value: 100.0 },
		"randomSeed":   { type: "f", value: 0.0 },
		"uvrb": { type: "v4", value: new THREE.Vector4() }
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
		"#extension GL_OES_standard_derivatives : enable",

		"#include <common>",

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
		"uniform vec2 size;",
		"uniform float randomSeed;",
		
		"uniform vec4 uvrb;",
		"vec2 uvr(vec2 uv) { return vec2(clamp(uv.x * uvrb.x + uvrb.y, uvrb.z, uvrb.w), uv.y); }",
		
		"vec2 packDepth(float f) {",
		"	float temp = c * (255.0 / 16.0);",
		"	float a = floor(temp);",
		"	float b = temp - a;",
		"	return vec2(a, b) * vec2(1.0 / 15.0, 16.0 / 15.0);",
		"}",

		"vec4 getDefaultColor( const in vec2 screenPosition ) {",

			"return vec4( 1.0 );",
		
		"}",

		"float getDepth( const in vec2 screenPosition ) {",

			"return texture2D( tDepth, screenPosition ).x;",
		
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
		"const float ANGLE_STEP = PI2 * float( NUM_RINGS ) / float( NUM_SAMPLES );",
		"const float INV_NUM_SAMPLES = 1.0 / float( NUM_SAMPLES );",

		"vec2 getAmbientOcclusion( const in vec3 centerViewPosition ) {",

			// precompute some variables require in getOcclusion.
			"scaleDividedByCameraFar = scale / cameraFar;",
			"minResolutionMultipliedByCameraFar = minResolution * cameraFar;",
			"vec3 centerViewNormal = getViewNormal( centerViewPosition, vUv );",

			// jsfiddle that shows sample pattern: https://jsfiddle.net/a16ff1p7/
			"float angle = rand( vUv + randomSeed ) * PI2;",
			"vec2 radius = vec2( kernelRadius * INV_NUM_SAMPLES ) / size;",
			"vec2 radiusStep = radius;",

			"float occlusionSum = 0.0;",
			"float weightSum = 0.0;",

			"for( int i = 0; i < NUM_SAMPLES; i ++ ) {",
				"vec2 sampleUv = vUv + vec2( cos( angle ), sin( angle ) ) * radius;",
				"radius += radiusStep;",
				"angle += ANGLE_STEP;",

				"float sampleDepth = getDepth( uvr(sampleUv) );",
				"if( sampleDepth >= ( 1.0 - EPSILON ) ) {",
					"continue;",
				"}",

				"float sampleViewZ = getViewZ( sampleDepth );",
				"vec3 sampleViewPosition = getViewPosition( sampleUv, sampleDepth, sampleViewZ );",
				"occlusionSum += getOcclusion( centerViewPosition, centerViewNormal, sampleViewPosition );",
				"weightSum += 1.0;",

			"}",

			"if( weightSum == 0.0 ) discard;",
			"return vec2(weightSum / 256.0, occlusionSum / weightSum);",
			
		"}",


		"void main() {",

			"float centerDepth = getDepth( uvr(vUv) );",
			"if( centerDepth >= ( 1.0 - EPSILON ) ) {",
				"discard;",
			"}",

			"float centerViewZ = getViewZ( centerDepth );",
			"vec3 viewPosition = getViewPosition( vUv, centerDepth, centerViewZ );",

			"gl_FragColor =  vec4(packDepth(centerDepth), getAmbientOcclusion( viewPosition ));",

		"}"

	].join( "\n" )

};
