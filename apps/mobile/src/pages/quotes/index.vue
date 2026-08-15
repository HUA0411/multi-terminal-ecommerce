<template>
  <view class="quotes-page">
    <view v-if="list.length" class="q-list">
      <view class="card q-item" v-for="q in list" :key="q.id">
        <view class="flex"><text class="q-no">{{ q.rfqNo }}</text><text class="q-status" :class="q.status">{{ q.statusText }}</text></view>
        <view class="q-row">商品：{{ q.productName }}</view>
        <view class="q-row">数量：{{ q.quantity }} 件</view>
        <view class="q-row" v-if="q.targetPrice">目标价：¥{{ yuan(q.targetPrice) }}</view>
        <view class="q-row" v-if="q.quotePrice">商家报价：<text class="q-price">¥{{ yuan(q.quotePrice) }}</text></view>
        <view class="q-row" v-if="q.quoteNote">商家备注：{{ q.quoteNote }}</view>
        <view class="q-foot flex">
          <text class="q-time">{{ (q.createdAt || "").slice(0, 16).replace("T", " ") }}</text>
          <view v-if="q.status === 'quoted'" class="q-btn" @click="accept(q.id)">接受报价</view>
        </view>
      </view>
    </view>
    <EmptyState v-else :icon="'\u{1F4B0}'" :text="'暂无询价单，可在商品详情发起询价'" />
  </view>
</template>

<script setup>
import { ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import EmptyState from "@/components/EmptyState.vue"
import { quoteApi } from "@/api"
import { requireLogin } from "@/store"
import { fenToYuan } from "@/utils/format"

const list = ref([])
function yuan(f) { return fenToYuan(f) }

onShow(() => { if (requireLogin()) load() })

async function load() {
  try {
    const data = await quoteApi.mine()
    list.value = (data && data.list) || []
  } catch (e) {
    uni.showToast({ title: e.message || "加载失败", icon: "none" })
  }
}

async function accept(id) {
  try {
    await quoteApi.accept(id)
    uni.showToast({ title: "已接受报价", icon: "success" })
    load()
  } catch (e) { uni.showToast({ title: e.message || "操作失败", icon: "none" }) }
}
</script>

<style lang="scss" scoped>
.quotes-page { padding: 20rpx; }
.q-item { padding: 24rpx; margin-bottom: 16rpx; }
.q-no { font-size: 26rpx; font-weight: 600; color: #333; }
.q-status { font-size: 24rpx; margin-left: 16rpx; }
.q-status.pending { color: #e6a23c; }
.q-status.quoted { color: #409eff; }
.q-status.accepted { color: #67c23a; }
.q-row { font-size: 26rpx; color: #666; margin-top: 10rpx; }
.q-price { color: #ff4d4f; font-weight: 700; }
.q-foot { justify-content: space-between; margin-top: 14rpx; }
.q-time { font-size: 22rpx; color: #aaa; }
.q-btn { background: #ff4d4f; color: #fff; font-size: 24rpx; padding: 12rpx 30rpx; border-radius: 32rpx; }
</style>
