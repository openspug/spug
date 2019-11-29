import { observable } from "mobx";
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable types = [];
  @observable record = {};
  @observable targets = [undefined];
  @observable isFetching = false;
  @observable formVisible = false;

  @observable f_name;
  @observable f_type;

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/schedule/')
      .then(({types, tasks}) => {
        this.records = tasks;
        this.types = types
      })
      .finally(() => this.isFetching = false)
  };

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  };

  addTarget = () => {
    this.targets.push(undefined)
  };

  editTarget = (index, v) => {
    this.targets[index] = v
  };

  delTarget = (index) => {
    this.targets.splice(index, 1)
  }
}

export default new Store()