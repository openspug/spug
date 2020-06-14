/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
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
