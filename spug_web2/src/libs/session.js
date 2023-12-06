import {isSubArray} from "@/libs/utils.js";

class Session {
  constructor() {
    this._session = {};
    const tmp = localStorage.getItem('session');
    if (tmp) {
      try {
        this._session = JSON.parse(tmp);
      } catch (e) {
        localStorage.removeItem('session');
      }
    }
  }

  get access_token() {
    return this._session['access_token'] || '';
  }

  get nickname() {
    return this._session['nickname'];
  }

  hasPermission(code) {
    const {isSuper, permissions} = this._session;
    if (!code || isSuper) return true;
    for (let item of code.split('|')) {
      if (isSubArray(permissions, item.split('&'))) {
        return true
      }
    }
    return false
  }

  update(data) {
    Object.assign(this._session, data);
    localStorage.setItem('session', JSON.stringify(this._session));
  }
}

export default new Session();