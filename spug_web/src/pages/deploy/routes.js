import { makeRoute } from "../../libs/router";
import app from './app';
import request from './request';


export default [
  makeRoute('/app', app),
  makeRoute('/request', request),
]