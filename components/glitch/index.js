// Ported from three's glitch pass/shader and added VR support

AFRAME.registerComponent("glitch", {
    schema: { default: true },

    init: function () {
        this.system = this.el.sceneEl.systems.effects;

        this.uniforms = {
            "tDisp":		{ type: "t", value: this.generateHeightmap( 64 ) },
            "amount":		{ type: "f", value: 0.08 },
            "angle":		{ type: "f", value: 0.02 },
            "seed":			{ type: "f", value: 0.02 },
            "seed_x":		{ type: "f", value: 0.02 },//-1,1
            "seed_y":		{ type: "f", value: 0.02 },//-1,1
            "distortion_x":	{ type: "f", value: 0.5 },
            "distortion_y":	{ type: "f", value: 0.6 },
            "col_s":		{ type: "f", value: 0.05 }
	    };
        
		this.exports = {
			glitch: {
                fragment: this.fragment,
                uniforms: this.uniforms
            }
		}
        // by declaring a .material property we set this component to take a whole pass of it's own
        this.material = this.system.fuse([this.exports.glitch]);

        this.system.register(this);
    },

    vr: true,

    update: function () {
        this.bypass = !this.data;
        this.curF = 0;
        this.generateTrigger();
    },

    remove: function () {
        this.system.unregister(this);
    },

    tock: function () {
        this.uniforms[ 'seed' ].value = Math.random();//default seeding
		
		if ( this.curF % this.randX == 0) {

			this.uniforms[ 'amount' ].value = Math.random() / 30;
			this.uniforms[ 'angle' ].value = THREE.Math.randFloat( - Math.PI, Math.PI );
			this.uniforms[ 'seed_x' ].value = THREE.Math.randFloat( - 1, 1 );
			this.uniforms[ 'seed_y' ].value = THREE.Math.randFloat( - 1, 1 );
			this.uniforms[ 'distortion_x' ].value = THREE.Math.randFloat( 0, 1 );
			this.uniforms[ 'distortion_y' ].value = THREE.Math.randFloat( 0, 1 );
			this.curF = 0;
			this.generateTrigger();

		} else if ( this.curF % this.randX < this.randX / 5 ) {

			this.uniforms[ 'amount' ].value = Math.random() / 90;
			this.uniforms[ 'angle' ].value = THREE.Math.randFloat( - Math.PI, Math.PI );
			this.uniforms[ 'distortion_x' ].value = THREE.Math.randFloat( 0, 1 );
			this.uniforms[ 'distortion_y' ].value = THREE.Math.randFloat( 0, 1 );
			this.uniforms[ 'seed_x' ].value = THREE.Math.randFloat( - 0.3, 0.3 );
			this.uniforms[ 'seed_y' ].value = THREE.Math.randFloat( - 0.3, 0.3 );

		} 

		this.curF ++;
    },

    generateTrigger: function() {

		this.randX = THREE.Math.randInt( 120, 240 );

	},

	generateHeightmap: function( dt_size ) {

		var data_arr = new Float32Array( dt_size * dt_size * 3 );
		var length = dt_size * dt_size;

		for ( var i = 0; i < length; i ++ ) {

			var val = THREE.Math.randFloat( 0, 1 );
			data_arr[ i * 3 + 0 ] = val;
			data_arr[ i * 3 + 1 ] = val;
			data_arr[ i * 3 + 2 ] = val;

		}

		var texture = new THREE.DataTexture( data_arr, dt_size, dt_size, THREE.RGBFormat, THREE.FloatType );
		texture.needsUpdate = true;
		return texture;

	},

    fragment: [
		"float $rand(vec2 co){",
			"return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);",
		"}",
				
		"void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {",
				"vec2 p = uv;",
                "vec2 p2 = vec2( smoothstep(uvClamp.x, uvClamp.y, p.x),p.y);",
				"float xs = floor(gl_FragCoord.x / 0.5);",
				"float ys = floor(gl_FragCoord.y / 0.5);",
				//based on staffantans glitch shader for unity https://github.com/staffantan/unityglitch
				"vec4 normal = texture2D ($tDisp, p2 * $seed * $seed);",
				"if(p2.y < $distortion_x + $col_s && p2.y > $distortion_x - $col_s * $seed) {",
					"if($seed_x>0.){",
						"p.y = 1. - (p.y + $distortion_y);",
					"}",
					"else {",
						"p.y = $distortion_y;",
					"}",
				"}",
				"if(p2.x < $distortion_y + $col_s && p2.x > $distortion_y - $col_s * $seed) {",
					"if( $seed_y > 0.){",
						"p.x = $distortion_x;",
					"}",
					"else {",
						"p.x = 1. - (p.x + $distortion_x);",
					"}",
				"}",
				"p.x+=normal.x* $seed_x * ($seed/5.);",
				"p.y+=normal.y* $seed_y * ($seed/5.);",
				//base from RGB shift shader
				"vec2 offset = $amount * vec2( cos($angle), sin($angle));",
				"vec4 cr = textureVR(tDiffuse, p + offset);",
				"vec4 cga = textureVR(tDiffuse, p);",
				"vec4 cb = textureVR(tDiffuse, p - offset);",
				"color = vec4(cr.r, cga.g, cb.b, cga.a);",
				//add noise
				"vec4 snow = 200.*$amount*vec4($rand(vec2(xs * $seed,ys * $seed*50.))*0.2);",
				"color = color+ snow;",
		"}"
	].join( "\n" )
});