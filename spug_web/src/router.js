/**
 * Created by zyupo on 2017/04/20.
 * https://github.com/openspug/spug
 */

import Home from './components/Home.vue'
import Deny from './components/Deny.vue'
import Welcome from './components/Welcome.vue'
import Login from './components/Login.vue'
import Layout from './components/Layout.vue'
import account_routes from './components/account/routes'
import publish_routes from './components/publish/routes'
import configuration_routes from './components/configuration/routes'
import assets_routes from './components/assets/routes'
import schedule_routes from './components/schedule/routes'
import system_routes from './components/system/routes'

const routes = [
    {
        path: '',
        name: 'home',
        component: Home
    },
    {
        path: '/welcome',
        name: 'welcome',
        component: Welcome
    },
    {
        path: 'account',
        routes: account_routes
    },
    {
        path: 'publish',
        routes: publish_routes
    },
    {
        path: 'configuration',
        routes: configuration_routes
    },
    {
        path: 'assets',
        routes: assets_routes
    },
    {
        path: 'schedule',
        routes: schedule_routes
    },
    {
        path: 'system',
        routes: system_routes
    },
    {
        path: '*',
        redirect: '/'
    }
];

function load_route(routes) {
    let result = [];
    for (let route of routes) {
        if (route.hasOwnProperty('routes') && Array.isArray(route.routes)) {
            for (let sub_route of load_route(route.routes)) {
                sub_route.path = route.path +  '/' + sub_route.path;
                result.push(sub_route)
            }
        } else {
            result.push(route)
        }
    }
    return result
}

export default [
    {
        path: '/login',
        name: 'login',
        component: Login
    }, {
        path: '/deny',
        component: Deny
    }, {
        path: '/',
        component: Layout,
        children: load_route(routes)
    }
]