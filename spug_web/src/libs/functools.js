/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
let Permission = {
  isSuper: false,
  hostPerms: [],
  permissions: []
};

export let X_TOKEN;

export function updatePermissions() {
  X_TOKEN = localStorage.getItem('token');
  Permission.isSuper = localStorage.getItem('is_supper') === 'true';
  Permission.hostPerms = JSON.parse(localStorage.getItem('host_perms') || '[]');
  Permission.permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
}

// 前端页面的权限判断(仅作为前端功能展示的控制，具体权限控制应在后端实现)
export function hasPermission(strCode) {
  const {isSuper, permissions} = Permission;
  // console.log(isSuper, strCode, permissions);
  if (!strCode || isSuper) return true;
  for (let or_item of strCode.split('|')) {
    if (isSubArray(permissions, or_item.split('&'))) {
      return true
    }
  }
  return false
}

export function hasHostPermission(id) {
  const {isSuper, hostPerms} = Permission;
  return isSuper || hostPerms.includes(id)
}

// 清理输入的命令中包含的\r符号
export function cleanCommand(text) {
  return text ? text.replace(/\r\n/g, '\n') : ''
}

//  数组包含关系判断
export function isSubArray(parent, child) {
  for (let item of child) {
    if (!parent.includes(item.trim())) {
      return false
    }
  }
  return true
}

// 用于替换toFixed方法，去除toFixed方法多余的0和小数点
export function trimFixed(data, bit) {
  return String(data.toFixed(bit)).replace(/0*$/, '').replace(/\.$/, '')
}

// 日期
export function human_date(date) {
  const now = date || new Date();
  let month = now.getMonth() + 1;
  let day = now.getDate();
  return `${now.getFullYear()}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`
}

// 时间
export function human_time(date) {
  const now = date || new Date();
  const hour = now.getHours() < 10 ? '0' + now.getHours() : now.getHours();
  const minute = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
  const second = now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds();
  return `${human_date()} ${hour}:${minute}:${second}`
}

// 生成唯一id
export function uniqueId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  });
}