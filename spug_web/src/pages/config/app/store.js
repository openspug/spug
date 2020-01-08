import { observable } from "mobx";
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable record = {};
  @observable confRel = {};
  @observable isFetching = false;
  @observable formVisible = false;
  @observable relVisible = false;

  @observable f_name;

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/app/')
      .then(res => this.records = res)
      .finally(() => this.isFetching = false)
  };

  showForm = (info = {}) => {
    this.formVisible = true;
    this.record = info
  };

  showRel = (info) => {
    this.relVisible = true;
    this.record = info;
    this.confRel = {
      app: info['rel_apps'],
      service: info['rel_services']
    }
  }
}

export default new Store()