import {Layout, Flex, Dropdown, theme} from 'antd'
import {AiOutlineTranslation} from 'react-icons/ai'
import css from './header.module.scss'
import i18n from '@/i18n.js'

function Header() {
  const {token: {colorBgContainer}} = theme.useToken()

  function handleLangChange({key}) {
    localStorage.setItem('lang', key)
    window.location.reload()
  }

  const locales = [{
    label: '🇨🇳 简体中文',
    key: 'zh',
  }, {
    label: '🇺🇸 English',
    key: 'en',
  }]

  console.log('lang', i18n.language)
  return (
    <Layout.Header className={css.header} style={{background: colorBgContainer}}>
      <Flex justify="flex-end" align="center" gap="small" style={{height: 48}}>
        <div className={css.item}>admin</div>
        <Dropdown menu={{items: locales, selectable: true, onClick: handleLangChange, selectedKeys: [i18n.language]}}>
          <div className={css.item}>
            <AiOutlineTranslation size={18}/>
          </div>
        </Dropdown>
      </Flex>
    </Layout.Header>
  )
}

export default Header