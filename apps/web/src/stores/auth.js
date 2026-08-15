// ============================================================
// 认证状态（普通 reactive 单例）
// ============================================================
import { reactive } from 'vue'
import http, { getToken, setToken, setSavedUser, clearAuth as clearStorage } from '../api/http'
import { closeWs } from '../utils/ws'

const savedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem('ecom_user') || 'null')
  } catch {
    return null
  }
})()

export const auth = reactive({
  token: getToken(),
  user: savedUser,
  get isLogin() {
    return !!this.token
  },
  get role() {
    return this.user?.role || ''
  },
  get isAdmin() {
    return this.role === 'admin'
  },
  get isMerchant() {
    return this.role === 'merchant'
  },
  get merchantId() {
    return this.user?.merchantId || null
  },
})

/** 登录：POST /auth/login {account, password} -> {token, refreshToken, user} */
export async function login(account, password) {
  const data = await http.post('/auth/login', { account, password })
  auth.token = data.token
  auth.user = data.user
  setToken(data.token)
  setSavedUser(data.user)
  return data
}

/** 注册即登录：POST /auth/register -> {token, user} */
export async function register(payload) {
  const data = await http.post('/auth/register', payload)
  auth.token = data.token
  auth.user = data.user
  setToken(data.token)
  setSavedUser(data.user)
  return data
}

export async function refreshMe() {
  try {
    const u = await http.get('/auth/me')
    auth.user = u
    setSavedUser(u)
    return u
  } catch {
    return null
  }
}

export function logout() {
  auth.token = ''
  auth.user = null
  clearStorage()
  closeWs()
}
