<template>
  <view class="cart-page">
    <!-- 未登录提示 -->
    <view v-if="!isLogin" class="login-tip">
      <text>{{ t('syncHint') }}</text>
      <view class="login-btn" @click="requireLogin()">{{ t('login') }}</view>
    </view>

    <!-- 商品列表 -->
    <view v-if="items.length" class="cart-list">
      <view v-for="item in items" :key="item.id || item.skuId" class="cart-item card">
        <view class="check" :class="{ on: item.checked }" @click="toggle(item)">
          <text v-if="item.checked">✓</text>
        </view>
        <image class="thumb" :src="item.image || '/static/placeholder.png'" mode="aspectFill" @click="goDetail(item)" />
        <view class="info">
          <view class="name text-ellipsis-2" @click="goDetail(item)">{{ item.productName || item.name }}</view>
          <view class="sku-name" v-if="item.skuName">{{ item.skuName }}</view>
          <view class="bottom flex">
            <text class="price"><text class="symbol">{{ symbol }}</text>{{ yuan(item.price) }}</text>
            <view class="stepper">
              <view class="step-btn" @click="changeQty(item, -1)">−</view>
              <text class="qty">{{ item.quantity }}</text>
              <view class="step-btn" @click="changeQty(item, 1)">+</view>
            </view>
          </view>
        </view>
        <view class="del" @click="removeItem(item)">删除</view>
      </view>
      <view class="clear-all" @click="clearCart">{{ t('clearCart') }}</view>
    </view>

    <EmptyState v-else :icon="isLogin ? '🛒' : '🔒'" :text="isLogin ? t('cartEmpty') : t('empty')" />

    <!-- 底部结算栏 -->
    <view v-if="items.length" class="footer safe-bottom">
      <view class="select-all flex" @click="toggleAll">
        <view class="check" :class="{ on: allChecked }"><text v-if="allChecked">✓</text></view>
        <text>{{ t('selectAll') }}</text>
      </view>
      <view class="total flex-1">
        <text class="t-label">{{ t('totalPrice') }}:</text>
        <text class="price"><text class="symbol">{{ symbol }}</text>{{ yuan(totalPrice) }}</text>
      </view>
      <view class="checkout-btn" @click="checkout">{{ t('checkout') }}({{ checkedQty }})</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import EmptyState from '@/components/EmptyState.vue'
import { cartApi, productApi } from '@/api'
import { store, requireLogin, setCartCount } from '@/store'
import { getGuestCart, updateGuestItem, removeGuestItem, clearGuestCart } from '@/utils/guestCart'
import { fenToYuan } from '@/utils/format'
import { t } from '@/utils/i18n'
import { realtime } from '@/utils/ws'

const isLogin = ref(!!store.token)
const items = ref([])
const symbol = computed(() => (store.currency === 'USD' ? '$' : '¥'))

const totalPrice = computed(() =>
  items.value.filter((i) => i.checked).reduce((sum, i) => sum + (Number(i.price) || 0) * i.quantity, 0)
)
const checkedQty = computed(() => items.value.filter((i) => i.checked).reduce((sum, i) => sum + i.quantity, 0))
const allChecked = computed(() => items.value.length > 0 && items.value.every((i) => i.checked))

function yuan(fen) {
  return fenToYuan(fen)
}

let refreshHandler = null

onShow(async () => {
  isLogin.value = !!store.token
  if (isLogin.value) {
    await mergeGuest()
    refresh()
    realtime.subscribe('cart')
    refreshHandler = () => refresh()
    realtime.on('cart:changed', refreshHandler)
  } else {
    await loadGuest()
  }
})

onHide(() => {
  if (refreshHandler) realtime.off('cart:changed', refreshHandler)
})

onUnload(() => {
  if (refreshHandler) realtime.off('cart:changed', refreshHandler)
})

