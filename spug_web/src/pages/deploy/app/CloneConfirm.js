/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Cascader, Form, Alert } from 'antd';
import envStore from 'pages/config/environment/store';
import store from './store';
import lds from 'lodash';
import { toJS } from "mobx";

@observer
class CloneConfirm extends React.Component {
  handleLoadData = (selectedOptions) => {
    const targetOption = selectedOptions[selectedOptions.length - 1];
    if (targetOption.deploys === undefined) {
      targetOption.loading = true;
      store.loadDeploys(targetOption.value).then(() => targetOption.loading = false)
    }
  }

  handleData = records => {
    return records.map(x => {
      const option = {
        label: x.name,
        value: x.id,
        deploys: x.deploys,
        isLeaf: false
      }
      if (x.children) {
        option.children = x.children
      } else if (x.deploys) {
        option.children = x.deploys.map(item => ({
          label: lds.get(envStore.idMap, `${item.env_id}.name`),
          value: JSON.stringify(item),
          id: `${x.id},${item.env_id}`,
        }))
      }
      return option
    })
  }

  filter = (inputValue, path) => {
    return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
  }

  render() {
    const options = this.handleData(Object.values(toJS(store.records)));
    return (
      <Form>
        <Form.Item
          required
          label="应用及环境"
          help="克隆配置，将基于选择对象的配置来创建新的发布配置。"
          extra={<Alert showIcon type="warning" message="使用搜索进行选择时可能需要选择两次。"/>}>
          <Cascader
            options={options}
            placeholder="请选择目标应用及环境"
            loadData={this.handleLoadData}
            onChange={this.props.onChange}
            showSearch={{filter: this.filter}}/>
        </Form.Item>
      </Form>
    )
  }
}

export default CloneConfirm