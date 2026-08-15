<template>
  <view class="order-detail" v-if="order">
    <!-- 状态头 -->
    <view class="status-head">
      <view class="s-status">{{ order.statusText || order.status }}</view>
      <view class="s-tip" v-if="order.status === 'pending_payment'">请尽快完成支付</view>
    </view>

    <!-- 地址 -->
    <view class="card address" v-if="order.address">
      <text class="a-icon">📍</text>
      <view class="flex-1">
        <view>{{ order.address.name }} {{ order.address.phone }}</view>
        <view class="a-detail">{{ order.address.detail }}</view>
      </view>
    </view>

    <!-- 商品 -->
    <view class="card">
      <view class="o-item flex" v-for="it in order.items || []" :key="it.productId + it.skuName">
        <image class="o-img" :src="it.image || '/static/placeholder.png'" mode="aspectFill" />
        <view class="flex-1">
          <view class="o-name">{{ it.productName }}</view>
          <view class="o-sku" v-if="it.skuName">{{ it.skuName }}</view>
          <view class="o-line">{{ symbol }}{{ yuan(it.price) }} x{{ it.quantity }}</view>
        </view>
      </view>
    </view>

    <!-- 金额 -->
    <view class="card">
      <view class="flex row"><text class="flex-1">商品金额</text><text>{{ symbol }}{{ yuan(order.totalAmount) }}</text></view>
      <view v-if="order.discountAmount" class="flex row"><text class="flex-1">优惠</text><text class="red">-{{ symbol }}{{ yuan(order.discountAmount) }}</text></view>
      <view v-if="order.couponAmount" class="flex row"><text class="flex-1">优惠券</text><text class="red">-{{ symbol }}{{ yuan(order.couponAmount) }}</text></view>
      <view class="flex row strong"><text class="flex-1">实付金额</text><text class="price">{{ symbol }}{{ yuan(order.payableAmount || order.totalAmount) }}</text></view>
    </view>

    <!-- 订单信息 -->
    <view class="card">
      <view class="flex row"><text class="flex-1 grey">订单编号</text><text>{{ order.orderNo }}</text></view>
      <view class="flex row"><text class="flex-1 grey">支付方式</text><text>{{ order.paymentMethod || '未支付' }}</text></view>
      <view class="flex row"><text class="flex-1 grey">下单时间</text><text>{{ order.createdAt }}</text></view>
      <view v-if="order.paidAt" class="flex row"><text class="flex-1 grey">支付时间</text><text>{{ order.paidAt }}</text></view>
      <view v-if="order.remark" class="flex row"><text class="flex-1 grey">备注</text><text>{{ order.remark }}</text></view>
    </view>

    <!-- 操作 -->
    <view class="actions safe-bottom">
      <view v-if="order.status === 'pending_payment'" class="a-btn" @click="cancelOrder">取消订单</view>
      <view v-if="order.status === 'pending_payment'" class="a-btn primary" @click="goPay">去支付</view>
      <view v-if="order.status === 'shipped'" class="a-btn" @click="goTrack">查看物流</view>
      <view v-if="order.status === 'shipped'" class="a-btn primary" @click="confirmOrder">确认收货</view>
      <view v-if="order.status === 'paid' || order.status === 'completed'" class="a-btn" @click="openRefund">申请退款</view>
    </view>

    <!-- 退款弹窗 -->
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
  <view v-else class="loading-full">加载中...</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderApi } from '@/api'
import { store, requireLogin } from '@/store'
import { fenToYuan } from '@/utils/format'

const order = ref(null)
const showRefund = ref(false)
const refundReason = ref('')
const symbol = computed(() => (store.currency === 'USD' ? '$' : '¥'))

function yuan(fen) {
  return fenToYuan(fen)
}

onLoad(async (options) => {
  if (!requireLogin()) return
  try {
    order.value = await orderApi.detail(options.id)
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
})

function goPay() {
  uni.navigateTo({ url: '/pages/order/pay?orderId=' + order.value.id + '&amount=' + (order.value.payableAmount || 0) })
}

function cancelOrder() {
  uni.showModal({
    title: '提示',
    content: '确定取消该订单吗？',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await orderApi.cancel(order.value.id)
        uni.showToast({ title: '已取消', icon: 'success' })
        order.value.status = 'cancelled'
        order.value.statusText = '已取消'
      } catch (e) {
        uni.showToast({ title: e.message, icon: 'none' })
      }
    },
  })
}

function confirmOrder() {
  uni.showModal({
    title: '提示',
    content: '确认已收到货？',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await orderApi.confirm(order.value.id)
        uni.showToast({ title: '已确认收货', icon: 'success' })
        order.value.status = 'completed'
        order.value.statusText = '已完成'
      } catch (e) {
        uni.showToast({ title: e.message, icon: 'none' })
      }
    },
  })
}

function goTrack() {
  uni.navigateTo({ url: '/pages/order/track?id=' + order.value.id })
}

function openRefund() {
  showRefund.value = true
}

async function submitRefund() {
  if (!refundReason.value.trim()) {
    uni.showToast({ title: '请填写退款原因', icon: 'none' })
    return
  }
  try {
    await orderApi.applyRefund(order.value.id, { reason: refundReason.value.trim() })
    uni.showToast({ title: '退款申请已提交', icon: 'success' })
    showRefund.value = false
    order.value.status = 'refunding'
    order.value.statusText = '退款中'
  } catch (e) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.order-detail {
  padding-bottom: 160rpx;
}
.status-head {
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  color: #fff;
  padding: 48rpx 32rpx;
}
.s-status {
  font-size: 40rpx;
  font-weight: 700;
}
.s-tip {
  font-size: 24rpx;
  opacity: 0.85;
  margin-top: 8rpx;
}
.address {
  display: flex;
  align-items: center;
  margin: 20rpx;
}
.a-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}
.a-detail {
  color: #999;
  font-size: 24rpx;
  margin-top: 4rpx;
}
.card {
  margin: 0 20rpx 20rpx;
}
.o-item {
  padding: 12rpx 0;
}
.o-img {
  width: 110rpx;
  height: 110rpx;
  border-radius: 10rpx;
  background: #f2f3f5;
  margin-right: 16rpx;
}
.o-name {
  font-size: 26rpx;
}
.o-sku {
  font-size: 22rpx;
  color: #999;
}
.o-line {
  font-size: 24rpx;
  color: #666;
  margin-top: 6rpx;
}
.row {
  padding: 10rpx 0;
  font-size: 26rpx;
  color: #333;
}
.row.strong {
  border-top: 2rpx solid #f5f5f5;
  padding-top: 16rpx;
  margin-top: 8rpx;
}
.grey {
  color: #999;
}
.red {
  color: #ff4d4f;
}
.actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  display: flex;
  justify-content: flex-end;
  padding: 16rpx 24rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
}
.a-btn {
  border: 2rpx solid #ddd;
  color: #666;
  font-size: 26rpx;
  padding: 14rpx 36rpx;
  border-radius: 36rpx;
  margin-left: 16rpx;
  background: #fff;
}
.a-btn.primary {
  border-color: #ff4d4f;
  color: #fff;
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
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
.loading-full {
  text-align: center;
  color: #999;
  padding: 200rpx 0;
}
</style>
