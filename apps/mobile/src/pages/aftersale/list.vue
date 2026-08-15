<template>
  <view class="aftersale-page">
    <view v-if="list.length" class="as-list">
      <view class="as-card card" v-for="a in list" :key="a.id">
        <view class="as-head flex">
          <text class="as-no">{{ a.orderNo || ("单号 #" + a.orderId) }}</text>
          <text class="as-status" :class="a.status">{{ a.statusText }}</text>
        </view>
        <view class="as-row">类型：{{ a.type === "return_refund" ? "退货退款" : "仅退款" }}</view>
        <view class="as-row">金额：<text class="as-amount">¥{{ yuan(a.amount) }}</text></view>
        <view class="as-row">原因：{{ a.reason }}</view>
        <view class="as-row" v-if="a.merchantNote">商家备注：{{ a.merchantNote }}</view>
        <view class="as-foot flex">
          <text class="as-time">{{ (a.createdAt || "").slice(0, 16).replace("T", " ") }}</text>
          <view v-if="a.status === 'pending'" class="as-cancel" @click="cancelAs(a.id)">取消申请</view>
        </view>
      </view>
      <view v-if="loading" class="tip">加载中...</view>
      <view v-else-if="finished && list.length" class="tip">没有更多了</view>
    </view>
    <EmptyState v-else :icon="'\u{1F3AB}'" :text="'暂无售后记录'" />
  </view>
</template>

<script setup>
import { ref } from "vue"
import { onShow, onReachBottom } from "@dcloudio/uni-app"
import EmptyState from "@/components/EmptyState.vue"
import { aftersaleApi } from "@/api"
import { requireLogin } from "@/store"
import { fenToYuan } from "@/utils/format"

const list = ref([])
const page = ref(1)
const finished = ref(false)
const loading = ref(false)

function yuan(fen) { return fenToYuan(fen) }

onShow(() => { if (requireLogin()) load(true) })

async function load(reset) {
  if (!requireLogin() || loading.value) return
  if (reset) { page.value = 1; finished.value = false; list.value = [] }
  if (finished.value) return
  loading.value = true
  try {
    const data = await aftersaleApi.list({ page: page.value, pageSize: 20 })
    const arr = (data && data.list) || data || []
    list.value = reset ? arr : list.value.concat(arr)
    if (!arr.length) finished.value = true
    else page.value += 1
  } catch (e) {
    uni.showToast({ title: e.message || "加载失败", icon: "none" })
  } finally { loading.value = false }
}

async function cancelAs(id) {
  try {
    await aftersaleApi.cancel(id)
    uni.showToast({ title: "已取消申请", icon: "success" })
    load(true)
  } catch (e) {
    uni.showToast({ title: e.message || "取消失败", icon: "none" })
  }
}

onReachBottom(() => load(false))
</script>

<style lang="scss" scoped>
.aftersale-page { padding: 20rpx; }
.as-card { margin-bottom: 20rpx; padding: 24rpx; }
.as-head { justify-content: space-between; margin-bottom: 12rpx; }
.as-no { font-size: 26rpx; color: #333; font-weight: 600; }
.as-status { font-size: 24rpx; }
.as-status.pending { color: #e6a23c; }
.as-status.refunded { color: #67c23a; }
.as-status.rejected, .as-status.cancelled { color: #999; }
.as-row { font-size: 26rpx; color: #666; line-height: 1.8; }
.as-amount { color: #ff4d4f; font-weight: 700; }
.as-foot { justify-content: space-between; margin-top: 16rpx; }
.as-time { font-size: 22rpx; color: #aaa; }
.as-cancel { font-size: 24rpx; color: #e6a23c; border: 1rpx solid #e6a23c; border-radius: 8rpx; padding: 6rpx 20rpx; }
.tip { text-align: center; color: #aaa; font-size: 24rpx; padding: 30rpx 0; }
</style>
