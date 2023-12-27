import {useContext, useEffect} from 'react'
import {Dropdown, Flex, Layout, theme as antdTheme} from 'antd'
import {IoMoon, IoSunny, IoLanguage} from 'react-icons/io5'
import {SContext} from '@/libs'
import css from './index.module.scss'
import i18n from '@/i18n.js'
import logo from "@/assets/spug-default.png";

function Header() {
  const {S: {theme}, updateS} = useContext(SContext)
  const {token} = antdTheme.useToken()

  useEffect(() => {
    document.body.style.backgroundColor = token.colorBgLayout
  }, [theme])


  function handleThemeChange() {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', newTheme)
    updateS(draft => {
      draft.theme = newTheme
    })
  }

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

  return (
    <Layout.Header theme="light" className={css.header}>
      <img src={logo} alt="logo" className={css.logo}/>
      <Flex justify="flex-end" align="center" gap="small" style={{height: 48}}>
        <div className={css.item}>admin</div>
        <Dropdown menu={{items: locales, selectable: true, onClick: handleLangChange, selectedKeys: [i18n.language]}}>
          <div className={css.item}>
            <IoLanguage size={16}/>
          </div>
        </Dropdown>
        <div className={css.item} onClick={handleThemeChange}>
          {theme === 'light' ? <IoMoon size={16}/> : <IoSunny size={18}/>}
        </div>
      </Flex>
    </Layout.Header>
  )
}

export default Header