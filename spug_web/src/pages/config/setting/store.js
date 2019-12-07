import { observable } from "mobx";
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable record = {};
  @observable env = {};
  @observable type;
  @observable id;
  @observable isFetching = false;
  @observable formVisible = false;

  @observable f_name;

  fetchRecords = () => {
    const params = {type: this.type, id: this.id, env_id: this.env.id};
    this.isFetching = true;
    http.get('/api/config/', {params})
      .then(res => this.records = res)
      .finally(() => this.isFetching = false)
  };

  showForm = (info) => {
    this.formVisible = true;
    this.record = info || {};
  }
}

export default new Store()