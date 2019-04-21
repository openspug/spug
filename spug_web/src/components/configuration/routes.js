/**
 * Created by zyupo on 2017/04/20.
 * https://github.com/openspug/spug
 */
import App from './App.vue'
import Service from './Service.vue'
import Environment from './Environment.vue'
import RelationChart from './RelationChart.vue'

export default [
    {
        path: 'app',
        component: App,
        meta: {
            permission: 'config_app_view'
        }
    },
    {
        path: 'service',
        component: Service,
        meta: {
            permission: 'config_service_view'
        }
    },
    {
        path: 'environment',
        component: Environment,
        meta: {
            permission: 'config_environment_view'
        }
    },
    {
        path: 'relationship',
        component: RelationChart,
        meta: {
            permission: 'config_app_view'
        }
    }
];