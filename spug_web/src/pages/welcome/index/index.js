/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import {Card } from 'antd';
import { t } from 'libs';

export default function (props) {
  return (
    <Card>
      <div>{t('{}, 欢迎你', localStorage.getItem('nickname'))}</div>
    </Card>
  )
}
