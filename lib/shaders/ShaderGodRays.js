/**
 * @author huwb / http://huwbowles.com/
 *
 * God-rays (crepuscular rays)
 *
 * Similar implementation to the one used by Crytek for CryEngine 2 [Sousa2008].
 * Blurs a mask generated from the depth map along radial lines emanating from the light
 * source. The blur repeatedly applies a blur filter of increasing support but constant
 * sample count to produce a blur filter with large support.
 *
 * My implementation performs 3 passes, similar to the implementation from Sousa. I found
 * just 6 samples per pass produced acceptible results. The blur is applied three times,
 * with decreasing filter support. The result is equivalent to a single pass with
 * 6*6*6 = 216 samples.
 *
 * References:
 *
 * Sousa2008 - Crysis Next Gen Effects, GDC2008, http://www.crytek.com/sites/default/files/GDC08_SousaT_CrysisEffects.ppt
 */

module.exports = {

	/**
	 * The god-ray generation shader.
	 *
	 * First pass:
	 *
	 * The input is the depth map. I found that the output from the
	 * THREE.MeshDepthMaterial material was directly suitable without
	 * requiring any treatment whatsoever.
	 *
	 * The depth map is blurred along radial lines towards the "sun". The
	 * output is written to a temporary render target (I used a 1/4 sized
	 * target).
	 *
	 * Pass two & three:
	 *
	 * The results of the previous pass are re-blurred, each time with a
	 * decreased distance between samples.
	 */
		uniforms: {

			tInput: {
				value: null
			},
			fStepSize: {
				value: 1.0
			},
			vSunPositionScreenSpace: {
				value: new THREE.Vector3( 0.5, 0.5, 0. )
			},
			uvrb: {
				value: new THREE.Vector4()
			}

		},

		vertexShader: [

			"varying vec2 vUv;",

			"void main() {",

				"vUv = uv;",
				"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

			"}"

		].join( "\n" ),

		fragmentShader: [

			"#define TAPS_PER_PASS 6.0",

			"varying vec2 vUv;",

			"uniform sampler2D tInput;",

			"uniform vec3 vSunPositionScreenSpace;",
			"uniform float fStepSize;", // filter step size
			"uniform vec4 uvrb;",
			"vec2 uvr(vec2 uv) { return vec2(clamp(uv.x * uvrb.x + uvrb.y, uvrb.z, uvrb.w), uv.y); }",
			
			"void main() {",

				// delta from current pixel to "sun" position

				"vec2 delta = vSunPositionScreenSpace.xy - vUv;",
				"float dist = length( delta );",

				// Step vector (uv space)

				"vec2 stepv = fStepSize * delta / dist;",

				// Number of iterations between pixel and sun

				"float iters = dist/fStepSize;",

				"vec2 uv = uvr(vUv).xy;",
				"float col = 0.0;",

				// This breaks ANGLE in Chrome 22
				//	- see http://code.google.com/p/chromium/issues/detail?id=153105

				/*
				// Unrolling didnt do much on my hardware (ATI Mobility Radeon 3450),
				// so i've just left the loop

				"for ( float i = 0.0; i < TAPS_PER_PASS; i += 1.0 ) {",

					// Accumulate samples, making sure we dont walk past the light source.

					// The check for uv.y < 1 would not be necessary with "border" UV wrap
					// mode, with a black border colour. I don't think this is currently
					// exposed by three.js. As a result there might be artifacts when the
					// sun is to the left, right or bottom of screen as these cases are
					// not specifically handled.

					"col += ( i <= iters && uv.y < 1.0 ? texture2D( tInput, uvr(uv) ).r : 0.0 );",
					"uv += stepv;",

				"}",
				*/

				// Unrolling loop manually makes it work in ANGLE

				"if ( 0.0 <= iters && uv.y < 1.0 ) col += texture2D( tInput, uvr(uv) ).r;",
				"uv += stepv;",

				"if ( 1.0 <= iters && uv.y < 1.0 ) col += texture2D( tInput, uvr(uv) ).r;",
				"uv += stepv;",

				"if ( 2.0 <= iters && uv.y < 1.0 ) col += texture2D( tInput, uvr(uv) ).r;",
				"uv += stepv;",

				"if ( 3.0 <= iters && uv.y < 1.0 ) col += texture2D( tInput, uvr(uv) ).r;",
				"uv += stepv;",

				"if ( 4.0 <= iters && uv.y < 1.0 ) col += texture2D( tInput, uvr(uv) ).r;",
				"uv += stepv;",

				"if ( 5.0 <= iters && uv.y < 1.0 ) col += texture2D( tInput, uvr(uv) ).r;",
				"uv += stepv;",

				// Should technically be dividing by 'iters', but 'TAPS_PER_PASS' smooths out
				// objectionable artifacts, in particular near the sun position. The side
				// effect is that the result is darker than it should be around the sun, as
				// TAPS_PER_PASS is greater than the number of samples actually accumulated.
				// When the result is inverted (in the shader 'godrays_combine', this produces
				// a slight bright spot at the position of the sun, even when it is occluded.

				"gl_FragColor = vec4( col/TAPS_PER_PASS );",
				"gl_FragColor.a = 1.0;",

			"}"

		].join( "\n" )

	}