<template>
  <view class="track-page">
    <view class="card carrier" v-if="info.carrier || info.trackingNo">
      <view class="c-line"><text class="c-label">承运商</text>{{ info.carrier || '-' }}</view>
      <view class="c-line"><text class="c-label">运单号</text>{{ info.trackingNo || '-' }}</view>
    </view>

    <view class="card" v-if="events.length">
      <view class="t-item" v-for="(ev, i) in events" :key="i" :class="{ first: i === 0 }">
        <view class="t-dot"></view>
        <view class="flex-1">
          <view class="t-text">{{ ev.text }}</view>
          <view class="t-time">{{ ev.time }}</view>
        </view>
      </view>
    </view>
    <EmptyState v-else :icon="'🚚'" :text="'暂无物流信息'" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import EmptyState from '@/components/EmptyState.vue'
import { orderApi } from '@/api'
import { requireLogin } from '@/store'

const info = ref({})
const events = ref([])

onLoad(async (options) => {
  if (!requireLogin()) return
  try {
    const data = await orderApi.track(options.id)
    info.value = data || {}
    events.value = (data && data.events) || []
  } catch (e) {
    // 部分订单无物流数据，兼容
    events.value = []
    console.warn('track load failed', e.message)
  }
})
</script>

<style lang="scss" scoped>
.track-page {
  padding: 20rpx;
}
.carrier {
  display: flex;
  flex-direction: column;
}
.c-line {
  padding: 10rpx 0;
  font-size: 28rpx;
}
.c-label {
  color: #999;
  margin-right: 20rpx;
}
.t-item {
  display: flex;
  position: relative;
  padding-bottom: 40rpx;
}
.t-item:last-child {
  padding-bottom: 0;
}
.t-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #ddd;
  margin: 10rpx 24rpx 0 4rpx;
  flex-shrink: 0;
}
.t-item.first .t-dot {
  background: #07c160;
}
.t-text {
  font-size: 28rpx;
  color: #333;
}
.t-time {
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
}
</style>
