module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Work around a Webpack module concatenation crash on newer Node runtimes.
      webpackConfig.optimization = webpackConfig.optimization || {};
      webpackConfig.optimization.concatenateModules = false;
      return webpackConfig;
    },
  },
};
