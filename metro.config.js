const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 确保 src/assets 目录被正确打包
config.watchFolders = config.watchFolders || [];
if (!config.watchFolders.includes(__dirname + '/src')) {
  config.watchFolders.push(__dirname + '/src');
}

module.exports = config;
