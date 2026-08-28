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
    // 모든 모듈을 example/node_modules에서 찾도록 설정.
    // disableHierarchicalLookup 이 없으면 SDK 소스(`..`)에서 react 를 resolve 할 때
    // Metro 가 상위 탐색으로 `../node_modules/react` 를 먼저 집는다. SDK 루트에서
    // `yarn install`(lint/test 에 필요) 을 한 순간 React 가 두 벌 로드되어
    // "Cannot read property 'useContext' of null" 로 앱이 죽는다.
    nodeModulesPaths: [exampleNodeModules],
    disableHierarchicalLookup: true,
    extraNodeModules: {
      'react-native-bootpay-api': root,
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
