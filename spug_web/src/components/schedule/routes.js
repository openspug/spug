/**
 * Created by aka on 2017/6/28.
 */
import Job from './Job.vue'

export default [
    {
        path: 'job',
        component: Job,
        meta: {
            permission: 'job_task_view'
        }
    }
]