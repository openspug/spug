/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */

//  数组包含关系判断
export function isSubArray(parent, child) {
  for (let item of child) {
    if (!parent.includes(item.trim())) {
      return false
    }
  }
  return true
}

export function clsNames(...args) {
  return args.filter(x => x).join(' ')
}

function isInclude(s, keys) {
  if (!s) return false
  if (Array.isArray(keys)) {
    for (let k of keys) {
      k = k.toLowerCase()
      if (s.toLowerCase().includes(k)) return true
    }
    return false
  } else {
    let k = keys.toLowerCase()
    return s.toLowerCase().includes(k)
  }
}

// 字符串包含判断
export function includes(s, keys) {
  if (Array.isArray(s)) {
    for (let i of s) {
      if (isInclude(i, keys)) return true
    }
    return false
  } else {
    return isInclude(s, keys)
  }
}

export function loadJSONStorage(key, defaultValue = null) {
  const tmp = localStorage.getItem(key)
  if (tmp) {
    try {
      return JSON.parse(tmp)
    } catch (e) {
      localStorage.removeItem(key)
    }
  }
  return defaultValue
}

// 递归查找树节点
export function findNodeByKey(array, key) {
  for (let item of array) {
    if (item.key === key) return item
    if (item.children) {
      let tmp = findNodeByKey(item.children, key)
      if (tmp) return tmp
    }
  }
}