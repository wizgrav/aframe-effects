AFRAME.registerComponent("lighty", {
	schema: {
		color: { type: "color", default: "#000000" },
		radius: { type: "number", default: 0 },
		decay: { type: "number", default: 1 }
	},
	
	init: function () {
		this.el.sceneEl.systems.effects.addLight(this);
	},
	
	remove: function () {
		this.el.sceneEl.systems.effects.removeLight(this);
	}
});