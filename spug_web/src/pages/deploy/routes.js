import { makeRoute } from "../../libs/router";
import app from './app';
import request from './request';
import doIndex from './do';


export default [
  makeRoute('/app', app),
  makeRoute('/request', request),
  makeRoute('/do/:id', doIndex),
]