/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
const {override, addDecoratorsLegacy, addLessLoader} = require('customize-cra');

module.exports = override(
  addDecoratorsLegacy(),
  addLessLoader({
    lessOptions: {
      javascriptEnabled: true,
      modifyVars: {
        '@primary-color': '#6c7cff',
        '@link-color': '#6c7cff',
        '@success-color': '#3dd598',
        '@warning-color': '#ffb648',
        '@error-color': '#ff7a7a',
        '@border-radius-base': '8px',
        '@body-background': '#f5f7fb',
        '@layout-body-background': '#f5f7fb'
      }
    }
  }),
);
