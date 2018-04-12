AFRAME.registerComponent("colors", {
    multiple: true,

    schema: {
        "mode": { default: "map" },
        "lut": { type: "selector"},
        "lutClamp": { default: false },
        "lutFlip": { default: false },
        "add": { type: "vec3", default: new THREE.Vector3(0,0,0) },
        "mul": { type: "vec3", default: new THREE.Vector3(1,1,1) },
        "pow": { type: "vec3", default: new THREE.Vector3(1,1,1) },
        "left": { type: "vec3", default: new THREE.Vector3(0,0,0) },
        "right": { type: "vec3", default: new THREE.Vector3(1,1,1) },
        "min": { type: "vec3", default: new THREE.Vector3(0,0,0) },
        "max": { type: "vec3", default: new THREE.Vector3(1,1,1) },
        "quant": { type: "vec3", default: new THREE.Vector3(0.2,0.2,0.2) },
        "orig": { type: "vec3", default: new THREE.Vector3(1,1,1) },
        "red": { type: "vec3", default: new THREE.Vector3(1,0,0) },
        "green": { type: "vec3", default: new THREE.Vector3(0,0.5,0.5) },
        "blue": { type: "vec3", default: new THREE.Vector3(0,0.5,0.5) },
    },

    init: function () {
        this.system = this.el.sceneEl.systems.effects;
        this.uniforms = {
            "add": { type: "v3", value: null },
            "mul": { type: "v3", value: null },
            "pow": { type: "v3", value: null },
            "left": { type: "v3", value: null },
            "right": { type: "v3", value: null },
            "min": { type: "v3", value: null },
            "max": { type: "v3", value: null },
            "quant": { type: "v3", value: null },
            "orig": { type: "v3", value: null },
            "red": { type: "v3", value: null },
            "green": { type: "v3", value: null },
            "blue": { type: "v3", value: null },
            "texture": { 
                type: "t", 
                value: new THREE.Texture(
                    undefined, // Default Image
                    undefined, // Default Mapping
                    undefined, // Default wrapS
                    undefined, // Default wrapT
                    THREE.NearestFilter, // magFilter
                    THREE.NearestFilter  // minFilter
                )}
        }
        
        this.rebuild();
    
        this.system.register(this);
    },

    update: function (oldData) {
        var d = this.data, us =  this.uniforms, needsRebuild = false;
        
        for(var u in us) {
            if(d[u] !== undefined) us[u].value = d[u]; 
        }
        []
        if(this.data.lutFlip !== oldData.lutFlip || this.data.lutClamp !== oldData.lutClamp || this.data.mode != oldData.mode) {
            this.rebuild();
        }

        if(this.data.lut !== oldData.lut) {
            const texture = this.uniforms.texture.value;
            texture.image = this.data.lut;
            texture.needsUpdate = true;
        }
    },

    remove: function () {
        this.system.unregister(this);
    },

    rebuild: function () {
        var arr = [], m = this.data.mode;
        for(var i=0; i < m.length; i++){
            var op = this.ops[m[i]];
            if(op) arr.push(op);
        }
        
        this.fragment = [
            this.data.lutClamp ? "" : "#define $LUT_NO_CLAMP 1",
            this.data.lutFlip ? "#define $LUT_FLIP_Y 1" : "",
            this.preFragment, 
            arr.join("\n"), 
            "}"
        ].join("\n");

        this.system.needsUpdate = true;
    },

    ops: {
        "m": "color.rgb *= $mul;",
        "a": "color.rgb += $add;",
        "p": "color.rgb = pow(color.rgb, $pow);",
        "h": "color.rgb = $rgb2hsv(color.rgb);",
        "r": "color.rgb = $hsv2rgb(color.rgb);",
        "s": "color.rgb = smoothstep($left, $right, color.rgb);",
        "l": "color.rgb = $lut(color).rgb;",
        "q": "color.rgb = floor(color.rgb / $quant) * $quant;",
        "c": "color.rgb = clamp(color.rgb, $min, $max);",
        "g": "color.rgb = vec3(dot(color.rgb, vec3(0.299, 0.587, 0.114)));",
        "o": "color.rgb = mix(color.rgb, orig.rgb, $orig);",
        "t": "color.rgb = vec3(dot(color.rgb, $red), dot(color.rgb, $green), dot(color.rgb, $blue));",
        "b": "color.rgb = color.rgb;"
    },

    diffuse: true,

    preFragment: [
        // Lut from https://github.com/mattdesl/glsl-lut
        "vec4 $lut(vec4 textureColor) {",
        "    #ifndef $LUT_NO_CLAMP",
        "        textureColor = clamp(textureColor, 0.0, 1.0);",
        "    #endif",

        "    mediump float blueColor = textureColor.b * 63.0;",

        "    mediump vec2 quad1;",
        "    quad1.y = floor(floor(blueColor) / 8.0);",
        "    quad1.x = floor(blueColor) - (quad1.y * 8.0);",

        "    mediump vec2 quad2;",
        "    quad2.y = floor(ceil(blueColor) / 8.0);",
        "    quad2.x = ceil(blueColor) - (quad2.y * 8.0);",

        "    highp vec2 texPos1;",
        "    texPos1.x = (quad1.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);",
        "    texPos1.y = (quad1.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g);",

        "    #ifdef $LUT_FLIP_Y",
        "        texPos1.y = 1.0-texPos1.y;",
        "    #endif",

        "    highp vec2 texPos2;",
        "    texPos2.x = (quad2.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);",
        "    texPos2.y = (quad2.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g);",

        "    #ifdef $LUT_FLIP_Y",
        "        texPos2.y = 1.0-texPos2.y;",
        "    #endif",

        "    lowp vec4 newColor1 = texture2D($texture, texPos1);",
        "    lowp vec4 newColor2 = texture2D($texture, texPos2);",

        "    lowp vec4 newColor = mix(newColor1, newColor2, fract(blueColor));",
        "    return newColor;",
        "}",

        "vec3 $rgb2hsv(vec3 c){",
        
        "    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);",
        "    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));",
        "    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));",

        "    float d = q.x - min(q.w, q.y);",
        "    float e = 1.0e-10;",
        "    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);",
        "}",

        "vec3 $hsv2rgb(vec3 c)",
        "{",
        "    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);",
        "    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);",
        "    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);",
        "}",

        "void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth){",
        "vec3 orig = color.rgb;",
    ].join("\n")
});