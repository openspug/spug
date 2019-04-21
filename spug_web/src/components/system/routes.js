/**
 * Created by zyupo on 2017/04/20.
 * https://github.com/openspug/spug
 */

import Notify from './Notify.vue';


export default [
    {
        path: 'notify',
        component: Notify,
        meta: {
            permission: 'system_notify_view'
        }
    }
]
