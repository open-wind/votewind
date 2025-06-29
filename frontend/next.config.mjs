// /** @type {import('next').NextConfig} */
// const nextConfig = {};

// export default nextConfig;

import path from 'path';
import { fileURLToPath } from 'url';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';

const assetPrefix = isProd ? '/static-frontend' : '';
// const assetPrefix = '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@radix-ui/primitive',
    '@radix-ui/react-context',
    '@radix-ui/react-id',
    '@radix-ui/react-use-layout-effect',
    '@radix-ui/react-use-controllable-state',
    '@radix-ui/react-use-effect-event',
    '@radix-ui/react-slot',
    '@radix-ui/react-use-callback-ref',
    '@radix-ui/react-use-escape-keydown',
    '@radix-ui/react-dialog',
    'cmdk',
    'tailwind-merge',
    '@vis.gl/react-maplibre',
    '@cesium/engine',
    '@cesium/widgets',
    '@mui/system',
  ],
  webpack(config) {
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Workers'),
            to: 'static/Cesium/Workers',
          },
          {
            from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Assets'),
            to: 'static/Cesium/Assets',
          },
          {
            from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Widgets'),
            to: 'static/Cesium/Widgets',
          },
        ],
      })
    );

    return config;
  },
  env: {
    CESIUM_BASE_URL: `${assetPrefix}/cesium-assets`,
    ASSET_PREFIX: assetPrefix,
  },

  trailingSlash: true,
  assetPrefix: assetPrefix,

  ...(isProd && { output: 'export' }),
};

export default nextConfig;
