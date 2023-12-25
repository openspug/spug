import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'
import {session} from '@/libs'

i18n.use(initReactI18next).init({
  lng: session.lang,
  resources: {
    en: {
      translation: {
        '首页': 'Home',
        '工作台': 'Work',
        '主机管理': 'Hosts',
        '批量执行': 'Batch',
        '执行任务': 'Task',
        '文件分发': 'Transfer',
        '重置': 'Reset',
        '展示字段': 'Columns Display',
        '年龄': 'Age',
        'page': 'Total {{total}} items',
      }
    },
    zh: {
      translation: {
        'page': '共 {{total}} 条',
      }
    }
  }
})

window.t = i18n.t

export default i18n
