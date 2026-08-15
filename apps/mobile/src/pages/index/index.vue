<template>
  <view class="home">
    <!-- 搜索栏 -->
    <view class="search-bar" @click="goSearch">
      <text class="search-icon">🔍</text>
      <text class="search-placeholder">搜索商品</text>
    </view>

    <!-- 功能入口 -->
    <view class="entry-row">
      <view class="entry" v-for="e in entries" :key="e.title" @click="goEntry(e)">
        <view class="entry-icon" :style="{ background: e.bg }">{{ e.icon }}</view>
        <text class="entry-title">{{ e.title }}</text>
      </view>
    </view>

    <!-- CMS 首页装修 -->
    <CmsBlocks v-if="blocks.length" :blocks="blocks" />

    <!-- 推荐商品 -->
    <view class="recommend">
      <view class="section-title">为你推荐</view>
      <view v-if="recs.length" class="goods-grid">
        <ProductCard v-for="(p, i) in recs" :key="p.id || i" :product="p" />
      </view>
      <EmptyState v-else icon="🛍️" text="暂无推荐商品" />
      <view v-if="recLoading && !recs.length" class="loading">加载中...</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import CmsBlocks from '@/components/CmsBlocks.vue'
import ProductCard from '@/components/ProductCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { cmsApi, recApi, settingsApi } from '@/api'
import { store } from '@/store'

const blocks = ref([])
const recs = ref([])
const recLoading = ref(false)

const entries = ref([
  { title: '限时秒杀', icon: '⚡', bg: '#fff0f0', url: '/pages/flashsale/index' },
  { title: '直播带货', icon: '📺', bg: '#f0f0ff', url: '/pages/live/list' },
  { title: '优惠券', icon: '🎟️', bg: '#fff7e6', url: '/pages/coupon/center' },
  { title: '虚拟试衣', icon: '👗', bg: '#f0fff4', url: '/pages/fitting/index?productId=' },
])

onShow(() => {
  loadCms()
  loadRecs()
  loadSettings()
})

async function loadCms() {
  try {
    const data = await cmsApi.page('home')
    blocks.value = (data && data.blocks) || []
  } catch (e) {
    console.warn('cms page load failed', e.message)
  }
}

async function loadRecs() {
  if (recLoading.value) return
  recLoading.value = true
  try {
    const data = await recApi.list({ scene: 'home', limit: 10 })
    recs.value = (data && (data.list || data)) || []
    if (recs.value.length && !Array.isArray(recs.value)) recs.value = [recs.value]
  } catch (e) {
    console.warn('recommend load failed', e.message)
  } finally {
    recLoading.value = false
  }
}

async function loadSettings() {
  if (store.settings) return
  try {
    store.settings = await settingsApi.public()
  } catch (e) {
    /* 忽略 */
  }
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' })
}

function goEntry(e) {
  if (e.url === '/pages/fitting/index?productId=') {
    uni.navigateTo({ url: '/pages/fitting/index' })
    return
  }
  uni.navigateTo({ url: e.url })
}

onPullDownRefresh(() => {
  Promise.all([loadCms(), loadRecs()]).finally(() => uni.stopPullDownRefresh())
})
</script>

<style lang="scss" scoped>
.home {
  padding: 20rpx;
}
.search-bar {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 44rpx;
  padding: 16rpx 28rpx;
  margin-bottom: 20rpx;
}
.search-icon {
  margin-right: 12rpx;
}
.search-placeholder {
  color: #999;
  font-size: 28rpx;
}
.entry-row {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 0;
  margin-bottom: 20rpx;
}
.entry {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.entry-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  margin-bottom: 8rpx;
}
.entry-title {
  font-size: 24rpx;
  color: #333;
}
.goods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.loading {
  text-align: center;
  color: #999;
  padding: 30rpx;
}
</style>
