/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable, computed } from "mobx";
import hostStore from 'pages/host/store';

class Store {
  @observable outputs = {};
  @observable tag = '';
  @observable host_ids = [];
  @observable token = null;
  @observable showHost = false;
  @observable showConsole = false;
  @observable showTemplate = false;

  @computed get items() {
    const items = Object.entries(this.outputs)
    if (this.tag === '') {
      return items
    } else if (this.tag === '0') {
      return items.filter(([_, x]) => x.status === -2)
    } else if (this.tag === '1') {
      return items.filter(([_, x]) => x.status === 0)
    } else {
      return items.filter(([_, x]) => ![-2, 0].includes(x.status))
    }
  }

  @computed get counter() {
    const counter = {'0': 0, '1': 0, '2': 0}
    for (let item of Object.values(this.outputs)) {
      if (item.status === -2) {
        counter['0'] += 1
      } else if (item.status === 0) {
        counter['1'] += 1
      } else {
        counter['2'] += 1
      }
    }
    return counter
  }

  updateTag = (tag) => {
    if (tag === this.tag) {
      this.tag = ''
    } else {
      this.tag = tag
    }
  }

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
          data: '\x1b[36m### WebSocket connecting ...\x1b[0m',
          status: -2
        }
      }
      this.token = token;
      this.showConsole = true
    }
  }
}

export default new Store()
