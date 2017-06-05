// Ported from the standard shader in Three.js examples

AFRAME.registerComponent("film", {
    multiple: true,

    schema: {
        "speed":       { default: 1.0 },
        "nIntensity": { default: 0.5 },
        "sIntensity": { default: 0.05 },
        "sCount":     { default: 4096 }
	},

    init: function () {
        this.uniforms = {
            "speed":       { type: "f", value: 0.0 },
            "nIntensity": { type: "f", value: 0.5 },
            "sIntensity": { type: "f", value: 0.05 },
            "sCount":     { type: "f", value: 4096 }
	    };
        this.system = this.el.sceneEl.systems.effects;
        this.system.register(this);
    },

    update: function () {
        var d = this.data, us =  this.uniforms;
        for(var u in us) {
            if(d[u]) us[u].value = d[u]; 
        }
    },

    remove: function () {
        this.system.unregister(this);
    },

    includes: ["common"],

    diffuse: true,

    fragment: [
		"void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {",
		"   vec4 cTextureScreen = color;",
		"   float dx = rand( uv + mod(time, 3.14) * $speed );",
		"   vec3 cResult = cTextureScreen.rgb + cTextureScreen.rgb * clamp( 0.1 + dx, 0.0, 1.0 );",
		"   vec2 sc = vec2( sin( uv.y * $sCount ), cos( uv.y * $sCount ) );",
		"   cResult += cTextureScreen.rgb * vec3( sc.x, sc.y, sc.x ) * $sIntensity;",
        "   cResult = cTextureScreen.rgb + clamp( $nIntensity, 0.0,1.0 ) * ( cResult - cTextureScreen.rgb );",
		"   color.rgb =  cResult; //cResult;",
		"}"
	].join( "\n" )
});