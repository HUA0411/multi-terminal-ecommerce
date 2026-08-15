<template>
  <view class="points-page">
    <view class="balance-card">
      <text class="b-label">当前积分</text>
      <view class="b-num">{{ balance }}</view>
      <text class="b-tip">积分可在下单时抵扣优惠</text>
    </view>

    <view class="section-title">积分明细</view>
    <view v-if="logs.length" class="card log-list">
      <view class="log-item flex" v-for="(l, i) in logs" :key="i">
        <view class="flex-1">
          <view class="l-reason">{{ l.reason }}</view>
          <view class="l-time">{{ l.createdAt }}</view>
        </view>
        <text class="l-points" :class="l.points >= 0 ? 'plus' : 'minus'">{{ l.points >= 0 ? '+' : '' }}{{ l.points }}</text>
      </view>
      <view v-if="loading" class="tip">加载中...</view>
      <view v-else-if="finished && logs.length" class="tip">没有更多了</view>
    </view>
    <EmptyState v-else :icon="'⭐'" :text="'暂无积分记录'" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onReachBottom } from '@dcloudio/uni-app'
import EmptyState from '@/components/EmptyState.vue'
import { pointsApi } from '@/api'
import { requireLogin } from '@/store'

const balance = ref(0)
const logs = ref([])
const page = ref(1)
const finished = ref(false)
const loading = ref(false)

onShow(() => {
  if (!requireLogin()) return
  loadBalance()
  load(true)
})

async function loadBalance() {
  try {
    const data = await pointsApi.balance()
    balance.value = (data && data.balance) || 0
  } catch (e) {
    /* 忽略 */
  }
}

async function load(reset) {
  if (loading.value) return
  if (reset) {
    page.value = 1
    finished.value = false
    logs.value = []
  }
  if (finished.value) return
  loading.value = true
  try {
    const data = await pointsApi.logs({ page: page.value, pageSize: 20 })
    const arr = (data && data.list) || data || []
    logs.value = reset ? arr : logs.value.concat(arr)
    const total = data && data.total
    if (!arr.length || (total !== undefined && logs.value.length >= total)) finished.value = true
    else page.value += 1
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onReachBottom(() => load(false))
</script>

<style lang="scss" scoped>
.points-page {
  padding: 20rpx;
}
.balance-card {
  background: linear-gradient(135deg, #ffb347, #ff8c00);
  border-radius: 20rpx;
  color: #fff;
  padding: 48rpx 32rpx;
  text-align: center;
}
.b-label {
  font-size: 26rpx;
  opacity: 0.9;
}
.b-num {
  font-size: 72rpx;
  font-weight: 700;
  margin: 12rpx 0;
}
.b-tip {
  font-size: 22rpx;
  opacity: 0.85;
}
.log-list {
  padding: 8rpx 24rpx;
}
.log-item {
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}
.l-reason {
  font-size: 26rpx;
  color: #333;
}
.l-time {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}
.l-points {
  font-size: 30rpx;
  font-weight: 700;
}
.l-points.plus {
  color: #ff8c00;
}
.l-points.minus {
  color: #999;
}
.tip {
  text-align: center;
  color: #999;
  padding: 20rpx;
  font-size: 24rpx;
}
</style>
