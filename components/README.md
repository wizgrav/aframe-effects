Effect Components
===================== 

Effect components must register and unregister to make the effects system aware of them.

```
    init: function() {
        this.el.sceneEl.systems.effects.register(this);
    },

    remove: function () {
        this.el.sceneEl.systems.effects.unregister(this);
    }
```

The effects system also provides utilities to assist in writing post processing components, check [it's readme](../systems/README.md).

There are three general types of effect components:

#### 1) Material/Pass components. 

These are treated as a separate pass in the chain that will get executed autonomously, just like three's effect composer does. By toggling a **.bypass** boolean property on components of this type, they can be skipped in the effect chain execution without having to actually reset the chain, which can be costly. 

To create this type of components the developer needs to set a .pass or .material property with the appropriate three object. Materials will internally be wrapped in passes and need to have tDiffuse and/or tDepth uniforms defined for the texture passing between passes to work. Passes should loosely follow the three effect composers structure, in particular they must have a **render(renderer, writeBuffer, readBuffer )** method.

#### 2) Fusable components.

Continuous chains of these components will be fused together in a single material pass for efficiency. Material/Pass components will split the chains and create more passes. To enable them the component needs to have a **.fragment** property defined with the glsl text to be fused. 

To avoid name clash tokens specific to each component must be prefixed with **"$"** which will be expanded with each components attrName + "_" at fuse time(check the console for the generated source). 

The texts of all components in the chain will be concatenated into a single shader source. Every fusable fragment must contain a function with the signature **"void $main(inout vec color, vec4 origColor, vec2 uv float depth)"**. This function will be called in the order of the chain by default, but this can be overriden by appending an **'!'** to component names when specifying the effects system chain. 

Processing should modify the **color** argument which is the current color as processed so far in the chain. **origColor** is the original color the chain started with, **uv** is the uv of the full screen quad and **depth** is the value from the depth texture, in perspective depth.

If the color or depth texel from the previous pass(which initially will be the scene's renderTarget) is desired, the developer must also declare a boolean property **.diffuse = true** on the component. Same for the depth texture texel with **.depth = true**. If not declared the values will default to vec4(0.) for the color and 0 for the depth. If one or more fused effects define these properties they will activate for the whole chain.

If a **.uniforms** object is also declared, it's members will be included in the final shader, again with the appropriate prefix. You can then change the values in the components uniforms and these will be reflected in the fused shader.

An **.includes** array can be provided to specify which threejs includes are needed so they can be added only once for the whole chain.

Components that need to do preprocessing and generate intermediate textures should perform that processing in their **tock()** methods and expose the textures via their **.uniforms** property to feed the blending operation specified in the **.fragment** property. Fusing all final blends and operations that don't need to access adjacent pixels saves alot of bandwidth allowing more effects to be applied in the same budget.

#### 3) Script effects.

These behave like limited fused components but without the need to actually write a component. The effects system accepts **<script>** element ids as tokens in its chain. These scripts should have a custom type attribute, so as to be ignored by the js parser. The contents must be glsl chunks similar to the **.fragment** property described above. 

You can't expose uniforms in this case though a couple of default uniforms are automatically created and updated (this is also true for regular fused components). These uniforms are **"float time"** in seconds, and a **"vec4 resolution"** which contains **(width, height, 1/width, 1/height)** of the scene's renderTarget. 

The depth, diffuse and include properties can be manipulated by declaring **data-diffuse, data-depth and data-includes** respectively. Includes need to be separated with spaces not commas. Depth and diffuse don't need an argument, just declaring them enables the flags. 

Script effects are convenient for prototyping and/or overriding other effect component blends like this:

```js
<script id="custom-blend" data-diffuse>

// We still need to prefix our global tokens with $ for fusion 
// But their expanded form is undefined for script effects.

void $main(inout vec color, vec4 origColor, vec2 uv, float depth) {
	
	// bloom_texture is the expanded symbol of the uniform exposed  
	// by the bloom component .uniforms as "texture": {type: "t", ...}

	vec4 texel = texture2D(bloom_texture, uv);
	color *= texel;

}

</script>

<a-scene effects="bloom! #custom-blend" bloom>
```