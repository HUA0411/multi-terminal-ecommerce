import { reactive } from 'vue'
import { get as requestGet } from '@/utils/request'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export const store = reactive({
  token: '',
  user: null,
  cartCount: 0,
  language: 'zh-CN',
  currency: 'CNY',
  settings: null, // GET /settings/public
})

export function initStore() {
  store.token = uni.getStorageSync(TOKEN_KEY) || ''
  store.user = uni.getStorageSync(USER_KEY) || null
  store.language = uni.getStorageSync('language') || 'zh-CN'
  store.currency = uni.getStorageSync('currency') || 'CNY'
  if (store.token) refreshCartCount()
}

export function setLogin(token, user) {
  store.token = token
  store.user = user
  uni.setStorageSync(TOKEN_KEY, token)
  uni.setStorageSync(USER_KEY, user)
}

export function logout() {
  store.token = ''
  store.user = null
  store.cartCount = 0
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(USER_KEY)
  try {
    uni.removeTabBarBadge({ index: 2 })
  } catch (e) {
    /* ignore */
  }
}

export async function refreshCartCount() {
  if (!store.token) return
  try {
    const data = await requestGet('/cart')
    setCartCount(data.totalQuantity || 0)
  } catch (e) {
    /* 未登录/异常忽略 */
  }
}

export function setCartCount(n) {
  store.cartCount = n || 0
  try {
    if (n > 0) uni.setTabBarBadge({ index: 2, text: String(n > 99 ? '99+' : n) })
    else uni.removeTabBarBadge({ index: 2 })
  } catch (e) {
    /* H5 等平台不支持时忽略 */
  }
}

export function setLanguage(lang) {
  store.language = lang
  uni.setStorageSync('language', lang)
}

export function setCurrency(cur) {
  store.currency = cur
  uni.setStorageSync('currency', cur)
}

export const TAB_PAGES = ['/pages/index/index', '/pages/category/category', '/pages/cart/cart', '/pages/mine/mine']

export function requireLogin() {
  if (store.token) return true
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  let redirect = ''
  if (current && current.route) {
    let qs = ''
    if (current.options) {
      const parts = Object.keys(current.options).map((k) => k + '=' + current.options[k])
      if (parts.length) qs = '?' + parts.join('&')
    }
    redirect = '?redirect=' + encodeURIComponent('/' + current.route + qs)
  }
  uni.navigateTo({ url: '/pages/login/login' + redirect })
  return false
}