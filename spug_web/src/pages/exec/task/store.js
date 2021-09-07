/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable } from "mobx";
import hostStore from 'pages/host/store';

class Store {
  @observable outputs = {};
  @observable host_ids = [];
  @observable token = null;
  @observable showHost = false;
  @observable showConsole = false;
  @observable showTemplate = false;

  switchHost = () => {
    this.showHost = !this.showHost;
  };

  switchTemplate = () => {
    this.showTemplate = !this.showTemplate
  };

  switchConsole = (token) => {
    if (this.showConsole) {
      this.showConsole = false;
      this.outputs = {}
    } else {
      for (let id of this.host_ids) {
        const host = hostStore.idMap[id];
        this.outputs[host.id] = {
          title: `${host.name}(${host.hostname}:${host.port})`,
          status: -2
        }
      }
      this.token = token;
      this.showConsole = true
    }
  }
}

export default new Store()
