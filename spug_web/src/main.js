import Vue from 'vue'
import VueRouter from 'vue-router'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import App from './App.vue'
import GlobalTools from './plugins/globalTools'
import routes from './router'
import './assets/styles/font-awesome.min.css';


Vue.use(VueRouter);
Vue.use(ElementUI);


const router = new VueRouter({
    mode: 'history',
    routes
});

Vue.use(GlobalTools, router);

new Vue({
    router,
    el: '#app',
    render: h => h(App)
});
