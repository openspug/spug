import {useTranslation } from 'react-i18next'


function App(props) {
  const {t} = useTranslation()
  window.t = t

  return props.children
}

export default App