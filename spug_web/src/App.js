/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the MIT License.
 */
import React, { Component } from 'react';
import {Switch, Route} from 'react-router-dom';
import Login from './pages/login';
import Layout from './layout';

class App extends Component {
  render() {
    return (
      <Switch>
        <Route path="/" exact component={Login} />
        <Route component={Layout} />
      </Switch>
    );
  }
}

export default App;
