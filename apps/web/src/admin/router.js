import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken } from '../api/http'

// 管理后台使用 hash 路由（独立于 admin.html 入口）
const routes = [
  { path: '/login', name: 'admin-login', component: () => import('./views/Login.vue'), meta: { title: '登录' } },
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'dashboard', component: () => import('./views/Dashboard.vue'), meta: { title: '数据看板' } },
  { path: '/products', name: 'admin-products', component: () => import('./views/Products.vue'), meta: { title: '商品管理' } },
  { path: '/orders', name: 'admin-orders', component: () => import('./views/Orders.vue'), meta: { title: '订单管理' } },
  { path: '/aftersales', name: 'admin-aftersales', component: () => import('./views/Aftersales.vue'), meta: { title: '售后管理' } },
  { path: '/marketing', name: 'admin-marketing', component: () => import('./views/Marketing.vue'), meta: { title: '营销中心' } },
  { path: '/cms', name: 'admin-cms', component: () => import('./views/CmsPages.vue'), meta: { title: 'CMS 页面' } },
  { path: '/cms/editor/:id?', name: 'admin-cms-editor', component: () => import('./views/CmsEditor.vue'), meta: { title: '页面 DIY 编辑器' } },
  { path: '/merchants', name: 'admin-merchants', component: () => import('./views/Merchants.vue'), meta: { title: '商家审核' } },
  { path: '/settings', name: 'admin-settings', component: () => import('./views/Settings.vue'), meta: { title: '语言与货币设置' } },
  { path: '/quotes', name: 'admin-quotes', component: () => import('./views/Quotes.vue'), meta: { title: '询价管理' } },
  { path: '/settlement', name: 'admin-settlement', component: () => import('./views/Settlement.vue'), meta: { title: '对账报表' } },
  { path: '/b2b-customers', name: 'admin-b2b', component: () => import('./views/B2bCustomers.vue'), meta: { title: 'B2B 客户' } },
  { path: '/audit', name: 'admin-audit', component: () => import('./views/AuditLogs.vue'), meta: { title: '操作审计' } },
  { path: '/risk', name: 'admin-risk', component: () => import('./views/Risk.vue'), meta: { title: '风控中心' } },
  { path: '/users', name: 'admin-users', component: () => import('./views/Users.vue'), meta: { title: '用户管理' } },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  document.title = `${to.meta.title || '管理后台'} - 云商城管理后台`
  if (to.name !== 'admin-login' && !getToken()) {
    return { name: 'admin-login' }
  }
  return true
})

export default router