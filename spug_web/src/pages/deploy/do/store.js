import { observable } from "mobx";

class Store {
  @observable outputs = {};
  @observable request = {
    targets: [],
  };
}

export default new Store()