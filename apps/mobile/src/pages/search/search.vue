<template>
  <view class="search-page">
    <view class="search-box flex">
      <input
        class="input flex-1"
        v-model="keyword"
        placeholder="搜索商品"
        confirm-type="search"
        focus
        @confirm="doSearch"
        @input="onInput"
      />
      <view class="btn" @click="doSearch">搜索</view>
    </view>

    <!-- 搜索建议 -->
    <view v-if="suggestions.length" class="suggest card">
      <view class="s-item flex" v-for="(s, i) in suggestions" :key="i" @click="pick(s)">
        <text class="s-icon">🔍</text>
        <text class="s-text flex-1">{{ s }}</text>
      </view>
    </view>

    <view v-else>
      <view v-if="history.length" class="card">
        <view class="h-title flex">
          <text class="flex-1">搜索历史</text>
          <text @click="clearHistory">清空</text>
        </view>
        <view class="h-tags">
          <view class="h-tag" v-for="(h, i) in history" :key="i" @click="pick(h)">{{ h }}</view>
        </view>
      </view>
      <EmptyState icon="🔍" text="输入关键词搜索商品" />
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import { productApi } from '@/api'

const HISTORY_KEY = 'search_history'
const keyword = ref('')
const suggestions = ref([])
const history = ref(uni.getStorageSync(HISTORY_KEY) || [])
let timer = null

function onInput(e) {
  keyword.value = e.detail.value
  clearTimeout(timer)
  if (!keyword.value.trim()) {
    suggestions.value = []
    return
  }
  timer = setTimeout(async () => {
    try {
      const data = await productApi.suggest(keyword.value.trim())
      suggestions.value = (data && data.keywords) || []
    } catch (err) {
      suggestions.value = []
    }
  }, 300)
}

function doSearch() {
  pick(keyword.value)
}

function pick(kw) {
  const k = (kw || '').trim()
  if (!k) return
  const list = [k].concat(history.value.filter((h) => h !== k)).slice(0, 10)
  uni.setStorageSync(HISTORY_KEY, list)
  history.value = list
  uni.navigateTo({ url: '/pages/product/list?keyword=' + encodeURIComponent(k) })
}

function clearHistory() {
  uni.removeStorageSync(HISTORY_KEY)
  history.value = []
}
</script>

<style lang="scss" scoped>
.search-page {
  padding: 20rpx;
}
.search-box {
  background: #fff;
  border-radius: 44rpx;
  padding: 12rpx 24rpx;
  margin-bottom: 20rpx;
}
.input {
  font-size: 28rpx;
}
.btn {
  color: #ff4d4f;
  font-size: 28rpx;
  padding-left: 20rpx;
}
.suggest {
  padding: 8rpx 24rpx;
}
.s-item {
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}
.s-icon {
  margin-right: 16rpx;
}
.s-text {
  color: #333;
}
.h-title {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}
.h-tags {
  display: flex;
  flex-wrap: wrap;
}
.h-tag {
  background: #f5f6f8;
  border-radius: 32rpx;
  padding: 10rpx 28rpx;
  font-size: 24rpx;
  color: #333;
  margin: 0 16rpx 16rpx 0;
}
</style>
