<template>
  <view class="share-page">
    <view v-if="loading" class="tip">加载中...</view>
    <template v-else-if="share">
      <view class="share-card card">
        <view class="share-user flex">
          <image class="share-avatar" :src="share.user?.avatar || 'https://picsum.photos/seed/u/80/80'" mode="aspectFill" />
          <view class="share-name">{{ share.user?.nickname || "好友" }}</view>
          <view class="share-tag">邀请你一起逛</view>
        </view>
        <view v-if="share.product" class="share-product" @click="goProduct">
          <image class="sp-img" :src="share.product.mainImage" mode="aspectFill" />
          <view class="sp-info flex-1">
            <view class="sp-name">{{ share.product.name }}</view>
            <view class="sp-price">¥{{ yuan(share.product.price) }}<text v-if="share.product.originalPrice" class="sp-origin">¥{{ yuan(share.product.originalPrice) }}</text></view>
          </view>
          <view class="sp-btn">去看看</view>
        </view>
        <view v-else class="share-empty">该分享内容暂不可用</view>
      </view>
      <view class="share-footer">来自好友的分享 · 多端商城</view>
    </template>
    <EmptyState v-else :icon="'\u{1F4CE}'" :text="'分享链接无效'" />
  </view>
</template>

<script setup>
import { ref } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import EmptyState from "@/components/EmptyState.vue"
import { shareApi } from "@/api"
import { fenToYuan } from "@/utils/format"

const share = ref(null)
const loading = ref(true)

function yuan(fen) { return fenToYuan(fen) }

onLoad((query) => {
  const code = query.code
  if (!code) { loading.value = false; return }
  loadShare(code)
})

async function loadShare(code) {
  loading.value = true
  try {
    const data = await shareApi.get(code)
    share.value = data
  } catch (e) {
    uni.showToast({ title: e.message || "分享链接无效", icon: "none" })
  } finally { loading.value = false }
}

function goProduct() {
  if (share.value && share.value.product) {
    uni.navigateTo({ url: "/pages/product/detail?id=" + share.value.product.id })
  }
}
</script>

<style lang="scss" scoped>
.share-page { padding: 40rpx 30rpx; }
.share-card { padding: 32rpx; }
.share-user { align-items: center; margin-bottom: 30rpx; }
.share-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; margin-right: 20rpx; background: #f0f0f0; }
.share-name { font-size: 30rpx; font-weight: 700; color: #333; }
.share-tag { font-size: 22rpx; color: #fff; background: #ff4d4f; border-radius: 8rpx; padding: 4rpx 14rpx; margin-left: 16rpx; }
.share-product { display: flex; align-items: center; background: #fafafa; border-radius: 16rpx; padding: 20rpx; }
.sp-img { width: 140rpx; height: 140rpx; border-radius: 12rpx; margin-right: 20rpx; background: #eee; }
.sp-info { min-width: 0; }
.sp-name { font-size: 28rpx; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sp-price { font-size: 32rpx; color: #ff4d4f; font-weight: 700; margin-top: 10rpx; }
.sp-origin { font-size: 24rpx; color: #aaa; font-weight: 400; text-decoration: line-through; margin-left: 12rpx; }
.sp-btn { font-size: 26rpx; color: #fff; background: #ff4d4f; border-radius: 30rpx; padding: 12rpx 28rpx; margin-left: 16rpx; }
.share-empty { text-align: center; color: #999; padding: 30rpx 0; }
.share-footer { text-align: center; color: #aaa; font-size: 24rpx; margin-top: 40rpx; }
.tip { text-align: center; color: #aaa; font-size: 24rpx; padding: 40rpx 0; }
</style>
