// ============================================================
// API 封装 —— 以 docs/api.md 契约为准（唯一数据源）
// 价格字段单位为分（整数）；商品/购物车/订单支持 ?currency= 换算
// ============================================================
import http from './http'

// ---------- 1. 认证 ----------
export const authApi = {
  register: (data) => http.post('/auth/register', data),
  login: (data) => http.post('/auth/login', data),
  wechat: (code) => http.post('/auth/wechat', { code }),
  refresh: (refreshToken) => http.post('/auth/refresh', { refreshToken }),
  me: () => http.get('/auth/me'),
  updateMe: (data) => http.put('/auth/me', data),
}

// ---------- 2. 商品与搜索 ----------
export const productApi = {
  list: (params) => http.get('/products', { params }),
  detail: (id, params) => http.get(`/products/${id}`, { params }),
  categories: () => http.get('/categories'),
  suggest: (keyword) => http.get('/search/suggest', { params: { keyword } }),
}

// ---------- 3. 购物车 ----------
export const cartApi = {
  get: (params) => http.get('/cart', { params }),
  add: (data) => http.post('/cart/items', data),
  update: (id, data) => http.put(`/cart/items/${id}`, data),
  remove: (id) => http.delete(`/cart/items/${id}`),
  clear: () => http.delete('/cart'),
  merge: (items) => http.post('/cart/merge', { items }),
}

// ---------- 4. 订单 ----------
export const orderApi = {
  create: (data) => http.post('/orders', data),
  list: (params) => http.get('/orders', { params }),
  detail: (id) => http.get(`/orders/${id}`),
  cancel: (id) => http.post(`/orders/${id}/cancel`),
  confirm: (id) => http.post(`/orders/${id}/confirm`),
  applyRefund: (id, reason) => http.post(`/orders/${id}/apply-refund`, { reason }),
  track: (id) => http.get(`/orders/${id}/track`),
}

// ---------- 5. 支付 ----------
export const paymentApi = {
  methods: () => http.get('/payments/methods'),
  pay: (orderId, method) => http.post(`/orders/${orderId}/pay`, { method }),
  mockSuccess: (paymentId) => http.post(`/payments/${paymentId}/mock-success`),
  status: (paymentId) => http.get(`/payments/${paymentId}`),
}

// ---------- 6. 售后与物流 ----------
export const aftersaleApi = {
  create: (data) => http.post('/aftersales', data),
  list: (params) => http.get('/aftersales', { params }),
  detail: (id) => http.get(`/aftersales/${id}`),
  cancel: (id) => http.post(`/aftersales/${id}/cancel`),
  // 管理端
  adminList: (params) => http.get('/admin/aftersales', { params, silent: true }),
  handle: (id, data) => http.post(`/admin/aftersales/${id}/handle`, data),
  adminShip: (id, data) => http.post(`/admin/orders/${id}/ship`, data),
}

// ---------- 7. 营销：优惠券 / 秒杀 / 分享 / 积分 ----------
export const couponApi = {
  available: (params) => http.get('/coupons/available', { params }),
  claim: (id) => http.post(`/coupons/${id}/claim`),
  mine: (params) => http.get('/my/coupons', { params }),
  // 管理端创建（后端可能 501）
  adminCreate: (data) => http.post('/coupons', data, { silent: true }),
}

export const flashsaleApi = {
  list: () => http.get('/flashsales'),
  seckill: (id, skuId) => http.post(`/flashsales/${id}/seckill`, { skuId }),
  // 管理端创建（后端可能 501）
  adminCreate: (data) => http.post('/flashsales', data, { silent: true }),
}

export const shareApi = {
  create: (data) => http.post('/shares', data),
  get: (code) => http.get(`/shares/${code}`),
}

export const pointApi = {
  balance: () => http.get('/my/points'),
  logs: (params) => http.get('/my/points/logs', { params }),
}

// ---------- 8. CMS 页面 DIY ----------
export const cmsApi = {
  public: (key) => http.get(`/cms/pages/${key}`, { silent: true }),
  templates: () => http.get('/cms/templates'),
  adminList: () => http.get('/admin/cms/pages'),
  create: (data) => http.post('/admin/cms/pages', data),
  update: (id, data) => http.put(`/admin/cms/pages/${id}`, data),
  publish: (id) => http.post(`/admin/cms/pages/${id}/publish`),
}

// ---------- 9. 数据看板 ----------
export const dashboardApi = {
  overview: (role) => http.get(`/${role}/dashboard/overview`),
  salesTrend: (role, days) => http.get(`/${role}/dashboard/sales-trend`, { params: { days } }),
  categoryDistribution: (role) => http.get(`/${role}/dashboard/category-distribution`),
  topProducts: (role, limit) => http.get(`/${role}/dashboard/top-products`, { params: { limit } }),
}

// ---------- 10. 多商户 ----------
export const merchantApi = {
  list: (params) => http.get('/merchants', { params }),
  detail: (id) => http.get(`/merchants/${id}`),
  apply: (data) => http.post('/merchants/apply', data),
  adminList: () => http.get('/admin/merchants'),
  review: (id, approve) => http.post(`/admin/merchants/${id}/review`, { approve }),
}

// ---------- 11. 多语言 / 多货币 ----------
export const settingApi = {
  public: () => http.get('/settings/public'),
  i18n: (lang) => http.get(`/i18n/${lang}`, { silent: true }),
  currencies: () => http.get('/currencies'),
  convert: (params) => http.get('/convert', { params }),
}

// ---------- 12. 智能推荐 ----------
export const recommendApi = {
  get: (params) => http.get('/recommendations', { params }),
}

// ---------- 13. 直播 ----------
export const liveApi = {
  rooms: (params) => http.get('/live/rooms', { params }),
  detail: (id) => http.get(`/live/rooms/${id}`),
  action: (id, type) => http.post(`/live/rooms/${id}/action`, { type }),
}

// ---------- 14. 虚拟试衣 ----------
export const fittingApi = {
  product: (productId) => http.get(`/fitting/products/${productId}`),
  createSession: (data) => http.post('/fitting/sessions', data),
  session: (sessionId) => http.get(`/fitting/sessions/${sessionId}`, { silent: true }),
}

// ---------- 15. 风控与安全 ----------
export const riskApi = {
  events: (params) => http.get('/admin/risk/events', { params }),
  rules: () => http.get('/admin/risk/rules'),
}

// ---------- 16. 管理端 商品/订单/用户 ----------
export const adminApi = {
  createProduct: (data) => http.post('/admin/products', data),
  updateProduct: (id, data) => http.put(`/admin/products/${id}`, data),
  addSkus: (id, data) => http.post(`/admin/products/${id}/skus`, data),
  deleteProduct: (id) => http.delete(`/admin/products/${id}`),
  orders: (params) => http.get('/admin/orders', { params }),
  users: (params) => http.get('/admin/users', { params }),
  updateUserStatus: (id, status) => http.put(`/admin/users/${id}/status`, { status }),
  setTiers: (id, tiers) => http.post(`/admin/products/${id}/tiers`, { tiers }),
  setCustomerType: (id, customerType) => http.put(`/admin/users/${id}/customer-type`, { customerType }),
  // CMS 页面删除（契约未定义，尝试调用；后端 501 时由拦截器友好提示）
  removeCmsPage: (id) => http.delete(`/admin/cms/pages/${id}`, { silent: true }),
}