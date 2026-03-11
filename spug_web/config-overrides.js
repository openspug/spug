const {override, addDecoratorsLegacy, addLessLoader} = require('customize-cra');

module.exports = override(
  addDecoratorsLegacy(),
  addLessLoader({
    lessOptions: {
      javascriptEnabled: true,
      modifyVars: {
        '@primary-color': '#2563fc'
      }
    }
  }),
);
