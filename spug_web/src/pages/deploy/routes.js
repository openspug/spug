import { makeRoute } from "../../libs/router";
import app from './app';


export default [
  makeRoute('/app', app),
]