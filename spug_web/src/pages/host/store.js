import { observable } from "mobx";
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable zones = [];
  @observable record = {};
  @observable isFetching = false;
  @observable formVisible = false;

  @observable f_name;
  @observable f_zone;

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/host/')
      .then(({hosts, zones}) => {
        this.records = hosts;
        this.zones = zones;
      })
      .finally(() => this.isFetching = false)
  };

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  }
}

export default new Store()