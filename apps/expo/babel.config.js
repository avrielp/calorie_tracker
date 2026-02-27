module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // IMPORTANT: Do not apply TypeScript transform plugin to all files (including node_modules),
    // or JSX in published JS bundles may fail to parse.
    overrides: [
      {
        test: /\.tsx?$/,
        plugins: [
          // Allow `declare` fields used by WatermelonDB models.
          ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
          // WatermelonDB models use decorators (legacy).
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          ['@babel/plugin-proposal-class-properties', { loose: true }],
        ],
      },
    ],
  };
};


