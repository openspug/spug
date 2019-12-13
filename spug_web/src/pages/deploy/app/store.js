import { observable } from "mobx";
import http from 'libs/http';

class Store {
  @observable records = [];
  @observable record = {};
  @observable page = 0;
  @observable isFetching = false;
  @observable addVisible = false;
  @observable ext1Visible = false;
  @observable ext2Visible = false;

  @observable f_name;

  initRecord = () => ({
    git_type: 'branch',
    is_audit: false,
    versions: 10,
    host_ids: [undefined],
    filter_rule: {type: 'contain', data: ''}
  });

  fetchRecords = () => {
    this.isFetching = true;
    http.get('/api/app/')
      .then(res => this.records = res)
      .finally(() => this.isFetching = false)
  };

  showForm = (info) => {
    this.page = 0;
    if (info) {
      if (info.extend === '1') {
        this.ext1Visible = true
      } else {
        this.ext2Visible = true
      }
      this.record = info
    } else {
      this.addVisible = true;
      this.record = this.initRecord()
    }
  };

  addHost = () => {
    this.record['host_ids'].push(undefined)
  };

  editHost = (index, v) => {
    this.record['host_ids'][index] = v
  };

  delHost = (index) => {
    this.record['host_ids'].splice(index, 1)
  }
}

export default new Store()