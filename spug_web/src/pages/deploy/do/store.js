import { observable } from "mobx";

class Store {
  @observable outputs = {};
  @observable targets = [];
}

export default new Store()