// 统一 API 模块（对应 docs/api.md 契约，前缀 /api/v1 已在 request 中配置）
import { get, post, put, del } from '@/utils/request'
import { store } from '@/store'

// 附加当前货币换算参数（商品/购物车/订单接口支持 ?currency=）
function withCurrency(params, extra) {
  return { ...params, ...extra, currency: store.currency || 'CNY' }
}

export const authApi = {
  login: (data) => post('/auth/login', data),
  register: (data) => post('/auth/register', data),
  wechat: (data) => post('/auth/wechat', data),
  refresh: (data) => post('/auth/refresh', data),
  me: () => get('/auth/me'),
  updateMe: (data) => put('/auth/me', data),
}

export const productApi = {
  list: (params) => get('/products', withCurrency(params)),
  detail: (id, params) => get('/products/' + id, withCurrency(params)),
  categories: () => get('/categories'),
  suggest: (keyword) => get('/search/suggest', { keyword }),
}

export const cartApi = {
  get: () => get('/cart', { currency: store.currency }),
  add: (data) => post('/cart/items', data),
  update: (id, data) => put('/cart/items/' + id, data),
  remove: (id) => del('/cart/items/' + id),
  clear: () => del('/cart'),
  merge: (data) => post('/cart/merge', data),
}

export const orderApi = {
  create: (data) => post('/orders', { ...data, currency: store.currency }),
  list: (params) => get('/orders', params),
  detail: (id) => get('/orders/' + id),
  cancel: (id) => post('/orders/' + id + '/cancel'),
  confirm: (id) => post('/orders/' + id + '/confirm'),
  applyRefund: (id, data) => post('/orders/' + id + '/apply-refund', data),
  track: (id) => get('/orders/' + id + '/track'),
}

export const paymentApi = {
  methods: () => get('/payments/methods'),
  pay: (orderId, data) => post('/orders/' + orderId + '/pay', data),
  mockSuccess: (paymentId) => post('/payments/' + paymentId + '/mock-success'),
  status: (paymentId) => get('/payments/' + paymentId),
}

export const couponApi = {
  available: (params) => get('/coupons/available', params),
  claim: (id) => post('/coupons/' + id + '/claim'),
  mine: (params) => get('/my/coupons', params),
}

export const pointsApi = {
  balance: () => get('/my/points'),
  logs: (params) => get('/my/points/logs', params),
  products: () => get('/points/products'),
  redeem: (data) => post('/points/redemptions', data),
  myRedemptions: (params) => get('/my/redemptions', params),
}

export const flashApi = {
  list: () => get('/flashsales'),
  seckill: (id, data) => post('/flashsales/' + id + '/seckill', data),
}

export const liveApi = {
  rooms: (params) => get('/live/rooms', params),
  detail: (id) => get('/live/rooms/' + id),
  action: (id, data) => post('/live/rooms/' + id + '/action', data),
}

export const fittingApi = {
  product: (productId) => get('/fitting/products/' + productId),
  createSession: (data) => post('/fitting/sessions', data),
  session: (id) => get('/fitting/sessions/' + id),
}

export const cmsApi = {
  page: (key) => get('/cms/pages/' + key),
}

export const recApi = {
  list: (params) => get('/recommendations', withCurrency(params)),
}

export const aftersaleApi = {
  list: (params) => get('/aftersales', params),
  detail: (id) => get('/aftersales/' + id),
  cancel: (id) => post('/aftersales/' + id + '/cancel'),
}

export const shareApi = {
  create: (data) => post('/shares', data),
  get: (code) => get('/shares/' + code),
}

export const merchantApi = {
  list: (params) => get('/merchants', params),
  detail: (id, params) => get('/merchants/' + id, params),
}

export const settingsApi = {
  public: () => get('/settings/public'),
  currencies: () => get('/currencies'),
  convert: (params) => get('/convert', params),
}