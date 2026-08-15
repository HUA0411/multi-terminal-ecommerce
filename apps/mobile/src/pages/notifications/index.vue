<template>
  <view class="notif-page">
    <view v-if="list.length" class="card-list">
      <view class="card notif-item" v-for="n in list" :key="n.id" @click="mark(n)">
        <view class="flex">
          <text class="n-title" :class="{ unread: !n.read }">{{ n.title }}</text>
          <text v-if="!n.read" class="n-dot">●</text>
        </view>
        <view class="n-body">{{ n.body }}</view>
        <view class="n-time">{{ (n.createdAt || "").slice(0, 16).replace("T", " ") }}</view>
      </view>
      <view v-if="finished" class="tip">没有更多了</view>
    </view>
    <EmptyState v-else :icon="'\u{1F514}'" :text="'暂无通知'" />
  </view>
</template>

<script setup>
import { ref } from "vue"
import { onShow, onReachBottom } from "@dcloudio/uni-app"
import EmptyState from "@/components/EmptyState.vue"
import { notificationApi } from "@/api"
import { requireLogin } from "@/store"

const list = ref([])
const page = ref(1)
const finished = ref(false)

onShow(() => { if (requireLogin()) load(true) })

async function load(reset) {
  if (reset) { page.value = 1; finished.value = false; list.value = [] }
  try {
    const data = await notificationApi.list({ page: page.value, pageSize: 20 })
    const arr = (data && data.list) || []
    list.value = reset ? arr : list.value.concat(arr)
    if (!arr.length) finished.value = true
    else page.value += 1
  } catch (e) {
    uni.showToast({ title: e.message || "加载失败", icon: "none" })
  }
}

async function mark(n) {
  if (n.read) return
  try {
    await notificationApi.markRead(n.id)
    n.read = true
  } catch (e) { /* 忽略 */ }
}

onReachBottom(() => load(false))
</script>

<style lang="scss" scoped>
.notif-page { padding: 20rpx; }
.notif-item { margin-bottom: 16rpx; padding: 24rpx; }
.n-title { font-size: 28rpx; font-weight: 600; color: #333; }
.n-title.unread { color: #ff4d4f; }
.n-dot { color: #ff4d4f; font-size: 20rpx; margin-left: 12rpx; }
.n-body { font-size: 26rpx; color: #666; margin-top: 8rpx; line-height: 1.6; }
.n-time { font-size: 22rpx; color: #aaa; margin-top: 10rpx; }
.tip { text-align: center; color: #aaa; font-size: 24rpx; padding: 24rpx 0; }
</style>
