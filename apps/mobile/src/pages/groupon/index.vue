<template>
  <view class="gp-page">
    <view v-if="list.length" class="gp-list">
      <view class="card gp-item" v-for="g in list" :key="g.id">
        <view class="flex">
          <image class="gp-img" :src="g.productImage || '/static/placeholder.png'" mode="aspectFill" />
          <view class="flex-1 gp-info">
            <view class="gp-name">{{ g.productName }}</view>
            <view class="gp-price">拼团价 ¥{{ yuan(g.groupPrice) }}<text class="gp-origin">¥{{ yuan(g.originalPrice) }}</text></view>
            <view class="gp-progress">已参 {{ g.currentSize }}/{{ g.targetSize }} 人 · 团长 {{ g.leaderName }}</view>
          </view>
        </view>
        <view class="gp-btn" :class="{ disabled: g.currentSize >= g.targetSize }" @click="join(g)">{{ g.currentSize >= g.targetSize ? "已满员" : "去参团" }}</view>
      </view>
    </view>
    <EmptyState v-else :icon="'\u{1F465}'" :text="'暂无进行中的拼团，去商品详情开团'" />
  </view>
</template>

<script setup>
import { ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import EmptyState from "@/components/EmptyState.vue"
import { grouponApi } from "@/api"
import { requireLogin } from "@/store"
import { fenToYuan } from "@/utils/format"

const list = ref([])
function yuan(f) { return fenToYuan(f) }

onShow(() => load())

async function load() {
  try {
    const d = await grouponApi.list({ status: "open" })
    list.value = (d && d.list) || []
  } catch (e) {
    uni.showToast({ title: e.message || "加载失败", icon: "none" })
  }
}

async function join(g) {
  if (!requireLogin()) return
  try {
    await grouponApi.join(g.id)
    uni.showToast({ title: "参团成功！生成拼团价订单", icon: "success" })
    load()
  } catch (e) { uni.showToast({ title: e.message || "参团失败", icon: "none" }) }
}
</script>

<style lang="scss" scoped>
.gp-page { padding: 20rpx; }
.gp-item { padding: 24rpx; margin-bottom: 16rpx; position: relative; }
.gp-img { width: 120rpx; height: 120rpx; border-radius: 12rpx; margin-right: 20rpx; background: #f2f3f5; }
.gp-info { min-width: 0; }
.gp-name { font-size: 28rpx; color: #333; }
.gp-price { font-size: 28rpx; color: #ff4d4f; font-weight: 700; margin-top: 8rpx; }
.gp-origin { font-size: 22rpx; color: #aaa; text-decoration: line-through; font-weight: 400; margin-left: 12rpx; }
.gp-progress { font-size: 24rpx; color: #e6a23c; margin-top: 8rpx; }
.gp-btn { position: absolute; right: 24rpx; bottom: 24rpx; background: #ff4d4f; color: #fff; font-size: 24rpx; padding: 12rpx 28rpx; border-radius: 32rpx; }
.gp-btn.disabled { background: #ddd; color: #999; }
</style>
