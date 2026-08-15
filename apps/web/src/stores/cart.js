// ============================================================
// 购物车状态（登录后有效；WebSocket cart:changed 触发刷新）
// ============================================================
import { reactive } from 'vue'
import { cartApi } from '../api'
import { auth } from './auth'

export const cart = reactive({
  items: [],
  totalQuantity: 0,
  checkedQuantity: 0,
  totalPrice: 0,
  currency: 'CNY',
  loaded: false,
})

export async function refreshCart(currency) {
  if (!auth.isLogin) {
    cart.items = []
    cart.totalQuantity = 0
    cart.checkedQuantity = 0
    cart.totalPrice = 0
    cart.loaded = false
    return
  }
  try {
    const data = await cartApi.get(currency ? { currency } : {})
    cart.items = data.items || []
    cart.totalQuantity = data.totalQuantity || 0
    cart.checkedQuantity = data.checkedQuantity || 0
    cart.totalPrice = data.totalPrice || 0
    cart.currency = data.currency || currency || 'CNY'
    cart.loaded = true
  } catch {
    /* 静默：购物车拉取失败不影响页面 */
  }
}

export async function addToCart(skuId, quantity = 1, checked = true) {
  const d = await cartApi.add({ skuId, quantity, checked })
  await refreshCart()
  return d
}

export async function updateCartItem(id, patch) {
  await cartApi.update(id, patch)
  await refreshCart()
}

export async function removeCartItem(id) {
  await cartApi.remove(id)
  await refreshCart()
}

export async function clearCart() {
  await cartApi.clear()
  await refreshCart()
}

/** 已勾选条目 id 列表（用于下单） */
export function checkedItemIds() {
  return cart.items.filter((i) => i.checked).map((i) => i.id)
}
