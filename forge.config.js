const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'Chrononaut',
    executableName: 'Chrononaut',
    icon: path.join(__dirname, 'public/icons/icon'),
    appBundleId: 'com.chrononaut.app',
    appCategoryType: 'public.app-category.productivity',
    extraResource: [
      path.join(__dirname, 'public/icons'),
    ],
  },
  rebuildConfig: {},
  hooks: {
    generateAssets: async () => {
      const { execSync } = require('child_process');
      console.log('Compiling TypeScript...');
      execSync('npx tsc -p tsconfig.electron.json', { stdio: 'inherit' });
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'Chrononaut',
        icon: path.join(__dirname, 'public/icons/icon.icns'),
        format: 'ULFO',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
