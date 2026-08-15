<template>
  <view class="coupon-mine">
    <view class="tabs flex">
      <view
        v-for="tab in tabs"
        :key="tab.status"
        class="tab"
        :class="{ active: status === tab.status }"
        @click="switchTab(tab.status)"
      >
        {{ tab.label }}
      </view>
    </view>
    <view v-if="list.length" class="coupon-list">
      <view class="coupon card" v-for="c in list" :key="c.id" :class="status === 'expired' ? 'disabled' : ''">
        <view class="c-left">
          <view class="c-amount"><text class="c-symbol">{{ c.amountType === 'percent' ? '' : '¥' }}</text><text class="c-num">{{ c.amountType === 'percent' ? c.amount + '%' : yuan(c.amount) }}</text></view>
          <view class="c-condition" v-if="c.minAmount">{{ '满' + yuan(c.minAmount) + '可用' }}</view>
        </view>
        <view class="c-mid flex-1">
          <view class="c-name">{{ c.name || c.title || '优惠券' }}</view>
          <view class="c-date" v-if="c.endAt">{{ '有效期至 ' + c.endAt.slice(0, 10) }}</view>
        </view>
        <view class="c-status">{{ statusText(c) }}</view>
      </view>
      <view v-if="loading" class="tip">加载中...</view>
      <view v-else-if="finished && list.length" class="tip">没有更多了</view>
    </view>
    <EmptyState v-else :icon="'💳'" :text="'暂无优惠券'" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onReachBottom } from '@dcloudio/uni-app'
import EmptyState from '@/components/EmptyState.vue'
import { couponApi } from '@/api'
import { requireLogin } from '@/store'
import { fenToYuan } from '@/utils/format'

const tabs = [
  { label: '未使用', status: 'unused' },
  { label: '已使用', status: 'used' },
  { label: '已过期', status: 'expired' },
]
const status = ref('unused')
const list = ref([])
const page = ref(1)
const finished = ref(false)
const loading = ref(false)

function yuan(fen) {
  return fenToYuan(fen)
}

function statusText(c) {
  if (c.status === 'used') return '已使用'
  if (c.status === 'expired') return '已过期'
  return '未使用'
}

onShow(() => {
  if (requireLogin()) load(true)
})

function switchTab(s) {
  status.value = s
  load(true)
}

async function load(reset) {
  if (!requireLogin() || loading.value) return
  if (reset) {
    page.value = 1
    finished.value = false
    list.value = []
  }
  if (finished.value) return
  loading.value = true
  try {
    const data = await couponApi.mine({ status: status.value, page: page.value, pageSize: 20 })
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

onReachBottom(() => load(false))
</script>

<style lang="scss" scoped>
.coupon-mine {
  padding: 20rpx;
}
.tabs {
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
}
.tab.active {
  color: #ff4d4f;
  font-weight: 700;
  border-bottom: 4rpx solid #ff4d4f;
}
.coupon {
  display: flex;
  align-items: center;
  padding: 0;
  overflow: hidden;
}
.coupon.disabled {
  opacity: 0.55;
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
.c-date {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
.c-status {
  margin-right: 24rpx;
  color: #999;
  font-size: 24rpx;
}
.tip {
  text-align: center;
  color: #999;
  padding: 24rpx;
  font-size: 24rpx;
}
</style>
