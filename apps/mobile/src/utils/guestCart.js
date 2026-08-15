// 游客购物车（本地存储），登录后通过 POST /cart/merge 合并
const KEY = 'guest_cart'

export function getGuestCart() {
  return uni.getStorageSync(KEY) || []
}

export function addGuestItem(productId, skuId, quantity) {
  const list = getGuestCart()
  const found = list.find((i) => String(i.skuId) === String(skuId))
  if (found) found.quantity += quantity
  else list.push({ productId, skuId, quantity })
  uni.setStorageSync(KEY, list)
}

export function updateGuestItem(skuId, quantity) {
  const list = getGuestCart()
  const item = list.find((i) => String(i.skuId) === String(skuId))
  if (item) {
    if (quantity <= 0) return removeGuestItem(skuId)
    item.quantity = quantity
    uni.setStorageSync(KEY, list)
  }
}

export function removeGuestItem(skuId) {
  uni.setStorageSync(KEY, getGuestCart().filter((i) => String(i.skuId) !== String(skuId)))
}

export function clearGuestCart() {
  uni.removeStorageSync(KEY)
}
