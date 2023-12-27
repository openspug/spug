import {isSubArray, loadJSONStorage} from "@/libs/utils.js";

class App {
  constructor() {
    this.lang = localStorage.getItem('lang') || 'zh';
    this.theme = localStorage.getItem('theme') || 'light';
    this.stable = loadJSONStorage('stable', {});
    this.session = loadJSONStorage('session', {});
  }

  get access_token() {
    return this.session['access_token'] || '';
  }

  get nickname() {
    return this.session['nickname'];
  }

  hasPermission(code) {
    const {isSuper, permissions} = this.session;
    if (!code || isSuper) return true;
    for (let item of code.split('|')) {
      if (isSubArray(permissions, item.split('&'))) {
        return true
      }
    }
    return false
  }

  updateSession(data) {
    Object.assign(this.session, data);
    localStorage.setItem('session', JSON.stringify(this.session));
  }

  getStable(key) {
    return this.stable[key] ?? {};
  }

  updateStable(key, data) {
    this.stable[key] = data;
    localStorage.setItem('stable', JSON.stringify(this.stable));
  }
}

export default new App();