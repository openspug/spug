/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from 'mobx';
import { transfer } from '../utils';

class Store {
  @observable token = null;
  @observable record = null;
  @observable node = {};
  @observable nodes = [];
  @observable outputs = {};
  @observable dynamicParams = null;
  // 历史回放：已结束的记录不再连 websocket，仍在执行的从 wsIndex 处接着收
  @observable readonly = false;
  @observable wsIndex = 0;

  @computed get nodeID() {
    if (['ssh_exec', 'data_transfer', 'data_upload'].includes(this.node.module)) {
      if (!this.node._host_id) this.node._host_id = this.node._targets[0].id
      return `${this.node.id}.${this.node._host_id}`
    } else if (this.node.module === 'build') {
      this.node._host_id = this.node.target
    }
    return this.node.id
  }

  @computed get matrixNodes() {
    return transfer(this.nodes)
  }
}

export default new Store()
