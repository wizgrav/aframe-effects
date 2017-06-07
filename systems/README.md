Effects system
===================== 

The effects system is the coordinator and final composer of the post processing pipeline. Its schema is a single array property which defines the order of the blending chain. 

The elements in the array can be names of components, which should be already attached somewhere in the scene so they can get picked up. They can also be ids of elements that define script effects.



The system fuses together as many fusable components as it can and creates a chain of passes. In the final composing step the chain is passed the scene's renderTarget as the initial input and full sized render targets are ping ponged  and finally outputs to the canvas.

Effect components must register and unregister to make the system aware of them.

```
    init: function() {
        this.el.sceneEl.systems.effects.register(this);
    },

    remove: function () {
        this.el.sceneEl.systems.effects.unregister(this);
    }
```

The system also exposes several methods to assist in effect component writing.


#### system.isActive( behavior, shouldResize )

```

    // inside a component generating intermediate textures
    tock: function () {

        // If this effect is not meant to run this frame,
        // skip the generation of intermediate textures
        // But if it does and the component has a setSize(w,h)
        // defined and a resize has happened this frame 
        // and the second argument of isActive is set to true
        // then call setSize and pass it the canvas width and height

        if( ! this.el.sceneEl.systems.effects.isActive(this, true) ) {
        	return;
        }

        // generate the textures, set uniforms etc

    }

```

#### system.materialize( shaderMaterialDefinition )

This method returns a ShaderMaterial in which it injects the shared uniforms system.tDiffuse and system.uvClamp. It also prepends the fragment source with a textureVR definition to be used instead of texture2D whenever proper clamping according to view is needed(computed UVs)

#### system.fuse( arrayOfFusableComponents, alpha )

This method accepts an array of objects that contain the properties required to define fusable components. It returns a single ShaderMaterial. The alpha argument toggles setting the final alpha as 1.0 or leaving it as is.

```
init: function () {

    // The following is good practice, could be provided by A-Frame itself
    this.system = this.el.sceneEl.systems.effects;

    this.materialSobel = this.system.fuse(
        [
            {
            	// Glsl chunk for fusion
                fragment: this.sobel, 
                
                // Object exposing uniforms needed by the fragment
                uniforms: this.sobelUniforms,  
                
                // These will only be included once for all fusables
                includes: ["packing"],
                
                // We only need the value from the depth texture
                depth: true 
                
                // So we don't set diffuse for this one
            }
        ]
    );

}
```

