import {useEffect} from 'react'

function Host() {
  useEffect(() => {
    console.log('now in host page')
  }, [])

  return (
    <div>host page</div>
  )
}

export default Host