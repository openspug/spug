import {observable} from "mobx";
import http from '../../libs/http';

class Store {
    @observable info = {};
    @observable isFetching = false;

    fetchInfo =() => {
        this.isFetching = true;
        http.get('/api/home/')
            .then(res => this.info = res)
            .finally(() => this.isFetching = false)
    };

}

export default new Store()
