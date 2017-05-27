Bloom
========

Makes bright things glow. Adapted from threejs UnrealBloomPass.

| Schema        | Type           | Default  | Description  |
| ------------- |:-------------:| -----:| :---: |
| strength      | number | 1.0 | Intensity of the effect  |
| radius      | number      |   0.4 | How far will the glow reach |
| threshold | are neat      |    0.8 | default filters luminance threshold |
| filter| string | "" | if set, it will use the specified fusable component / script effect for filtering the scene rendering to generate the input for the blur. An empty string will instead make use of the, luminance based, default|