async function refresh() {
  try {
    const data = await cartApi.get()
    items.value = (data && data.items) || []
    setCartCount(data.totalQuantity || 0)
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
}

async function mergeGuest() {
  const guest = getGuestCart()
  if (!guest.length) return
  try {
    await cartApi.merge({ items: guest.map((i) => ({ skuId: i.skuId, quantity: i.quantity })) })
    clearGuestCart()
    uni.showToast({ title: '游客购物车已合并', icon: 'none' })
  } catch (e) {
    console.warn('merge guest cart failed', e.message)
  }
}

async function toggle(item) {
  item.checked = !item.checked
  if (isLogin.value && item.id) {
    try {
      await cartApi.update(item.id, { checked: item.checked })
    } catch (e) {
      /* 忽略，本地已更新 */
    }
  }
}

async function changeQty(item, delta) {
  const next = item.quantity + delta
  if (next < 1) return
  if (item.stock !== undefined && next > item.stock) {
    uni.showToast({ title: '已达库存上限', icon: 'none' })
    return
  }
  item.quantity = next
  if (isLogin.value && item.id) {
    try {
      await cartApi.update(item.id, { quantity: next })
    } catch (e) {
      uni.showToast({ title: e.message, icon: 'none' })
    }
  } else {
    updateGuestItem(item.skuId, next)
  }
}

async function removeItem(item) {
  if (isLogin.value && item.id) {
    try {
      await cartApi.remove(item.id)
    } catch (e) {
      uni.showToast({ title: e.message, icon: 'none' })
      return
    }
  } else {
    removeGuestItem(item.skuId)
  }
  items.value = items.value.filter((i) => (i.id || i.skuId) !== (item.id || item.skuId))
  if (isLogin.value) setCartCount(items.value.reduce((s, i) => s + i.quantity, 0))
}

async function clearCart() {
  const ok = await confirmDialog('确定清空购物车吗？')
  if (!ok) return
  if (isLogin.value) {
    try {
      await cartApi.clear()
      items.value = []
      setCartCount(0)
    } catch (e) {
      uni.showToast({ title: e.message, icon: 'none' })
    }
  } else {
    clearGuestCart()
    items.value = []
  }
}

async function toggleAll() {
  const target = !allChecked.value
  items.value.forEach((i) => (i.checked = target))
  if (isLogin.value) {
    await Promise.all(items.value.filter((i) => i.id).map((i) => cartApi.update(i.id, { checked: target }).catch(() => {})))
  }
}

function checkout() {
  const checked = items.value.filter((i) => i.checked)
  if (!checked.length) {
    uni.showToast({ title: '请先选择商品', icon: 'none' })
    return
  }
  if (!requireLogin()) return
  const ids = checked.map((i) => i.id).filter(Boolean)
  uni.navigateTo({ url: '/pages/order/confirm' + (ids.length ? '?ids=' + ids.join(',') : '') })
}

async function loadGuest() {
  const guest = getGuestCart()
  if (!guest.length) {
    items.value = []
    return
  }
  const uniqueProducts = [...new Set(guest.map((i) => i.productId))]
  const details = {}
  await Promise.all(
    uniqueProducts.map(async (pid) => {
      try {
        details[pid] = await productApi.detail(pid)
      } catch (e) {
        /* 忽略 */
      }
    })
  )
  items.value = guest
    .map((g) => {
      const detail = details[g.productId]
      const sku = detail && detail.skus ? detail.skus.find((s) => String(s.id) === String(g.skuId)) : null
      return {
        skuId: g.skuId,
        productId: g.productId,
        productName: detail ? detail.name : '商品已失效',
        skuName: sku ? sku.name : '',
        image: detail ? detail.mainImage : '',
        price: sku ? sku.price : detail ? detail.price : 0,
        stock: sku ? sku.stock : detail ? detail.stock : 0,
        quantity: g.quantity,
        checked: true,
      }
    })
    .filter((i) => i.productName !== '商品已失效' || true)
}

function goDetail(item) {
  uni.navigateTo({ url: '/pages/product/detail?id=' + item.productId })
}

function confirmDialog(content) {
  return new Promise((resolve) => {
    uni.showModal({ title: '提示', content, success: (r) => resolve(r.confirm) })
  })
}
</script>

<style lang="scss" scoped>
.cart-page {
  padding: 20rpx;
  padding-bottom: 140rpx;
}
.login-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff7e6;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 20rpx;
  font-size: 24rpx;
  color: #b26a00;
}
.login-btn {
  background: #ff4d4f;
  color: #fff;
  padding: 8rpx 28rpx;
  border-radius: 32rpx;
  font-size: 24rpx;
}
.cart-item {
  display: flex;
  align-items: center;
  position: relative;
}
.check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #ccc;
  margin-right: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24rpx;
  flex-shrink: 0;
}
.check.on {
  background: #ff4d4f;
  border-color: #ff4d4f;
}
.thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #f2f3f5;
  flex-shrink: 0;
}
.info {
  flex: 1;
  margin-left: 16rpx;
  min-width: 0;
}
.name {
  font-size: 26rpx;
  color: #333;
}
.sku-name {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}
.bottom {
  margin-top: 12rpx;
  justify-content: space-between;
}
.symbol {
  font-size: 22rpx;
}
.stepper {
  display: flex;
  align-items: center;
  border: 2rpx solid #eee;
  border-radius: 8rpx;
}
.step-btn {
  width: 52rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #333;
}
.qty {
  min-width: 52rpx;
  text-align: center;
  font-size: 26rpx;
}
.del {
  position: absolute;
  top: 12rpx;
  right: 16rpx;
  font-size: 22rpx;
  color: #999;
  padding: 8rpx;
}
.clear-all {
  text-align: center;
  color: #999;
  font-size: 24rpx;
  padding: 20rpx;
}
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
}
.select-all {
  font-size: 26rpx;
  color: #666;
}
.total {
  text-align: right;
  margin-right: 20rpx;
}
.t-label {
  font-size: 24rpx;
  color: #999;
}
.checkout-btn {
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  color: #fff;
  padding: 18rpx 40rpx;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: 600;
}
</style>