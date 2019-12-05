import { makeRoute } from 'libs/router';
import Alarm from './alarm';
import Contact from './contact';
import Group from './group';


export default [
  makeRoute('/alarm', Alarm),
  makeRoute('/contact', Contact),
  makeRoute('/group', Group),
]