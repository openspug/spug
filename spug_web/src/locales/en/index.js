/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 *
 * English translation dictionaries, keyed by the original Chinese text.
 * The per-module dictionaries are merged first, then the base glossary is
 * applied last so that shared terms stay consistent across the app.
 */
import base from './base';
import layout from './layout';
import dashboard from './dashboard';
import host from './host';
import exec from './exec';
import deployApp from './deploy_app';
import deployOps from './deploy_ops';
import pipeline from './pipeline';
import schedule from './schedule';
import monitor from './monitor';
import config from './config';
import alarm from './alarm';
import system from './system';
import systemSetting from './system_setting';
import ssh from './ssh';

export default Object.assign(
  {},
  layout,
  dashboard,
  host,
  exec,
  deployApp,
  deployOps,
  pipeline,
  schedule,
  monitor,
  config,
  alarm,
  system,
  systemSetting,
  ssh,
  base,
);
