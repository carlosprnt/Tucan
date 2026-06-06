module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Unistyles 3 babel plugin — processes components under `root` so styles
      // react to theme/runtime changes without re-rendering the tree.
      ['react-native-unistyles/plugin', { root: 'src' }],
    ],
  };
};
