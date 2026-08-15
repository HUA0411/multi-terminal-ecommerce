<template>
  <view class="mine-page">
    <!-- 用户信息 -->
    <view class="user-card">
      <view class="user-info flex">
        <image class="avatar" :src="avatar" mode="aspectFill" @click="goLogin" />
        <view class="flex-1" @click="goLogin">
          <view class="nickname">{{ nickname }}</view>
          <view class="phone">{{ phoneText }}</view>
        </view>
        <view class="points" @click="goPoints">
          <text class="points-num">{{ userPoints }}</text>
          <text class="points-label">积分</text>
        </view>
      </view>
      <view class="order-entries">
        <view class="order-entry" v-for="o in orderEntries" :key="o.status" @click="goOrders(o.status)">
          <text class="oe-icon">{{ o.icon }}</text>
          <text class="oe-label">{{ o.label }}</text>
        </view>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="card menu">
      <view class="menu-item flex" v-for="m in menus" :key="m.title" @click="goMenu(m)">
        <text class="mi-icon">{{ m.icon }}</text>
        <text class="mi-title flex-1">{{ m.title }}</text>
        <text class="mi-arrow">›</text>
      </view>
    </view>

    <!-- 语言 / 货币 -->
    <view class="card menu">
      <view class="menu-item flex" @click="pickLanguage">
        <text class="mi-icon">🌐</text>
        <text class="mi-title flex-1">语言 / Language</text>
        <text class="mi-value">{{ store.language }}</text>
        <text class="mi-arrow">›</text>
      </view>
      <view class="menu-item flex" @click="pickCurrency">
        <text class="mi-icon">💱</text>
        <text class="mi-title flex-1">货币 / Currency</text>
        <text class="mi-value">{{ store.currency }}</text>
        <text class="mi-arrow">›</text>
      </view>
    </view>

    <view v-if="store.token" class="logout" @click="doLogout">退出登录</view>
    <view class="version">多端商城 v1.0.0</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { store, logout, setLanguage, setCurrency } from '@/store'
import { authApi, settingsApi } from '@/api'
import { realtime } from '@/utils/ws'

const user = ref(null)

const avatar = computed(() => (user.value && user.value.avatar) || (store.user && store.user.avatar) || '/static/logo.png')
const nickname = computed(() => (user.value && user.value.nickname) || (store.user && store.user.nickname) || '未登录')
const phoneText = computed(() => (user.value && user.value.phone) || (store.user && store.user.phone) || '点击登录')
const userPoints = computed(() => (user.value && user.value.points !== undefined ? user.value.points : store.user ? store.user.points : 0))

const orderEntries = [
  { icon: '📋', label: '全部订单', status: '' },
  { icon: '💰', label: '待付款', status: 'pending_payment' },
  { icon: '📦', label: '待发货', status: 'paid' },
  { icon: '🚚', label: '待收货', status: 'shipped' },
  { icon: '✅', label: '已完成', status: 'completed' },
]

const menus = [
  { icon: '🎟️', title: '优惠券中心', url: '/pages/coupon/center' },
  { icon: '💳', title: '我的优惠券', url: '/pages/coupon/mine' },
  { icon: '⭐', title: '积分明细', url: '/pages/points/index' },
  { icon: '\u{1F4E6}', title: '售后记录', url: '/pages/aftersale/list' },
  { icon: '\u{1F49B}', title: '我的收藏', url: '/pages/favorite/list' },
  { icon: '\u{1F514}', title: '消息通知', url: '/pages/notifications/index' },
  { icon: '\u{1F4B0}', title: '询价单', url: '/pages/quotes/index' },
  { icon: '📍', title: '收货地址', url: '/pages/address/list' },
  { icon: '📺', title: '直播带货', url: '/pages/live/list' },
  { icon: '⚡', title: '限时秒杀', url: '/pages/flashsale/index' },
  { icon: '👗', title: '虚拟试衣', url: '/pages/fitting/index' },
]

