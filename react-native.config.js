const project = (() => {
  const path = require('path');
  try {
    const { configureProjects } = require('react-native-test-app');
    return configureProjects({
      android: {
        sourceDir: path.join('example', 'android'),
      },
      ios: {
        sourceDir: 'example/ios',
      }, 
    });
  } catch (e) {
    return undefined;
  }
})();

module.exports = {
  dependencies: {
    // Help rn-cli find and autolink this library
    'react-native-bootpay-api': {
      root: __dirname,
    },
  }, 
  ...(project ? { project } : undefined),
};



// const project = (() => {
//   const fs = require('fs');
//   const path = require('path');
//   try {
//     const {
//       androidManifestPath,
//       // iosProjectPath,
//       windowsProjectPath,
//     } = require('react-native-test-app');
//     return {
//       android: {
//         sourceDir: path.join('example', 'android'),
//         manifestPath: androidManifestPath(
//           path.join(__dirname, 'example', 'android'),
//         ),
//       },
//       ios: {
//         sourceDir: 'example/ios',
//       },
//       // ios: {
//       //   project: iosProjectPath('example/ios'),
//       // }, 
//     };
//   } catch (_) {
//     return undefined;
//   }
// })();

// module.exports = {
//   dependencies: {
//     // Help rn-cli find and autolink this library
//     'react-native-bootpay-api': {
//       root: __dirname,
//     },
//   }, 
//   ...(project ? { project } : undefined),
// };
