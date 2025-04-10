const path = require('path');

const { makeMetroConfig } = require('@rnx-kit/metro-config');
module.exports = makeMetroConfig({
  projectRoot: path.join(__dirname, 'example'),
  watchFolders: [__dirname],
  resolver: {
    resolverMainFields: ['main-internal', 'browser', 'main'],
    extraNodeModules: {
      'react-native-bootpay-api': __dirname,
    },
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(path.join(__dirname, 'example'), 'node_modules'),
    ],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
});
