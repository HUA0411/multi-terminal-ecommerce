<template>
  <view class="coupon-center">
    <view class="top-bar flex">
      <view class="flex-1"></view>
      <view class="mine-link" @click="goMine">我的优惠券 ›</view>
    </view>
    <view v-if="list.length" class="coupon-list">
      <view class="coupon card" v-for="c in list" :key="c.id">
        <view class="c-left">
          <view class="c-amount">
            <text class="c-symbol">{{ c.amountType === 'percent' ? '' : '¥' }}</text>
            <text class="c-num">{{ c.amountType === 'percent' ? c.amount + '%' : yuan(c.amount) }}</text>
          </view>
          <view class="c-condition" v-if="c.minAmount">{{ '满' + yuan(c.minAmount) + '可用' }}</view>
        </view>
        <view class="c-mid flex-1">
          <view class="c-name">{{ c.name || c.title || '优惠券' }}</view>
          <view class="c-date" v-if="c.endAt">有效期至 {{ c.endAt.slice(0, 10) }}</view>
          <view class="c-desc" v-if="c.description">{{ c.description }}</view>
        </view>
        <view class="c-claim" :class="{ claimed: c.claimed }" @click="claim(c)">
          {{ c.claimed ? '已领取' : '领取' }}
        </view>
      </view>
      <view v-if="loading" class="tip">加载中...</view>
      <view v-else-if="finished && list.length" class="tip">没有更多了</view>
    </view>
    <EmptyState v-else :icon="'🎟️'" :text="'暂无可领取的优惠券'" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onReachBottom } from '@dcloudio/uni-app'
import EmptyState from '@/components/EmptyState.vue'
import { couponApi } from '@/api'
import { fenToYuan } from '@/utils/format'

const list = ref([])
const page = ref(1)
const finished = ref(false)
const loading = ref(false)

function yuan(fen) {
  return fenToYuan(fen)
}

onShow(() => load(true))

async function load(reset) {
  if (loading.value) return
  if (reset) {
    page.value = 1
    finished.value = false
    list.value = []
  }
  if (finished.value) return
  loading.value = true
  try {
    const data = await couponApi.available({ page: page.value, pageSize: 20 })
    const arr = (data && data.list) || data || []
    list.value = reset ? arr : list.value.concat(arr)
    const total = data && data.total
    if (!arr.length || (total !== undefined && list.value.length >= total)) finished.value = true
    else page.value += 1
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function claim(c) {
  if (c.claimed) return
  try {
    await couponApi.claim(c.id)
    c.claimed = true
    uni.showToast({ title: '领取成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '领取失败', icon: 'none' })
  }
}

function goMine() {
  uni.navigateTo({ url: '/pages/coupon/mine' })
}

onReachBottom(() => load(false))
</script>

<style lang="scss" scoped>
.coupon-center {
  padding: 20rpx;
}
.top-bar {
  margin-bottom: 20rpx;
}
.mine-link {
  font-size: 26rpx;
  color: #666;
  padding: 8rpx 0;
}
.coupon {
  display: flex;
  align-items: center;
  padding: 0;
  overflow: hidden;
}
.c-left {
  width: 200rpx;
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  color: #fff;
  text-align: center;
  padding: 30rpx 0;
}
.c-amount {
  font-size: 32rpx;
  font-weight: 700;
}
.c-num {
  font-size: 44rpx;
}
.c-condition {
  font-size: 22rpx;
  opacity: 0.9;
  margin-top: 6rpx;
}
.c-mid {
  padding: 20rpx 24rpx;
  min-width: 0;
}
.c-name {
  font-size: 28rpx;
  font-weight: 600;
}
.c-date,
.c-desc {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
.c-claim {
  margin-right: 24rpx;
  background: #fff0f0;
  color: #ff4d4f;
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
}
.c-claim.claimed {
  background: #f5f6f8;
  color: #999;
}
.tip {
  text-align: center;
  color: #999;
  padding: 24rpx;
  font-size: 24rpx;
}
</style>
