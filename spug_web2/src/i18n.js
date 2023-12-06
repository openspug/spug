import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'

i18n.use(initReactI18next).init({
  lng: localStorage.getItem('lang') || 'zh',
  resources: {
    en: {
      translation: {
        '首页': 'Home',
        '工作台': 'Work',
        '主机管理': 'Hosts',
        '批量执行': 'Batch',
        '执行任务': 'Task',
        '文件分发': 'Transfer',
      }
    }
  }
})

window.t = i18n.t

export default i18n
