import axios from 'axios'
import { ElMessage } from 'element-plus'

// ============================================================
// axios 实例与拦截器
// - baseURL: /api/v1
// - 请求拦截：附加 Authorization: Bearer <token>
// - 响应拦截：解包 {code, data, message}；code!==0 弹错误；401 跳登录
// 自定义配置：{ silent: true } 可抑制错误弹窗（用于轮询等场景）
// ============================================================

export function getToken() {
  return localStorage.getItem('ecom_token') || ''
}
export function setToken(token) {
  localStorage.setItem('ecom_token', token || '')
}
export function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem('ecom_user') || 'null')
  } catch {
    return null
  }
}
export function setSavedUser(user) {
  localStorage.setItem('ecom_user', JSON.stringify(user || null))
}
export function clearAuth() {
  localStorage.removeItem('ecom_token')
  localStorage.removeItem('ecom_user')
}

function gotoLogin() {
  const isAdmin = window.location.pathname.includes('admin.html')
  const target = isAdmin ? '/admin.html#/login' : '/login'
  if (window.location.href.includes(target)) return
  window.location.href = target
}

const http = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data
      if (!res.config.silent) ElMessage.error(body.message || '请求失败')
      const err = new Error(body.message || '请求失败')
      err.code = body.code
      return Promise.reject(err)
    }
    return body
  },
  (err) => {
    const status = err.response?.status
    const msg = err.response?.data?.message || err.message || '网络错误'
    const silent = err.config?.silent
    if (status === 401) {
      clearAuth()
      if (!silent) ElMessage.error('登录已过期，请重新登录')
      gotoLogin()
    } else if (status === 429) {
      if (!silent) ElMessage.warning(msg || '操作过于频繁，请稍后再试')
    } else if (status === 501) {
      if (!silent) ElMessage.warning(msg || '该功能暂未开放（后端尚未实现）')
    } else if (status === 403) {
      if (!silent) ElMessage.error(msg || '没有操作权限')
    } else {
      if (!silent && msg !== 'Network Error') ElMessage.error(msg)
    }
    err.displayed = !silent
    return Promise.reject(err)
  }
)

export default http
