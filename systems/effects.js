// Copyright 2017-2019 Yannis Gravezas <wizgrav@gmail.com> MIT licensed

var sizeVector = new THREE.Vector2();

AFRAME.registerSystem("effects", {
    schema: { type: "array", default: [] },

    init: function () {
        this.effects = {};
        this.passes = [];
        this._passes = [];
        this.cameras = [];
        this.setupPostState();
        this.needsOverride = true;
        this.lightComponents = [];
		this.LightState = {
			rows: 0,
			cols: 0,
			width: 0,
			height: 0,
			tileData: { value: null },
			tileTexture: { value: null },
			lightTexture: {
				value: new THREE.DataTexture( new Float32Array( 32 * 2 * 4 ), 32, 2, THREE.RGBAFormat, THREE.FloatType )
			},
		};
    },

    update: function () {
        this.needsUpdate = true;
    },
    
    addLight: function (behavior) {
		this.lightComponents.push(behavior);
	},
	
	removeLight: function (behavior) {
		var index = this.lightComponents.indexOf(behavior);
		this.lightComponents.splice(index);
    },
    
    setupPostState: function () {
        this.renderTarget = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
        this.renderTarget.texture.generateMipmaps = false;
        this.renderTarget.depthBuffer = true;
        this.renderTarget.depthTexture = new THREE.DepthTexture();
        this.renderTarget.depthTexture.type = THREE.UnsignedShortType;
        this.renderTarget.depthTexture.minFilter = THREE.LinearFilter;
        this.renderTarget.stencilBuffer = false;
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
        this.quad.frustumCulled = false;
        this.scene.add(this.quad);
        this.sceneLeft = new THREE.Scene();
        this.quadLeft = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
        this.quadLeft.geometry.attributes.uv.array.set([0, 1, 0.5, 1, 0, 0, 0.5, 0]);
        this.quadLeft.frustumCulled = false;
        this.sceneLeft.add(this.quadLeft);
        this.sceneRight = new THREE.Scene();
        this.quadRight = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
        this.quadRight.geometry.attributes.uv.array.set([0.5, 1, 1, 1, 0.5, 0, 1, 0]);
        this.quadRight.frustumCulled = false;
        this.sceneRight.add(this.quadRight);
        this.targets = [
            new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }),
            new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat })
        ];
        
        this.tDiffuse = {type: "t", value: null};
        this.tDepth = {type: "t", value: this.renderTarget.depthTexture};
        this.cameraFar = {type: "f", value: 0};
        this.cameraNear = {type: "f", value: 0};
        this.time = { type: "f", value: 0 };
        this.timeDelta = { type: "f", value: 0 };
        this.uvClamp = { type: "v2", value: this.uvBoth };
        this.resolution = { type: "v4", value: new THREE.Vector4() };

    },

    vertexShader: [
        '#include <common>',
        'varying vec2 vUv;',
        'void main() {',
        '   vUv = uv;',
        '   gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}'
    ].join('\n'),

    uvLeft: new THREE.Vector2(0, 0.5),
    uvRight: new THREE.Vector2(0.5, 1),
    uvBoth: new THREE.Vector2(0, 1),

    parseToken: /([#a-z0-9\-\_]+)\.{0,1}([#a-z0-9\-\_]*)\s*\({0,1}\s*([\$a-z0-9\-\_\.\s]*)\){0,1}([\!\?]{0,1})/i,

    renderPass: function (material, renderTarget, viewCb, forceClear){
        var renderer = this.sceneEl.renderer;
        this.quad.material = material;
        var isFn = typeof viewCb === "function";
        var s = renderTarget || renderer.getSize(sizeVector);
        this.resolution.value.set(s.width || sizeVector.x, s.height || sizeVector.y, 1/(s.width || sizeVector.x), 1/(s.height || sizeVector.y));
        var oldClear = renderer.autoClear;
        renderer.autoClear = false;
        if (viewCb) {
            if (this.cameras.length > 1){
                this.quadLeft.material = material;
                this.uvClamp.value = this.uvLeft;
                setView(0, 0, Math.round(s.width * 0.5), s.height);
                if (isFn) viewCb(material, this.cameras[0], -1);
                renderer.setRenderTarget(renderTarget);
			    renderer.render(this.sceneLeft, this.camera);        
                renderer.setRenderTarget(null);
                this.quadRight.material = material;
                this.uvClamp.value = this.uvRight;
                setView(Math.round(s.width * 0.5), 0, Math.round(s.width * 0.5), s.height);
                if (isFn) viewCb(material, this.cameras[1], 1);
                renderer.setRenderTarget(renderTarget);
                renderer.render( this.sceneRight, this.camera);
                renderer.setRenderTarget(null);
                
                this.uvClamp.value = this.uvBoth;
                setView(0, 0, s.width, s.height);
            } else {
                setView(0, 0, s.width, s.height);
                if (isFn) viewCb(material, this.sceneEl.camera, 0);
                renderer.setRenderTarget(renderTarget);
                renderer.render( this.scene, this.camera);
                renderer.setRenderTarget(null);
            }
        } else {
            setView(0, 0, s.width, s.height);
            renderer.setRenderTarget(renderTarget);
            renderer.render(this.scene, this.camera);
            renderer.setRenderTarget(null);
        }
        renderer.autoClear = oldClear;
        function setView(x,y,w,h) {
            if (renderTarget) {
                renderTarget.viewport.set( x, y, w, h );
				renderTarget.scissor.set( x, y, w, h );
            } else {
                renderer.setViewport( x, y, w, h );
				renderer.setScissor( x, y, w, h );
            }
        }
    },

    materialize: function (m) {
        var fs = [
            "uniform vec2 uvClamp;",
            "vec4 textureVR( sampler2D sampler, vec2 uv ) {",
            " return texture2D(sampler, vec2(clamp(uv.x, uvClamp.x, uvClamp.y), uv.y));",
            "} ",
            m.fragmentShader            
        ].join("\n");
        
        m.uniforms.uvClamp = this.uvClamp;
        
        return new THREE.ShaderMaterial({
            uniforms: m.uniforms,
            vertexShader: m.vertexShader || this.vertexShader,
            fragmentShader: fs,
            depthWrite: false,
            depthTest: false,
            blending: THREE.NoBlending,
            fog: false,
            extensions: {
                derivatives: true
            },
            defines: m.defines || {}
        });
    },

    fuse: function (temp, alpha) {
        if (!temp.length) return;
        var self = this, count=0;
        var chunks = [], head = [], main = [], includes = {}, 
            needsDepth = false, needsDiffuse = false, k;
 
        var uniforms = {
            time: this.time,
            timeDelta: this.timeDelta,
            resolution: this.resolution
        };

        temp.forEach(function (obj) {
            var callMain = true, swapMain = false, args=[];
            if (typeof obj === "string") {
                var tok = self.parseToken.exec(obj);
                if(!tok) return;
                
                callMain = tok[4] !== "!";
                swapMain = tok[4] === "?";
                obj = tok[1];
                var prop = tok[2];
                var temp = {};
                
                if(obj[0] === "#") {
                    var el = document.querySelector(obj);
                    if(!el) return;
                    
                    obj = {
                        attrName: [obj.replace("#", "script_"), "_", (count++), "_"].join(""),
                        fragment: prop ? 
                            (el[prop] instanceof Document ? el[prop].body.textContent : el[prop]) 
                            : el.textContent,
                        depth: el.dataset.depth !== undefined,
                        diffuse: el.dataset.diffuse !== undefined,
                        includes: el.dataset.includes ? el.dataset.includes.trim().split(" ") : null,
                        defaults: el.dataset.defaults ? el.dataset.defaults.trim().split(" ") : null
                    };
                } else {
                    obj = self.effects[obj];
                    if (!obj) return;
                    if (prop) {
                        obj = obj.exports ? obj.exports[prop] : null;
                        if (!obj) return;
                        obj.attrName = tok[1] + "_" + prop + "_";
                    }
                }
                if (tok[3]) {
                    args = tok[3].trim().split(" ");
                }
            }
            var prefix = (obj.attrName ? obj.attrName : "undefined_" + (count++)) + "_";
            prefix = prefix.replace("__","_");
            if (obj.defaults) {
                obj.defaults.forEach(function (d, i) {
                    var v = args[i];
                    chunks.push(["#define $", i, " ", v  && v !== "$" ? v : d ].join("").replace(/\$/g, prefix).replace("__","_"));
                });
            }
            if (obj.diffuse) { needsDiffuse = true; }
            if (obj.depth) { needsDepth = true; }
            if (obj.fragment) { chunks.push(obj.fragment.replace(/\$/g, prefix)); }
            if (obj.uniforms) {
                for (var u in obj.uniforms) {
                    uniforms[prefix + u] = obj.uniforms[u];
                }
            };
            if (obj.includes) {
                obj.includes.forEach(function (inc) {
                    includes[inc] = true;
                });
            }
            if (callMain) {
                main.push(["  ", prefix, "main(", ( swapMain ? "origColor, color": "color, origColor"), ", vUv, depth);"].join(""));
            }
        });
        var t2u = { "i": "int", "f": "float", "t": "sampler2D",
            "v2": "vec2", "v3": "vec3", "c": "vec3","v4": "vec4", 
            "m2": "mat2", "m3":"mat3", "m4": "mat4", "b": "bool" };

        for(k in includes) { head.push("#include <" + k + ">"); }
        
        var premain = [
            "void main () {" 
        ];
        uniforms["tDiffuse"] = this.tDiffuse;
             
        if (needsDiffuse){
             premain.push("  vec4 color = texture2D(tDiffuse, vUv);"); 
        } else {
             premain.push("  vec4 color = vec4(0.0);"); 
        }
        premain.push("  vec4 origColor = color;"); 
        
        uniforms["tDepth"] = this.tDepth;
        uniforms["cameraFar"] = this.cameraFar;
        uniforms["cameraNear"] = this.cameraNear;
            
        if (needsDepth){
            premain.push("  float depth = texture2D(tDepth, vUv).x;");
        } else {
            premain.push("  float depth = 0.0;");
        }
        
        for(k in uniforms) {
            var u = uniforms[k];
            head.push(["uniform", t2u[u.type], k, ";"].join(" "));
        }
        
        head.push("varying vec2 vUv;");
        var source = [
            head.join("\n"), chunks.join("\n"), "\n",
                premain.join("\n"), main.join("\n"), 
                alpha ? "  gl_FragColor = color;" : "  gl_FragColor = vec4(color.rgb, 1.0);", "}"
        ].join("\n");

        var material = this.materialize({
            fragmentShader: source, 
            uniforms: uniforms
        });

        if(this.sceneEl.components.debug) console.log(source, material);
        return material;
    },

    rebuild: function () {
        var self = this, passes = [], temp = [];
        this.passes.forEach(function(pass){
            if (pass.dispose) pass.dispose();
        });
        this.data.forEach(function (k) {
            if(!k){
                pickup();
                return;
            }
            var obj, name;
            var tok = self.parseToken.exec(k);
            if(!tok || !tok[1]) return;
            name = tok[1];
            obj = self.effects[name];
            if (!obj){
                temp.push(k);
                return;
            }
            if (obj.pass) {
                pickup();
                passes.push({ pass: obj.pass, behavior: obj } );
            } else if (obj.material){
                pickup();
                passes.push({ pass: makepass(obj.material, false, obj.vr), behavior: obj });
            } else {
                temp.push(k);
            }          
        });

        function pickup () {
            if (!temp.length) return;
            passes.push({ pass: makepass(self.fuse(temp), true)});
            temp = [];
        }

        function makepass (material, dispose, viewCb) {
            return {
                render: function(renderer, writeBuffer, readBuffer){
                    self.renderPass(material, writeBuffer, viewCb);
                },

                dispose: function () {
                    if (dispose) material.dispose();
                }
            }
        }
        pickup();
        this.needsUpdate = false;
        this.passes = passes;
    },

    isActive: function (behavior, resize) {
        var scene = this.sceneEl;
        if (behavior.bypass) return false;
        var isEnabled = scene.renderTarget ? true : false;
        if (!isEnabled) return false;
        if (resize && (this.needsResize || behavior.needsResize) && behavior.setSize) {
            var size = scene.renderer.getSize(sizeVector);
            behavior.setSize(sizeVector.x, sizeVector.y);
            delete behavior.needsResize;
        }
        return true;
    },

    register: function (behavior) {
        this.effects[behavior.attrName] = behavior;
        this.needsUpdate = true;
    },

    unregister: function (behavior) {
        delete this.effects[behavior.attrName];
        this.needsUpdate = true;
    },

    tick: function (time, timeDelta) {
        var self = this, sceneEl = this.sceneEl, renderer = sceneEl.renderer, effect = sceneEl.effect, 
            rt = this.renderTarget, rts = this.targets, scene = sceneEl.object3D;
        if(!rt || !renderer) { return; }
        if (this.needsOverride) {
            if(scene.onBeforeRender) {
                scene.onBeforeRender = function (renderer, scene, camera) {
                    var size = renderer.getSize(sizeVector);
                    if (sizeVector.x !== rt.width || sizeVector.y !== rt.height) {
                        rt.setSize(size.width, size.height);
                        rts[0].setSize(size.width, size.height);
                        rts[1].setSize(size.width, size.height);
                        self.resolution.value.set(size.width, size.height, 1/size.width, 1/size.height);
                        self.needsResize = true;
                        self.resizeTiles();
                    }
                    if(camera instanceof THREE.ArrayCamera) {
                        self.cameras = camera.cameras;
                    } else {
                        self.cameras.push(camera);
                    }
                    self.tileLights(renderer, scene, camera);
                }
            } else {
                var rendererRender = renderer.render;
                renderer.render = function (scene, camera, renderTarget, forceClear) {
                    if (renderTarget === rt) {
                        var size = renderer.getSize(sizeVector);
                        if (sizeVector.x !== rt.width || sizeVector.y !== rt.height) {
                            rt.setSize(size.width, size.height);
                            rts[0].setSize(size.width, size.height);
                            rts[1].setSize(size.width, size.height);
                            self.resolution.value.set(size.width, size.height, 1/size.width, 1/size.height);
                            self.needsResize = true;
                        }
                        self.cameras.push(camera);
                    }
                    renderer.setRenderTarget(renderTarget);
                    rendererRender.call(renderer, scene, camera);
                    renderer.setRenderTarget(null);
                }
            }        
            this.needsOverride = false;
        }
        this.cameras = [];
        this.time.value = time / 1000;
        this.timeDelta.value = timeDelta / 1000;

        if (this.needsUpdate === true) { this.rebuild(); }

       this.setupPasses();

        this.tDiffuse.value = this.renderTarget.texture;
        this.tDepth.value = this.renderTarget.depthTexture;
        var camera = this.sceneEl.camera;
        this.cameraFar.value = camera.far;
        this.cameraNear.value = camera.near;                
    },

    setupPasses : function () {
        var arr = [], rt = this.renderTarget;
        this.passes.forEach(function (p) {
            if (p.behavior && p.behavior.bypass === true) return;
            arr.push(p);
        });
        this.sceneEl.renderTarget = arr.length && this.sceneEl.isPlaying ? rt : null;
        this._passes = arr;
    },
    tock: function () {
        var scene = this.sceneEl, renderer = scene.renderer, self = this;
        if(!scene.renderTarget) { return; }
        var rt = scene.renderTarget, rts = this.targets;
        this._passes.forEach(function (pass, i) {
            var r = i ? rts[i & 1] : rt;
            self.tDiffuse.value = r.texture;   
            if (pass.behavior && pass.behavior.resize) self.isActive(pass.behavior, true);
            pass.pass.render(renderer, i < self._passes.length - 1 ? rts[(i+1) & 1] : null, r);
        });
        this.needsResize = false;
    },

    resizeTiles: function () {
        var LightState = this.LightState;
        var width = LightState.width;
        var height = LightState.height;
        LightState.cols = Math.ceil( width / 32 );
        LightState.rows = Math.ceil( LightState.height / 32 );
        LightState.tileData.value = [ width, height, 0.5 / Math.ceil( width / 32 ), 0.5 / Math.ceil( height / 32 ) ];
        LightState.tileTexture.value = new THREE.DataTexture( new Uint8Array( LightState.cols * LightState.rows * 4 ), LightState.cols, LightState.rows );
    },
    
    tileLights: function ( renderer, scene, camera ) {
        if ( ! camera.projectionMatrix ) return;
        var LightState = this.LightState, lights = this.lightComponents;
        var size = renderer.getSize(sizeVector);
        var d = LightState.tileTexture.value.image.data;
        var ld = LightState.lightTexture.value.image.data;
        var viewMatrix = camera.matrixWorldInverse;
        d.fill( 0 );
        var vector = new THREE.Vector3();

        var passes;
        if(camera instanceof THREE.ArrayCamera) {
            passes = [ [0.5, 0, camera.cameras[0]], [0.5, 0.5, camera.cameras[1]]];
        } else {
            passes = [1.0, 0, camera];
        }
        passes.forEach(function(pass){
            lights.forEach( function ( light, index ) {
                vector.setFromMatrixPosition( light.el.object3D.matrixWorld );
                var pw = LightState.width * pass[0];
                var pm = LightState.width * pass[1];
                var bs = self.lightBounds( pass[2], vector, light.data.radius, pw );
                vector.applyMatrix4( viewMatrix );
                vector.toArray( ld, 4 * index );
                ld[ 4 * index + 3 ] = light.data.radius;
                light.data.color.toArray( ld, 32 * 4 + 4 * index );
                ld[ 32 * 4 + 4 * index + 3 ] = light.data.decay;
                if ( bs[ 1 ] < 0 || bs[ 0 ] > pw || bs[ 3 ] < 0 || bs[ 2 ] > LightState.height ) return;
                if ( bs[ 0 ] < 0 ) bs[ 0 ] = 0;
                if ( bs[ 1 ] > pw ) bs[ 1 ] = pw;
                if ( bs[ 2 ] < 0 ) bs[ 2 ] = 0;
                if ( bs[ 3 ] > LightState.height ) bs[ 3 ] = LightState.height;
                var i4 = Math.floor( index / 8 ), i8 = 7 - ( index % 8 );
                for ( var i = Math.floor( bs[ 2 ] / 32 ); i <= Math.ceil( bs[ 3 ] / 32 ); i ++ ) {
                    for ( var j = Math.floor( (bs[ 0 ] + pm) / 32  ); j <= Math.ceil( (bs[ 1 ] + pm) / 32 ); j ++ ) {
                        d[ ( LightState.cols * i + j ) * 4 + i4 ] |= 1 << i8;
                    }
                }
            } );
        });
        LightState.tileTexture.value.needsUpdate = true;
        LightState.lightTexture.value.needsUpdate = true;
    },
    
    lightBounds: function () {  
        v = new THREE.Vector3();
        return function ( camera, pos, r, w ) {
            var LightState = this.LightState;
            var minX = w, maxX = 0, minY = LightState.height, maxY = 0, hw = w / 2, hh = LightState.height / 2;
            for ( var i = 0; i < 8; i ++ ) {
                v.copy( pos );
                v.x += i & 1 ? r : - r;
                v.y += i & 2 ? r : - r;
                v.z += i & 4 ? r : - r;
                var vector = v.project( camera );
                var x = ( vector.x * hw ) + hw;
                var y = ( vector.y * hh ) + hh;
                minX = Math.min( minX, x );
                maxX = Math.max( maxX, x );
                minY = Math.min( minY, y );
                maxY = Math.max( maxY, y );
            }
            return [ minX, maxX, minY, maxY ];
    };
    }()
});
