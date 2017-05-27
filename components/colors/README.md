Colors
========

Generic chainable operations on color. Check the mode property for customization. Lut parts are taken from [@mattdesl glsl-lut](https://github.com/mattdesl/glsl-lut). Check that for details on use. The default lut png is included in this repos base.


| Schema        | Type           | Default  | Description  |
| ------------- |:-------------:| -----:| :---: |
| mode | string | "map" | a series of characters that define the chain of color operations for this component instance. Check the next table for details. "map" sets up multiply, then add, then raise to power. Resets the effects chain. |
| lut | selector | null | an image element to use as a lut. |
| lutClamp | boolean | false | Check mattdesl's repo. Resets the effects chain. |
| lutFlip | boolean | false | Check mattdesl's repo. Resets the effects chain.|
| add | vec3 | Vector3(0,0,0)| The vec3 to use for the addition operation |
| mul | vec3 | Vector3(1,1,1) | The vec3 to use for the multiply operation |
| pow | vec3 | Vector3(1,1,1) | The vec3 to use for the power operation |
| left | vec3 | Vector3(0,0,0) | The vec3 to use for the smoothstep operation |
| right | vec3 | Vector3(1,1,1) | The vec3 to use for the smoothstep operation |
| min | vec3 | Vector3(0,0,0) | The vec3 to use for the clamp operation |
| max | vec3 | Vector3(1,1,1) | The vec3 to use for the clamp operation |
| quant | vec3 | Vector3(0.2,0.2,0.2) | The vec3 to use for the quantize operation |
| orig | vec3 | Vector3(1,1,1) | The vec3 to use for the mix-original operation |


available mode operations

| Key        | Operation           | Description |
| ------------- |:-------------:| -----:|
| m | multiply| multiply color with the 'mul' schema property |
| a | addition| adds the 'add' schema property to color |
| p | power | raise color to the 'pow' schema property |
| h | rgb to hsv | convert color from rgb to hsv |
| r | hsv to rgb | convert color from hsv to rgb |
| s | smoothstep | perform a smoothstep on color using the 'left' and 'right' schema properties for the bounds|
| l | lut | perform a lookup in the image provided with the 'lut' option |
| q | quantize | Quantize color values. Number of bands is inverse of the 'quant' schema property. Useful for achieving a toon look |
| c | clamp | clamp color using the 'min' and 'max' schema properties as bounds |
| g | grayscale | converts color to grayscale |
| o | mix-original | mix the current color in the chain with the original color, controlled with the 'orig' schema property |
| t | technicolor | Converts color to technicolor |