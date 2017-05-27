aframe-effects
========

A post processing framework for A-Frame (Requires version >= 0.6.0 or current master)

### Usage ###

### Downloads

To embed this library in your project, include this file:

* [`aframe-effects.min.js`](http://wizgrav.github.io/aframe-effects/dist/aframe-effects.min.js)

For the unminified version for local development (with source maps), include this file:

* [`aframe-effects.js`](http://wizgrav.github.io/aframe-effects/dist/aframe-effects.js)

### npm

First install from npm:

```sh
npm install aframe-effects
```

And in your Browserify/Webpack modules, simply require the module:

```js
require('aframe-effects')
```

### Instructions ###

The chain of effects to apply to the scene can be defined through the effects system. Componens that are used as tokens must be attached somewhere in the scene.

```
    <a-scene effects="bloom, fxaa" bloom="radius: 0.66" fxaa>
```


Check the documentation for the [effects system](systems/README.md) and [effect components](components/README.md)


## License

This program is free software and is distributed under an [MIT License](LICENSE).
