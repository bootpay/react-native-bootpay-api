const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const root = path.resolve(__dirname, '..');
const exampleNodeModules = path.resolve(__dirname, 'node_modules');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  resolver: {
    // example-old 폴더만 제외
    blockList: exclusionList([
      new RegExp(`${root}/example-old/.*`),
    ]),
    // 모든 모듈을 example/node_modules에서 찾도록 설정
    nodeModulesPaths: [exampleNodeModules],
    extraNodeModules: {
      'react-native-bootpay-api': root,
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
