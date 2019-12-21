import { observable } from "mobx";

class Store {
  @observable outputs = {};
  @observable targets = [];
  @observable request = {};
}

export default new Store()