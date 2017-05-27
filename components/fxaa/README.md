Fast Approximate Anti Aliasing
========

Performs screen space anti aliasing baseed on luminance. It normally would be the last effect in the chain. The schema is a single property and accepts a boolean true/false to toggle the effect without having to reset the effects chain. Taken from [mattdesl three-shader-fxaa](https://github.com/mattdesl/three-shader-fxaa)