onShow(async () => {
  if (store.token) {
    try {
      user.value = await authApi.me()
      store.user = user.value
    } catch (e) {
      /* 忽略 */
    }
  } else {
    user.value = null
  }
  loadSettings()
})

async function loadSettings() {
  try {
    if (!store.settings) store.settings = await settingsApi.public()
  } catch (e) {
    /* 忽略 */
  }
}

function goLogin() {
  if (store.token) return
  uni.navigateTo({ url: '/pages/login/login' })
}

function goOrders(status) {
  if (!store.token) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: '/pages/order/list' + (status ? '?status=' + status : '') })
}

function goPoints() {
  if (!store.token) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: '/pages/points/index' })
}

function goMenu(m) {
  if (!store.token && m.url !== '/pages/live/list' && m.url !== '/pages/flashsale/index' && m.url !== '/pages/fitting/index' && m.url !== '/pages/coupon/center') {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: m.url })
}

function pickLanguage() {
  const languages = (store.settings && store.settings.languages) || [
    { code: 'zh-CN', name: '简体中文' },
    { code: 'en-US', name: 'English' },
  ]
  uni.showActionSheet({
    itemList: languages.map((l) => l.name + ' (' + l.code + ')'),
    success: (res) => {
      const lang = languages[res.tapIndex]
      setLanguage(lang.code)
      uni.showToast({ title: '已切换语言', icon: 'none' })
    },
  })
}

function pickCurrency() {
  const currencies = (store.settings && store.settings.currencies) || [
    { code: 'CNY', name: '人民币' },
    { code: 'USD', name: '美元' },
  ]
  uni.showActionSheet({
    itemList: currencies.map((c) => c.name + ' (' + c.code + ')'),
    success: (res) => {
      const cur = currencies[res.tapIndex]
      setCurrency(cur.code)
      uni.showToast({ title: '已切换货币', icon: 'none' })
    },
  })
}

function doLogout() {
  uni.showModal({
    title: '提示',
    content: '确定退出登录吗？',
    success: (r) => {
      if (r.confirm) {
        realtime.close()
        logout()
        user.value = null
        uni.showToast({ title: '已退出', icon: 'none' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.mine-page {
  padding: 20rpx;
}
.user-card {
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  border-radius: 20rpx;
  padding: 32rpx 24rpx 20rpx;
  color: #fff;
}
.user-info {
  margin-bottom: 24rpx;
}
.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.6);
  margin-right: 20rpx;
  background: #fff;
}
.nickname {
  font-size: 34rpx;
  font-weight: 700;
}
.phone {
  font-size: 24rpx;
  opacity: 0.85;
  margin-top: 6rpx;
}
.points {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16rpx;
  padding: 12rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.points-num {
  font-size: 32rpx;
  font-weight: 700;
}
.points-label {
  font-size: 20rpx;
  opacity: 0.85;
}
.order-entries {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 0;
  color: #333;
}
.order-entry {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.oe-icon {
  font-size: 36rpx;
  margin-bottom: 6rpx;
}
.oe-label {
  font-size: 22rpx;
  color: #666;
}
.menu {
  margin-top: 20rpx;
}
.menu-item {
  padding: 24rpx 8rpx;
  border-bottom: 2rpx solid #f5f5f5;
}
.menu-item:last-child {
  border-bottom: none;
}
.mi-icon {
  margin-right: 16rpx;
  font-size: 32rpx;
}
.mi-title {
  font-size: 28rpx;
  color: #333;
}
.mi-value {
  font-size: 24rpx;
  color: #999;
  margin-right: 8rpx;
}
.mi-arrow {
  color: #ccc;
  font-size: 32rpx;
}
.logout {
  margin-top: 30rpx;
  background: #fff;
  border-radius: 16rpx;
  text-align: center;
  padding: 26rpx;
  color: #ff4d4f;
  font-size: 28rpx;
}
.version {
  text-align: center;
  color: #bbb;
  font-size: 22rpx;
  padding: 30rpx 0;
}
</style>