<template>
  <view class="order-list-page">
    <!-- 状态筛选 -->
    <scroll-view scroll-x class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.status"
        class="tab"
        :class="{ active: status === tab.status }"
        @click="switchTab(tab.status)"
      >
        {{ tab.label }}
      </view>
    </scroll-view>

    <view v-if="orders.length" class="order-list">
      <view class="card order" v-for="o in orders" :key="o.id" @click="goDetail(o)">
        <view class="o-head flex">
          <text class="flex-1 o-no">订单号：{{ o.orderNo }}</text>
          <text class="o-status" :class="statusClass(o.status)">{{ o.statusText || o.status }}</text>
        </view>
        <view class="o-items">
          <view class="o-item flex" v-for="it in (o.items || []).slice(0, 3)" :key="it.productId + it.skuName">
            <image class="o-img" :src="it.image || '/static/placeholder.png'" mode="aspectFill" />
            <view class="flex-1 o-info">
              <view class="o-name text-ellipsis">{{ it.productName }}</view>
              <view v-if="it.skuName" class="o-sku">{{ it.skuName }}</view>
            </view>
            <text class="o-price">{{ symbol }}{{ yuan(it.price) }} x{{ it.quantity }}</text>
          </view>
          <view v-if="o.items && o.items.length > 3" class="more">等{{ o.items.length }}件商品</view>
        </view>
        <view class="o-foot flex">
          <view class="flex-1 o-amount">
            共{{ (o.items || []).reduce((s, it) => s + it.quantity, 0) }}件 实付
            <text class="price">{{ symbol }}{{ yuan(o.payableAmount || o.totalAmount) }}</text>
          </view>
          <view v-if="o.status === 'pending_payment'" class="o-btn primary" @click.stop="pay(o)">去支付</view>
          <view v-if="o.status === 'pending_payment'" class="o-btn" @click.stop="cancel(o)">取消</view>
          <view v-if="o.status === 'shipped'" class="o-btn primary" @click.stop="confirmReceive(o)">确认收货</view>
          <view v-if="o.status === 'shipped' || o.status === 'paid'" class="o-btn" @click.stop="goTrack(o)">查看物流</view>
        </view>
      </view>
      <view v-if="loading" class="tip">加载中...</view>
      <view v-else-if="finished" class="tip">没有更多了</view>
    </view>

    <EmptyState v-else :icon="'📋'" :text="'暂无订单'" />

    <!-- 退款原因弹窗 -->
    <view v-if="showRefund" class="mask" @click="showRefund = false">
      <view class="refund-panel" @click.stop>
        <view class="rp-title">申请退款</view>
        <input class="rp-input" v-model="refundReason" placeholder="请输入退款原因" />
        <view class="rp-btns flex">
          <view class="rp-btn cancel" @click="showRefund = false">取消</view>
          <view class="rp-btn ok" @click="submitRefund">提交</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import EmptyState from '@/components/EmptyState.vue'
import { orderApi } from '@/api'
import { store, requireLogin } from '@/store'
import { fenToYuan } from '@/utils/format'

const tabs = [
  { label: '全部', status: '' },
  { label: '待付款', status: 'pending_payment' },
  { label: '待发货', status: 'paid' },
  { label: '待收货', status: 'shipped' },
  { label: '已完成', status: 'completed' },
]
const status = ref('')
const orders = ref([])
const page = ref(1)
const finished = ref(false)
const loading = ref(false)
const showRefund = ref(false)
const refundReason = ref('')
const refundOrder = ref(null)
const symbol = computed(() => (store.currency === 'USD' ? '$' : '¥'))

function yuan(fen) {
  return fenToYuan(fen)
}

onLoad((options) => {
  if (options.status) status.value = options.status
})

onShow(() => {
  if (store.token) load(true)
})

function switchTab(s) {
  status.value = s
  load(true)
}

