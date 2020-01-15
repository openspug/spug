/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import { observable } from "mobx";

class Store {
  @observable outputs = {};
  @observable request = {
    targets: [],
    host_actions: [],
    server_actions: []
  };
}

export default new Store()
