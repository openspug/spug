import { observable } from "mobx";

class Store {
  @observable outputs = [];
}

export default new Store()