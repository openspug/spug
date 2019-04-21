/**
 * Created by zyupo on 2017/04/20.
 * https://github.com/openspug/spug
 */

import App from './App.vue'
import AppAdd from './AppAdd.vue'
import Deploy from './Deploy.vue'
import Image from './Image.vue'
import Field from './Field.vue'
import Menu from './Menu.vue'

export default [
    {
        path: 'app',
        component: App,
        meta: {
            permission: 'publish_app_view'
        }
    },
    {
        path: 'app_add',
        name: 'app_add',
        component: AppAdd,
        meta: {
            permission: 'publish_app_add'
        }
    },
    {
        path: 'deploy/:app_id',
        name: 'publish_deploy',
        component: Deploy,
        meta: {
            permission: 'publish_app_publish_view'
        }
    },
    {
        path: 'image',
        name: 'publish_image',
        component: Image,
        meta: {
            permission: 'publish_image_view'
        }
    },
    {
        path: 'field',
        component: Field,
        meta: {
            permission: 'publish_field_view'
        }
    },
    {
        path: 'menu',
        component: Menu,
        meta: {
            permission: 'publish_menu_view'
        }
    }
]
