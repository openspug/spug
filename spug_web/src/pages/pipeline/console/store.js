/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from 'mobx';
import { transfer } from '../utils';

class Store {
  host_id = null;
  @observable token = null;
  @observable record = null;
  @observable node = {};
  @observable nodes = [];
  @observable outputs = {};
  @observable dynamicParams = null;

  @computed get nodeID() {
    return this.node._id ?? this.node.id
  }

  @computed get matrixNodes() {
    return transfer(this.nodes)
  }
}

export default new Store()
