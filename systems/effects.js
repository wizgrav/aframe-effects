// Copyright 2017 Yannis Gravezas <wizgrav@gmail.com> MIT licensed

AFRAME.registerSystem("effects", {
    schema: { type: "array", default: [] },

    init: function () {
        this.effects = {};
        this.enabled = {};
        this.passes = [];
        this._passes = [];
        this.cameras = [];
        this.setupPostState();
        this.needsOverride = true;
    },

    update: function () {
        this.needsUpdate = true;
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

    renderPass: function (material, renderTarget, viewCb, forceClear){
        var renderer = this.sceneEl.renderer;
        this.quad.material = material;
        var s = renderTarget || renderer.getSize();
        if (viewCb) {
            if(this.cameras.length > 1){
                setView(0, 0, Math.round(s.width * 0.5), s.height);
                viewCb(material, this.cameras[0], [0.5,0,0,0.5], true);
			    renderer.render(this.scene, this.camera, renderTarget, forceClear);        
                
                setView(Math.round(s.width * 0.5), 0, Math.round(s.width * 0.5), s.height);
                viewCb(material, this.cameras[1], [0.5,0.5,0.5,1], true);
                renderer.render( this.scene, this.camera, renderTarget, forceClear);

                setView(0, 0, s.width, s.height);
            } else {
                setView(0, 0, s.width, s.height);
                viewCb(material, this.sceneEl.camera, [1,0,0,1], false);
                renderer.render( this.scene, this.camera, renderTarget, forceClear);
            }
        } else {
            setView(0, 0, s.width, s.height);
            renderer.render(this.scene, this.camera, renderTarget, forceClear);
        }

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

    materialize: function (s, uniforms, defines) {
        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: typeof s === "string" ? this.vertexShader : s.vertexShader,
            fragmentShader: typeof s === "string" ? s : s.fragmentShader,
            depthWrite: false,
            depthTest: false,
            blending: THREE.NoBlending,
            fog: false,
            extensions: {
                derivatives: true
            },
            defines: defines || {}
        });
    },

    fuse: function (temp, alpha) {
        if (!temp.length) return;
        var chunks = [], head = [], main = [], includes = {}, needsDepth = false, needsDiffuse = false, k; 
        var uniforms = {
            time: this.time,
            resolution: this.resolution
        };
        temp.forEach(function (obj) {
            var prefix = obj.attrName + "_";
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
            if (obj.__dontCallMain__) {
                delete obj.__dontCallMain__;
            } else {
                main.push("  " + obj.attrName + "_main(color, origColor, vUv, depth);");
            }
        });
        var t2u = { "i": "int", "f": "float", "t": "sampler2D",
            "v2": "vec2", "v3": "vec3", "v4": "vec4", "b": "bool" };
        for(k in includes) { head.push("#include <" + k + ">"); }
        var premain = [
            "void main () {", 
        ];
        if (needsDiffuse){
             uniforms["tDiffuse"] = this.tDiffuse;
             premain.push("  vec4 color = texture2D(tDiffuse, vUv);"); 
        } else {
             premain.push("  vec4 color = vec4(1.0);"); 
        }
        premain.push("  vec4 origColor = color;");
        
        if (needsDepth){
            uniforms["tDepth"] = this.tDepth;
            uniforms["cameraFar"] = this.cameraFar;
            uniforms["cameraNear"] = this.cameraNear;
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
        var material = this.materialize(source, uniforms);
        console.log(source, material);
        return material;
    },

    rebuild: function () {
        var self = this, passes = [], temp = [];
        this.passes.forEach(function(pass){
            if (pass.dispose) pass.dispose();
        });
        this.enabled = {};
        this.data.forEach(function (k) {
            var obj, name;
            if (k[0] === "#") {
                var el = document.querySelector(k);
                if(!el) return;
                obj = {
                    attrName: k.replace("#", "script__effect__"),
                    fragment: el.textContent,
                    depth: el.dataset.depth !== undefined,
                    includes: el.dataset.includes ? el.dataset.includes.split(" ") : null
                };
            } else {
                name = k.replace("!", "");
                obj = self.effects[name];
                if (!obj) return;
                self.enabled[name] = true;
            }
            if (obj.pass) {
                pickup();
                passes.push({ pass: pass, behavior: obj } );
            } else if (obj.material){
                pickup();
                passes.push({ pass: makepass(obj.material), behavior: obj });
            } else {
                if (k[k.length-1] === "!") obj.__dontCallMain__ = true;
                temp.push(obj);
            }          
        });

        function pickup () {
            if (!temp.length) return;
            passes.push({ pass: makepass(self.fuse(temp), true)});
            temp = [];
        }

        function makepass (material, dispose) {
            return {
                render: function(renderer, writeBuffer, readBuffer){
                    self.renderPass(material, writeBuffer);
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
        var isEnabled = scene.renderTarget && this.enabled[behavior.attrName] === true ? true : false;
        if (!isEnabled) return false;
        if (resize && (this.needsResize || behavior.needsResize) && behavior.setSize) {
            var size = scene.renderer.getSize();
            behavior.setSize(size.width, size.height);
            delete behavior.needsResize;
        }
        return true;
    },

    isEnabled: function (behavior) {
        return this.enabled[behavior.attrName] === true ? true : false;
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
            rt = this.renderTarget, rts = this.targets;
        if(!rt || !renderer) { return; }
        if (this.needsOverride) {
            var rendererRender = renderer.render;
            renderer.render = function (scene, camera, renderTarget, forceClear) {
                if (renderTarget === rt) {
                    var size = renderer.getSize();
                    if (size.width !== rt.width || size.height !== rt.height) {
                        rt.setSize(size.width, size.height);
                        rts[0].setSize(size.width, size.height);
                        rts[1].setSize(size.width, size.height);
                        self.resolution.value.set(size.width, size.height, 1/size.width, 1/size.height);
                        self.needsResize = true;
                    }
                    self.cameras.push(camera);
                }
                rendererRender.call(renderer, scene, camera, renderTarget, forceClear);
            }
            this.needsOverride = false;
        }
        this.cameras = [];
        this.time.value = time / 1000;
        this.timeDelta.value = timeDelta;

        if (this.needsUpdate === true) { this.rebuild(); }

        var arr = [];
        this.passes.forEach(function (p) {
            if (p.behavior && p.behavior.bypass === true) return;
            arr.push(p);
        });
        this.sceneEl.renderTarget = arr.length ? rt : null;
        this._passes = arr;

        this.tDiffuse.value = this.renderTarget.texture;
        this.tDepth.value = this.renderTarget.depthTexture;
        var camera = this.sceneEl.camera;
        this.cameraFar.value = camera.far;
        this.cameraNear.value = camera.near;                
    },

    setState: function () {

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
    }
});