import { makeRoute } from "../../libs/router";
import Template from './template';
import Task from './task';


export default [
  makeRoute('/template', Template),
  makeRoute('/task', Task),
]