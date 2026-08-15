import { API_BASE_URL } from '@/config'

const TOKEN_KEY = 'token'
export const USER_KEY = 'user'

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

export class ApiError extends Error {
  constructor(message, code, statusCode) {
    super(message || '请求失败')
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
  }
}

function gotoLogin() {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const route = current ? current.route : ''
  if (route && route.indexOf('login') > -1) return
  let redirect = ''
  if (route) {
    let qs = ''
    if (current && current.options) {
      const parts = Object.keys(current.options).map((k) => k + '=' + current.options[k])
      if (parts.length) qs = '?' + parts.join('&')
    }
    redirect = '?redirect=' + encodeURIComponent('/' + route + qs)
  }
  uni.navigateTo({ url: '/pages/login/login' + redirect })
}

export function request(options) {
  const token = getToken()
  return new Promise((resolve, reject) => {
    uni.request({
      url: API_BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: options.timeout || 20000,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(options.header || {}),
      },
      success: (res) => {
        const body = res.data
        if (res.statusCode === 401) {
          uni.removeStorageSync(TOKEN_KEY)
          uni.removeStorageSync(USER_KEY)
          gotoLogin()
          reject(new ApiError('登录已过期，请重新登录', 401, 401))
          return
        }
        if (body && body.code === 0) {
          resolve(body.data)
        } else if (body && typeof body.code === 'number') {
          const err = new ApiError(body.message || '请求失败', body.code, res.statusCode)
          if (body.code === 401) gotoLogin()
          reject(err)
        } else {
          reject(new ApiError('服务异常', -1, res.statusCode))
        }
      },
      fail: (err) => {
        reject(new ApiError((err && err.errMsg) || '网络错误，请稍后重试', -2))
      },
    })
  })
}

export const get = (url, data) => request({ url, method: 'GET', data })
export const post = (url, data) => request({ url, method: 'POST', data })
export const put = (url, data) => request({ url, method: 'PUT', data })
export const del = (url, data) => request({ url, method: 'DELETE', data })
