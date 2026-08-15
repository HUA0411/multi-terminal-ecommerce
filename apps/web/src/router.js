import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from './api/http'

const routes = [
  { path: '/', name: 'home', component: () => import('./views/Home.vue'), meta: { title: '首页' } },
  { path: '/products', name: 'products', component: () => import('./views/ProductList.vue'), meta: { title: '全部商品' } },
  { path: '/products/:id', name: 'product', component: () => import('./views/ProductDetail.vue'), meta: { title: '商品详情' } },
  { path: '/cart', name: 'cart', component: () => import('./views/Cart.vue'), meta: { title: '购物车', requiresAuth: true } },
  { path: '/checkout', name: 'checkout', component: () => import('./views/Checkout.vue'), meta: { title: '确认订单', requiresAuth: true } },
  { path: '/orders', name: 'orders', component: () => import('./views/Orders.vue'), meta: { title: '我的订单', requiresAuth: true } },
  { path: '/orders/:id', name: 'order', component: () => import('./views/OrderDetail.vue'), meta: { title: '订单详情', requiresAuth: true } },
  { path: '/coupons', name: 'coupons', component: () => import('./views/Coupons.vue'), meta: { title: '领券中心' } },
  { path: '/my/coupons', name: 'my-coupons', component: () => import('./views/MyCoupons.vue'), meta: { title: '我的优惠券', requiresAuth: true } },
  { path: '/points', name: 'points', component: () => import('./views/Points.vue'), meta: { title: '我的积分', requiresAuth: true } },
  { path: '/flashsales', name: 'flashsales', component: () => import('./views/FlashSales.vue'), meta: { title: '秒杀专区' } },
  { path: '/live', name: 'live', component: () => import('./views/LiveRooms.vue'), meta: { title: '直播带货' } },
  { path: '/live/:id', name: 'live-room', component: () => import('./views/LiveRoom.vue'), meta: { title: '直播间' } },
  { path: '/fitting/:productId', name: 'fitting', component: () => import('./views/Fitting.vue'), meta: { title: '虚拟试衣' } },
  { path: '/s/:code', name: 'share', component: () => import('./views/ShareLanding.vue'), meta: { title: '分享页' } },
  { path: '/login', name: 'login', component: () => import('./views/Login.vue'), meta: { title: '登录' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFound.vue'), meta: { title: '404' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  document.title = `${to.meta.title || ''} - 云商城`
  if (to.meta.requiresAuth && !getToken()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
