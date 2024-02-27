import {useEffect} from 'react'


function Home() {
  useEffect(() => {
    console.log('now in home page')
  }, [])

  return (
    <div>
      <h1>{t('你好')}</h1>
      <div className="i-ant-design:desktop-outlined"/>
    </div>
  )
}

export default Home
