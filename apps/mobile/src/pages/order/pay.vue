<template>
  <view class="pay-page">
    <view class="card amount-card">
      <text class="amount-label">应付金额</text>
      <view class="amount"><text class="symbol">{{ symbol }}</text>{{ yuan(amount) }}</view>
      <view class="order-no">订单号：{{ orderNo || orderId }}</view>
      <view v-if="orderStatusText" class="order-status">{{ orderStatusText }}</view>
    </view>

    <!-- 支付方式 -->
    <view class="card">
      <view class="pm-title">选择支付方式</view>
      <view
        v-for="m in methods"
        :key="m.code"
        class="pm-item flex"
        :class="{ active: method === m.code }"
        @click="method = m.code"
      >
        <text class="pm-icon">{{ m.code === 'wechat' ? '💚' : '💙' }}</text>
        <text class="flex-1 pm-name">{{ m.name }}</text>
        <view class="pm-radio" :class="{ on: method === m.code }"><text v-if="method === m.code">✓</text></view>
      </view>
    </view>

    <!-- 沙箱二维码 -->
    <view v-if="qrCodeUrl" class="card qr-card">
      <text class="qr-title">沙箱支付二维码（模拟）</text>
      <image class="qr-img" :src="qrCodeUrl" mode="aspectFit" />
    </view>

    <view class="pay-btn" @click="doPay" :class="{ disabled: paying }">
      {{ paying ? '支付中...' : qrCodeUrl ? '模拟支付成功' : '立即支付' }}
    </view>
    <view v-if="qrCodeUrl" class="pay-btn plain" @click="checkStatus">查询支付结果</view>

    <view v-if="success" class="success-tip">✅ 支付成功，正在跳转...</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { orderApi, paymentApi } from '@/api'
import { store, requireLogin } from '@/store'
import { fenToYuan } from '@/utils/format'

const orderId = ref('')
const amount = ref(0)
const orderNo = ref('')
const orderStatusText = ref('')
const methods = ref([])
const method = ref('wechat')
const paymentId = ref('')
const qrCodeUrl = ref('')
const paying = ref(false)
const success = ref(false)
let pollTimer = null

const symbol = computed(() => (store.currency === 'USD' ? '$' : '¥'))

function yuan(fen) {
  return fenToYuan(fen)
}

onLoad(async (options) => {
  if (!requireLogin()) return
  orderId.value = options.orderId
  amount.value = Number(options.amount || 0)
  try {
    const [ms, order] = await Promise.all([paymentApi.methods(), orderApi.detail(orderId.value)])
    methods.value = ms || []
    if (methods.value.length && !methods.value.find((m) => m.code === method.value)) method.value = methods.value[0].code
    orderNo.value = order.orderNo
    orderStatusText.value = order.statusText
    if (!amount.value) amount.value = Number(order.payableAmount || 0)
    // 已支付直接进入成功状态
    if (order.status === 'paid' || order.status === 'shipped' || order.status === 'completed') success.value = true
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
})

async function doPay() {
  if (paying.value) return
  paying.value = true
  try {
    if (qrCodeUrl.value && paymentId.value) {
      // 模拟支付成功
      await paymentApi.mockSuccess(paymentId.value)
      pollStatus()
      return
    }
    const data = await paymentApi.pay(orderId.value, { method: method.value })
    paymentId.value = data.paymentId
    qrCodeUrl.value = data.qrCodeUrl || ''
    if (!qrCodeUrl.value) {
      // 无二维码，直接模拟成功
      await paymentApi.mockSuccess(data.paymentId)
      pollStatus()
      return
    }
    uni.showToast({ title: '请扫码或点击模拟支付成功', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: e.message || '支付失败', icon: 'none' })
  } finally {
    paying.value = false
  }
}

async function checkStatus() {
  if (!paymentId.value) return
  await pollStatus()
}

function pollStatus() {
  let tries = 0
  clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    tries += 1
    try {
      const st = await paymentApi.status(paymentId.value)
      if (st.status === 'success') {
        clearInterval(pollTimer)
        success.value = true
        uni.showToast({ title: '支付成功', icon: 'success' })
        setTimeout(() => {
          uni.redirectTo({ url: '/pages/order/detail?id=' + orderId.value })
        }, 1200)
      } else if (tries > 12) {
        clearInterval(pollTimer)
        uni.showToast({ title: '支付结果未知，请稍后查询', icon: 'none' })
      }
    } catch (e) {
      clearInterval(pollTimer)
      uni.showToast({ title: '查询失败', icon: 'none' })
    }
  }, 1500)
}

onUnload(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style lang="scss" scoped>
.pay-page {
  padding: 20rpx;
}
.amount-card {
  text-align: center;
  padding: 40rpx 24rpx;
}
.amount-label {
  color: #999;
  font-size: 26rpx;
}
.amount {
  font-size: 64rpx;
  font-weight: 700;
  color: #ff4d4f;
  margin: 16rpx 0;
}
.symbol {
  font-size: 36rpx;
}
.order-no {
  color: #999;
  font-size: 24rpx;
}
.order-status {
  color: #07c160;
  font-size: 24rpx;
  margin-top: 8rpx;
}
.pm-title {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}
.pm-item {
  padding: 24rpx 8rpx;
  border-bottom: 2rpx solid #f5f5f5;
}
.pm-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}
.pm-name {
  font-size: 28rpx;
}
.pm-radio {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22rpx;
}
.pm-radio.on {
  background: #ff4d4f;
  border-color: #ff4d4f;
}
.qr-card {
  text-align: center;
}
.qr-title {
  color: #999;
  font-size: 24rpx;
}
.qr-img {
  width: 360rpx;
  height: 360rpx;
  margin-top: 16rpx;
}
.pay-btn {
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  color: #fff;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
  margin-top: 24rpx;
}
.pay-btn.plain {
  background: #fff;
  color: #ff4d4f;
  border: 2rpx solid #ff4d4f;
}
.pay-btn.disabled {
  opacity: 0.6;
}
.success-tip {
  text-align: center;
  color: #07c160;
  font-size: 28rpx;
  margin-top: 30rpx;
}
</style>
