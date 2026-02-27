module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Ensure TypeScript syntax is transformed BEFORE decorators / class properties.
      // Expo preset includes TS transform, but presets run after plugins.
      ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
      // WatermelonDB models use decorators (legacy).
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-proposal-class-properties', { loose: true }],
    ],
  };
};


