if (!window.AFRAME) {
    var Component = function (el, id) {
        var self = this;
        this.el = el;
        this.el;
        this.id = id;
        this.attrName = this.name + (id ? '__' + id : '');
        this.el.components[this.attrName] = this;
        this.data = {};
    };

    var System = function (el) {
        var self = this;
        this.el = this.sceneEl = el;
        this.el.systems[this.name] = this;
    };

    AFRAME = {
        components: {},
        systems: {},
        registerShader: function () {}
    };

    AFRAME.registerComponent = function (name, definition) {
        var NewComponent;
        var proto = {};

        Object.keys(definition).forEach(function (key) {
            proto[key] = {
                value: definition[key],
                writable: true
            };
        });

        NewComponent = function (el, attr, id) {
            Component.call(this, el, attr, id);
        };

        NewComponent.prototype = Object.create(Component.prototype, proto);
        NewComponent.prototype.name = name;
        NewComponent.prototype.constructor = NewComponent;

        AFRAME.components[name] = NewComponent;
        return NewComponent;              
    };

    AFRAME.registerSystem = function (name, definition) {
        var NewSystem;
        var proto = {};

        Object.keys(definition).forEach(function (key) {
            proto[key] = {
                value: definition[key],
                writable: true
            };
        });

        NewSystem = function (el, attr, id) {
            System.call(this, el, attr, id);
        };

        NewSystem.prototype = Object.create(System.prototype, proto);
        NewSystem.prototype.name = name;
        NewSystem.prototype.constructor = NewSystem;

        AFRAME.systems[name] = NewSystem;
        return NewSystem;              
    };

    var fx = function(renderer, scene, cameras) {
        this.sceneEl = this;
        this.renderTarget = null;
        this.renderer = renderer;
        this.object3D = scene;
        this.cameras = Array.isArray(cameras) ? cameras : [cameras];
        this.components = {};
        this.systems = {};
        this.isPlaying = true;
        this.systems.effects = new AFRAME.systems.effects(this)
        this.systems.effects.init();
    };

    fx.prototype = Object.create({}, {
        chain: {
            value: function(chain) {
                var sys = this.systems.effects, self = this;
                var oldData = sys.data;
                sys.data = chain;
                sys.update(oldData);
                sys.tick(0,0);
            }
        },

        camera: {
            set: function(cameras) {
                this.cameras = Array.isArray(cameras) ? cameras : [cameras];
            },
            
            get: function () {
                return this.cameras[0];
            }
        },

        scene: {
            set: function(v) {
                this.object3D = v;
            },
            
            get: function () {
                return this.object3D;
            }
        },

        init: {
            value: function(name) {
                this.remove(name);
                var arr = name.split("__");
                var pro = AFRAME.components[arr[0]];
                if(!pro) return null;
                var obj = new pro(this, arr[1]);
                if(obj.schema.type || obj.schema.default) {
                    obj.data = obj.schema.default;
                } else {
                    for(var i in obj.schema) {
                        obj.data[i] = obj.schema[i].default;
                    }
                }
                if(obj.init) obj.init();
                if(obj.update) obj.update({});
                return obj;
            }
        },

        update: {
            value: function(name, data) {
                var obj = this.components[name];
                if(!obj) { obj = this.init(name); }
                if(!obj || data === undefined) return;
                
                var oldData = obj.data, nd = obj.data, schema = obj.schema;
                if (obj.schema.type || obj.schema.default) {
                    obj.data = data;
                } else {
                    oldData = {};
                    for(var o in nd) {
                        oldData[o] = nd[o];
                        if (data[o]) nd[o] = data[o]; 
                    }
                }
                if(obj.update) obj.update(oldData);
            }
        },

        remove: {
            value: function(name) {
                var obj = this.components[name];
                if(obj && obj.remove) { obj.remove(); }
                delete this.components[name];
            }
        },

        render: { 
            value: function(time) {
                var behaviors = this.components;
                var sys = this.systems.effects;

                var timeDelta = this.time ? time - this.time : 0;
                this.time = time;

                for(var b in behaviors) {
                    var behavior = behaviors[b];
                    if (behavior.tick) behavior.tick(time, timeDelta);
                }

                sys.tick(time, timeDelta);
                sys.cameras = this.cameras;

                for(var b in behaviors) {
                    var behavior = behaviors[b];
                    if (behavior.tock) behavior.tock(time, timeDelta);
                }

                sys.tock(time, timeDelta);
            }
        }
    });

    window.AFRAME.Effects = fx;
}

require("./systems")
require("./components")
require("./shaders")
