import useSWR from 'swr'
import {message} from 'antd'
import app from '@/libs/app.js'
import {redirect} from 'react-router-dom'

function fetcher(resource, init) {
  return fetch(resource, init)
    .then(res => {
      if (res.status === 200) {
        return res.json()
      } else if (res.status === 401) {
        redirect('/login')
        throw new Error('会话过期，请重新登录')
      } else {
        throw new Error(`请求失败: ${res.status} ${res.statusText}`)
      }
    })
    .then(res => {
      if (res.error) {
        throw new Error(res.error)
      }
      return res.data
    })
    .catch(err => {
      message.error(err.message)
      throw err
    })
}

function SWRGet(url, params) {
  if (params) url = `${url}?${new URLSearchParams(params).toString()}`
  return useSWR(url, () => fetcher(url))
}

function request(method, url, params) {
  const init = {method, headers: {'X-Token': app.accessToken}}
  if (['GET', 'DELETE'].includes(method)) {
    if (params) url = `${url}?${new URLSearchParams(params).toString()}`
    return fetcher(url, init)
  }
  init.headers['Content-Type'] = 'application/json'
  init.body = JSON.stringify(params)
  return fetcher(url, init)
}

export default {
  swrGet: SWRGet,
  get: (url, params) => request('GET', url, params),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  delete: (url, params) => request('DELETE', url, params),
}