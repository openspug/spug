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