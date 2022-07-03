/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import { observable } from 'mobx';
import http from 'libs/http';
import themes from 'pages/ssh/themes';

class Store {
  isReady = false;
  @observable terminal = {
    fontSize: 16,
    fontFamily: 'Courier',
    theme: 'dark',
    styles: themes['dark']
  };

  _handleSettings = (res) => {
    if (res.terminal) {
      const terminal = JSON.parse(res.terminal)
      const styles = themes[terminal.theme]
      if (styles) {
        terminal.styles = styles
      } else {
        terminal.styles = themes['dark']
        terminal.theme = 'dark'
      }
      this.terminal = terminal
    }
  }

  fetchUserSettings = () => {
    if (this.isReady) return
    http.get('/api/setting/user/')
      .then(res => {
        this.isReady = true
        this._handleSettings(res)
      })
  };

  updateUserSettings = (key, value) => {
    return http.post('/api/setting/user/', {key, value})
      .then(res => {
        this.isReady = true
        this._handleSettings(res)
      })
  }
}

export default new Store()