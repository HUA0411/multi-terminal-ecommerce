<template>
  <view class="flash-page">
    <view class="flash-banner">
      <text class="fb-icon">⚡</text>
      <text class="fb-title">限时秒杀</text>
      <text class="fb-sub">手慢无！</text>
    </view>

    <view v-if="list.length" class="flash-list">
      <view class="card flash-item" v-for="f in list" :key="f.id">
        <image class="f-img" :src="f.image || '/static/placeholder.png'" mode="aspectFill" @click="goDetail(f)" />
        <view class="f-info flex-1">
          <view class="f-name text-ellipsis-2" @click="goDetail(f)">{{ f.productName }}</view>
          <view class="f-price-row flex">
            <text class="price f-price"><text class="symbol">¥</text>{{ yuan(f.flashPrice) }}</text>
            <text class="f-original">¥{{ yuan(f.originalPrice) }}</text>
          </view>
          <view class="f-progress flex">
            <view class="progress-bar flex-1"><view class="progress-inner" :style="{ width: progress(f) + '%' }"></view></view>
            <text class="progress-text">已抢{{ percent(f) }}</text>
          </view>
          <view class="f-bottom flex">
            <CountDown :end-time="f.endAt" />
            <view class="f-btn" @click="seckill(f)">立即秒杀</view>
          </view>
        </view>
      </view>
    </view>
    <EmptyState v-else :icon="'⚡'" :text="'暂无进行中的秒杀'" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import EmptyState from '@/components/EmptyState.vue'
import CountDown from '@/components/CountDown.vue'
import { flashApi, productApi } from '@/api'
import { requireLogin } from '@/store'
import { fenToYuan } from '@/utils/format'

const list = ref([])

function yuan(fen) {
  return fenToYuan(fen)
}

onShow(async () => {
  try {
    list.value = await flashApi.list()
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
})

function progress(f) {
  const total = f.quota || 0
  if (!total) return 0
  return Math.min(100, Math.round(((f.sold || 0) / total) * 100))
}

function percent(f) {
  return (f.sold || 0) + '/' + (f.quota || 0)
}

function goDetail(f) {
  uni.navigateTo({ url: '/pages/product/detail?id=' + f.productId })
}

async function seckill(f) {
  if (!requireLogin()) return
  uni.showLoading({ title: '抢购中...' })
  try {
    // 获取默认 SKU
    const detail = await productApi.detail(f.productId)
    const skus = (detail && detail.skus) || []
    let skuId = skus.length ? skus[0].id : null
    if (!skuId) {
      uni.hideLoading()
      uni.showToast({ title: '该商品暂无可售规格', icon: 'none' })
      return
    }
    const res = await flashApi.seckill(f.id, { skuId })
    uni.hideLoading()
    if (res && res.order) {
      uni.showToast({ title: '抢购成功，请尽快支付', icon: 'success' })
      setTimeout(() => {
        uni.navigateTo({ url: '/pages/order/pay?orderId=' + res.order.id + '&amount=' + (res.order.payableAmount || 0) })
      }, 800)
    } else {
      uni.showToast({ title: '抢购成功', icon: 'success' })
    }
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '抢购失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.flash-page {
  padding: 20rpx;
}
.flash-banner {
  background: linear-gradient(135deg, #ff3b3b, #ff6b35);
  border-radius: 20rpx;
  color: #fff;
  padding: 32rpx;
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.fb-icon {
  font-size: 48rpx;
  margin-right: 16rpx;
}
.fb-title {
  font-size: 36rpx;
  font-weight: 700;
}
.fb-sub {
  font-size: 24rpx;
  opacity: 0.9;
  margin-left: 16rpx;
}
.flash-item {
  display: flex;
  padding: 20rpx;
}
.f-img {
  width: 220rpx;
  height: 220rpx;
  border-radius: 12rpx;
  background: #f2f3f5;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.f-info {
  min-width: 0;
}
.f-name {
  font-size: 26rpx;
  min-height: 68rpx;
}
.f-price-row {
  align-items: baseline;
  margin-top: 8rpx;
}
.f-price {
  font-size: 36rpx;
}
.symbol {
  font-size: 24rpx;
}
.f-original {
  color: #999;
  text-decoration: line-through;
  font-size: 24rpx;
  margin-left: 12rpx;
}
.f-progress {
  margin-top: 12rpx;
}
.progress-bar {
  height: 12rpx;
  background: #ffecec;
  border-radius: 8rpx;
  overflow: hidden;
  margin-right: 12rpx;
}
.progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #ff6b35, #ff3b3b);
  border-radius: 8rpx;
}
.progress-text {
  font-size: 20rpx;
  color: #999;
}
.f-bottom {
  margin-top: 12rpx;
  justify-content: space-between;
}
.f-btn {
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  color: #fff;
  font-size: 24rpx;
  padding: 10rpx 30rpx;
  border-radius: 32rpx;
}
</style>
