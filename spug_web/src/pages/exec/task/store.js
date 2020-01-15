/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import { observable } from "mobx";

class Store {
  @observable outputs = {};
  @observable hosts = [];
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
      for (let item of this.hosts) {
        const key = `${item.hostname}:${item.port}`;
        this.outputs[key] = {
          title: `${item.name}(${key})`,
          system: '### Establishing communication\n',
          info: '',
          error: '',
          latest: '',
          status: -2
        }
      }
      this.token = token;
      this.showConsole = true
    }
  }
}

export default new Store()
