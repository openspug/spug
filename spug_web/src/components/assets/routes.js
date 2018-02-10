/**
 * Created by aka on 2017/5/22.
 */

import Host from './Host.vue';
import HostExec from './HostExec.vue';

export default [
    {
        path: 'host',
        component: Host,
        meta: {
            permission: 'assets_host_view'
        }
    },
    {
        path: 'host_exec',
        component: HostExec,
        meta: {
            permission: 'assets_host_exec_view'
        }
    },

]
