import { Config } from '@remotion/cli/config';
import { enableTailwind } from '@remotion/tailwind-v4';

// Lossless intermediates: the film lives in deep blacks and soft gradients,
// JPEG intermediates band visibly in the #080808 end card.
Config.setVideoImageFormat('png');
Config.setOverwriteOutput(true);
// WebGL needs a real GL backend in headless Chromium. 'angle' uses the GPU;
// pass --gl=swangle on GPU-less machines (CI, containers).
Config.setChromiumOpenGlRenderer('angle');
// Transmission + DOF + bloom frames are heavy; don't oversubscribe the GPU.
Config.setConcurrency(2);
Config.setDelayRenderTimeoutInMilliseconds(120000);
Config.overrideWebpackConfig((config) => enableTailwind(config));
