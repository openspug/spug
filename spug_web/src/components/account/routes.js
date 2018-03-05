/**
 * Created by aka on 2017/5/22.
 */

import User from './User.vue';
import Role from './Role.vue';
import PersonSet from './PersonSet.vue';
import Person from './Person.vue';

export default [
    {
        path: 'user',
        component: User,
        meta: {
            permission: 'account_user_view'
        }
    },
    {
        path: 'role',
        component: Role,
        meta: {
            permission: 'account_role_view'
        }
    },
    {
        path: 'person',
        component: Person,
    },
    {
        path: 'personset',
        component: PersonSet,
    }
]
