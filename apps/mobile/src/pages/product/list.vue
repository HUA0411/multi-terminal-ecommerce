<template>
  <view class="list-page">
    <view class="filter-bar">
      <view
        v-for="s in sorts"
        :key="s.key"
        class="f-item"
        :class="{ active: sort === s.key }"
        @click="changeSort(s.key)"
      >
        {{ s.label }}
        <text v-if="s.key === 'price'" class="arrow">{{ sort === 'price_asc' ? '↑' : sort === 'price_desc' ? '↓' : '' }}</text>
      </view>
    </view>

    <view v-if="products.length" class="goods-grid">
      <ProductCard v-for="(p, i) in products" :key="p.id || i" :product="p" />
    </view>
    <EmptyState v-else :icon="'🔍'" :text="'没有找到相关商品'" />

    <view v-if="loading" class="tip">加载中...</view>
    <view v-else-if="finished && products.length" class="tip">没有更多了</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import ProductCard from '@/components/ProductCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { productApi } from '@/api'

const keyword = ref('')
const categoryId = ref('')
const sort = ref('default')
const products = ref([])
const page = ref(1)
const finished = ref(false)
const loading = ref(false)

const sorts = [
  { key: 'default', label: '综合' },
  { key: 'sales', label: '销量' },
  { key: 'new', label: '新品' },
  { key: 'price', label: '价格' },
]

onLoad((options) => {
  keyword.value = options.keyword ? decodeURIComponent(options.keyword) : ''
  categoryId.value = options.categoryId || ''
  if (options.sort) sort.value = options.sort
  if (options.title) uni.setNavigationBarTitle({ title: decodeURIComponent(options.title) })
  load(true)
})

async function load(reset) {
  if (loading.value) return
  if (reset) {
    page.value = 1
    finished.value = false
    products.value = []
  }
  if (finished.value) return
  loading.value = true
  try {
    const params = { page: page.value, pageSize: 20, sort: sort.value }
    if (keyword.value) params.keyword = keyword.value
    if (categoryId.value) params.categoryId = categoryId.value
    const data = await productApi.list(params)
    const list = (data && data.list) || []
    products.value = reset ? list : products.value.concat(list)
    const total = data && data.total
    if (!list.length || (total !== undefined && products.value.length >= total)) finished.value = true
    else page.value += 1
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function changeSort(key) {
  // 价格点击切换升降序
  if (key === 'price') {
    sort.value = sort.value === 'price_asc' ? 'price_desc' : 'price_asc'
  } else {
    sort.value = key
  }
  load(true)
}

onReachBottom(() => load(false))
onPullDownRefresh(() => load(true).finally(() => uni.stopPullDownRefresh()))
</script>

<style lang="scss" scoped>
.list-page {
  padding: 20rpx;
}
.filter-bar {
  display: flex;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.f-item {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #666;
}
.f-item.active {
  color: #ff4d4f;
  font-weight: 600;
}
.arrow {
  font-size: 22rpx;
}
.goods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.tip {
  text-align: center;
  color: #999;
  padding: 24rpx;
  font-size: 24rpx;
}
</style>