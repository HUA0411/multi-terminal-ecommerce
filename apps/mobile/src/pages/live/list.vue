<template>
  <view class="live-list">
    <view v-if="rooms.length" class="room-list">
      <view class="card room" v-for="r in rooms" :key="r.id" @click="enter(r)">
        <view class="cover-wrap">
          <image class="cover" :src="r.cover || '/static/placeholder.png'" mode="aspectFill" />
          <view class="live-badge">LIVE</view>
          <view class="viewer">{{ r.viewerCount || 0 }} 人在看</view>
        </view>
        <view class="room-info">
          <view class="r-title text-ellipsis">{{ r.title }}</view>
          <view class="r-meta flex">
            <text class="flex-1">{{ r.merchantName || '官方直播间' }}</text>
            <text class="r-like">👍 {{ r.likeCount || 0 }}</text>
          </view>
        </view>
      </view>
    </view>
    <EmptyState v-else :icon="'📺'" :text="'暂无直播'" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import EmptyState from '@/components/EmptyState.vue'
import { liveApi } from '@/api'

const rooms = ref([])

onShow(async () => {
  try {
    rooms.value = await liveApi.rooms({ status: 'live' })
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
})

function enter(r) {
  uni.navigateTo({ url: '/pages/live/room?id=' + r.id })
}
</script>

<style lang="scss" scoped>
.live-list {
  padding: 20rpx;
}
.room {
  padding: 0;
  overflow: hidden;
}
.cover-wrap {
  position: relative;
  height: 380rpx;
}
.cover {
  width: 100%;
  height: 380rpx;
  display: block;
}
.live-badge {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  background: #ff4d4f;
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}
.viewer {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 14rpx;
  border-radius: 24rpx;
}
.room-info {
  padding: 20rpx 24rpx;
}
.r-title {
  font-size: 30rpx;
  font-weight: 600;
}
.r-meta {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #999;
}
</style>
