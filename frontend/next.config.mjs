// /** @type {import('next').NextConfig} */
// const nextConfig = {};

// export default nextConfig;

import path from 'path';
import { fileURLToPath } from 'url';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
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
    CESIUM_BASE_URL: '/cesium-assets',
  },
};

export default nextConfig;