async function load(reset) {
  if (!store.token) return
  if (loading.value) return
  if (reset) {
    page.value = 1
    finished.value = false
    orders.value = []
  }
  if (finished.value) return
  loading.value = true
  try {
    const data = await orderApi.list({ status: status.value, page: page.value, pageSize: 10 })
    const list = (data && data.list) || []
    orders.value = reset ? list : orders.value.concat(list)
    const total = data && data.total
    if (!list.length || (total !== undefined && orders.value.length >= total)) finished.value = true
    else page.value += 1
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onPullDownRefresh(() => load(true).finally(() => uni.stopPullDownRefresh()))
onReachBottom(() => load(false))

function statusClass(s) {
  if (s === 'pending_payment' || s === 'cancelled') return 'red'
  if (s === 'shipped') return 'blue'
  return ''
}

function goDetail(o) {
  uni.navigateTo({ url: '/pages/order/detail?id=' + o.id })
}

function pay(o) {
  uni.navigateTo({ url: '/pages/order/pay?orderId=' + o.id + '&amount=' + (o.payableAmount || 0) })
}

function cancel(o) {
  uni.showModal({
    title: '提示',
    content: '确定取消该订单吗？',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await orderApi.cancel(o.id)
        uni.showToast({ title: '已取消', icon: 'success' })
        load(true)
      } catch (e) {
        uni.showToast({ title: e.message, icon: 'none' })
      }
    },
  })
}

function confirmReceive(o) {
  uni.showModal({
    title: '提示',
    content: '确认已收到货？',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await orderApi.confirm(o.id)
        uni.showToast({ title: '已确认收货', icon: 'success' })
        load(true)
      } catch (e) {
        uni.showToast({ title: e.message, icon: 'none' })
      }
    },
  })
}

function goTrack(o) {
  uni.navigateTo({ url: '/pages/order/track?id=' + o.id })
}
</script>

<style lang="scss" scoped>
.order-list-page {
  padding-bottom: 40rpx;
}
.tabs {
  background: #fff;
  white-space: nowrap;
  padding: 20rpx 0;
  margin-bottom: 20rpx;
}
.tab {
  display: inline-block;
  padding: 8rpx 32rpx;
  font-size: 28rpx;
  color: #666;
}
.tab.active {
  color: #ff4d4f;
  font-weight: 700;
}
.order-list {
  padding: 0 20rpx;
}
.o-head {
  border-bottom: 2rpx solid #f5f5f5;
  padding-bottom: 16rpx;
  margin-bottom: 16rpx;
}
.o-no {
  font-size: 24rpx;
  color: #999;
}
.o-status {
  font-size: 26rpx;
  color: #ff9f0a;
}
.o-status.red {
  color: #ff4d4f;
}
.o-status.blue {
  color: #1677ff;
}
.o-item {
  margin-bottom: 16rpx;
}
.o-img {
  width: 96rpx;
  height: 96rpx;
  border-radius: 10rpx;
  background: #f2f3f5;
  margin-right: 16rpx;
}
.o-info {
  min-width: 0;
}
.o-name {
  font-size: 26rpx;
}
.o-sku {
  font-size: 22rpx;
  color: #999;
}
.o-price {
  font-size: 24rpx;
  color: #666;
}
.more {
  font-size: 22rpx;
  color: #999;
  text-align: right;
  margin-bottom: 12rpx;
}
.o-foot {
  border-top: 2rpx solid #f5f5f5;
  padding-top: 16rpx;
}
.o-amount {
  font-size: 24rpx;
  color: #666;
}
.o-btn {
  border: 2rpx solid #ddd;
  color: #666;
  font-size: 24rpx;
  padding: 8rpx 28rpx;
  border-radius: 32rpx;
  margin-left: 16rpx;
}
.o-btn.primary {
  border-color: #ff4d4f;
  color: #ff4d4f;
}
.tip {
  text-align: center;
  color: #999;
  padding: 24rpx;
  font-size: 24rpx;
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
}
.refund-panel {
  width: 600rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
}
.rp-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}
.rp-input {
  border: 2rpx solid #eee;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 26rpx;
}
.rp-btns {
  margin-top: 24rpx;
  justify-content: flex-end;
}
.rp-btn {
  padding: 14rpx 40rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  margin-left: 16rpx;
}
.rp-btn.cancel {
  background: #f5f6f8;
  color: #666;
}
.rp-btn.ok {
  background: #ff4d4f;
  color: #fff;
}
</style>
