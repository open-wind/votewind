const path = require('path');

const isProd = process.env.NODE_ENV === 'production';

const assetPrefix = isProd ? '/static-frontend-legacy' : '';

module.exports = {
  assetPrefix,
  env: {
    ASSET_PREFIX: assetPrefix
  },  
  trailingSlash: true,
  webpack: (config) => {

    config.optimization.minimize = false; 
    config.devtool = 'source-map';
  
    config.resolve.alias['@'] = path.resolve(__dirname);
  
    config.module.rules.push({
      test: /\.(js|mjs)$/,
      include: [
        path.resolve(__dirname, 'node_modules/react-icons'),
        path.resolve(__dirname, 'node_modules/react-icons/io'),
        path.resolve(__dirname, 'node_modules/chroma'),
        path.resolve(__dirname, 'node_modules/lucide-react'),
        path.resolve(__dirname, 'node_modules/@fortawesome/react-fontawesome'),
        path.resolve(__dirname, 'node_modules/@fortawesome/free-solid-svg-icons'),
        path.resolve(__dirname, 'node_modules/@heroicons'),
        path.resolve(__dirname, 'node_modules/react-toastify'),
        path.resolve(__dirname, 'node_modules/@turf'),
        path.resolve(__dirname, 'node_modules/downshift'),
        path.resolve(__dirname, 'node_modules/rc-slider'), 
        path.resolve(__dirname, 'node_modules/rc-slider'), 
        path.resolve(__dirname, 'node_modules/rc-slider/assets'),
        path.resolve(__dirname, 'node_modules/rc-slider/es'),
        path.resolve(__dirname, 'node_modules/rc-slider/lib'),
        path.resolve(__dirname, 'node_modules/rc-tooltip'), 
        path.resolve(__dirname, 'node_modules/rc-tooltip/assets'),
        path.resolve(__dirname, 'node_modules/rc-tooltip/es'),
        path.resolve(__dirname, 'node_modules/rc-tooltip/lib'),
        path.resolve(__dirname, 'node_modules/@csstools/convert-colors'), 
        path.resolve(__dirname, 'node_modules/robust-predicates'),
        path.resolve(__dirname, 'node_modules/point-in-polygon-hao'),
        path.resolve(__dirname, 'node_modules/@rc-component'),
      ],
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', {
              targets: { 
                ie: '11'
              },
              useBuiltIns: 'entry',
              corejs: 3
            }]
          ]
        }
      }
    });

    return config;
  }
};
