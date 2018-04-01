SSAO
========

Alchemy Screen Space Ambient Obscurance 

| Schema        | Type           | Default  | Description  |
| ------------- |:-------------:| -----:| :---: |
| samples | integer | 16 | The number of depth samples to get for every pixel. |
| rings | integer | 5 | The number of rings to distribute the samples. Should be odd. |
| radius | float | 0.5 | Radius of sampling in normalized screen coordinates(0-1).|
| ratio | float | 0.5 | The ratio of the ssao render target. Affects performance |
| intensity | float | 1.0 | Intensity of the final ssao composition |
| scale | float | 0.15 | Relative to the camera far range. 0-1 |
| blurRadius | integer | 7 | Radius for the blur. 0 disables |
| depthCutoff | float | 10 | In camera units, controls spillage of ssao on edges |