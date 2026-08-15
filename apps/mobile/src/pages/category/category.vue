<template>
  <view class="category-page">
    <!-- 左侧一级分类 -->
    <scroll-view class="left" scroll-y>
      <view
        v-for="c in categories"
        :key="c.id"
        class="left-item"
        :class="{ active: currentTop && currentTop.id === c.id }"
        @click="selectTop(c)"
      >
        <text>{{ c.name }}</text>
      </view>
      <EmptyState v-if="!categories.length" icon="🗂️" text="暂无分类" />
    </scroll-view>

    <!-- 右侧：子分类 + 商品 -->
    <scroll-view class="right" scroll-y>
      <view v-if="currentTop && currentTop.children && currentTop.children.length" class="sub-chips">
        <view
          v-for="sub in currentTop.children"
          :key="sub.id"
          class="chip"
          :class="{ active: currentSub && currentSub.id === sub.id }"
          @click="selectSub(sub)"
        >
          {{ sub.name }}
        </view>
      </view>

      <view class="sort-bar" v-if="products.length">
        <view v-for="s in sorts" :key="s.key" class="sort-item" :class="{ active: sort === s.key }" @click="changeSort(s.key)">
          {{ s.label }}
        </view>
      </view>

      <view v-if="products.length" class="goods-grid">
        <ProductCard v-for="(p, i) in products" :key="p.id || i" :product="p" />
      </view>
      <EmptyState v-else icon="📦" text="该分类暂无商品" />
      <view v-if="loading" class="loading">加载中...</view>
      <view v-if="finished && products.length" class="loading">没有更多了</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import ProductCard from '@/components/ProductCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { productApi } from '@/api'

const categories = ref([])
const currentTop = ref(null)
const currentSub = ref(null)
const products = ref([])
const page = ref(1)
const finished = ref(false)
const loading = ref(false)
const sort = ref('default')

const sorts = [
  { key: 'default', label: '综合' },
  { key: 'sales', label: '销量' },
  { key: 'new', label: '新品' },
  { key: 'price_asc', label: '价格↑' },
  { key: 'price_desc', label: '价格↓' },
]

onLoad(async () => {
  try {
    const data = await productApi.categories()
    categories.value = data || []
    if (categories.value.length) {
      currentTop.value = categories.value[0]
      const children = currentTop.value.children || []
      currentSub.value = children.length ? children[0] : null
      loadProducts(true)
    }
  } catch (e) {
    uni.showToast({ title: '分类加载失败', icon: 'none' })
  }
})

const activeCategoryId = computed(() => {
  if (currentSub.value) return currentSub.value.id
  return currentTop.value ? currentTop.value.id : null
})

function selectTop(c) {
  currentTop.value = c
  const children = c.children || []
  currentSub.value = children.length ? children[0] : null
  loadProducts(true)
}

function selectSub(s) {
  currentSub.value = s
  loadProducts(true)
}

function changeSort(key) {
  sort.value = key
  loadProducts(true)
}

async function loadProducts(reset) {
  if (loading.value) return
  if (reset) {
    page.value = 1
    finished.value = false
    products.value = []
  }
  if (finished.value || !activeCategoryId.value) return
  loading.value = true
  try {
    const data = await productApi.list({ categoryId: activeCategoryId.value, sort: sort.value, page: page.value, pageSize: 20 })
    const list = (data && data.list) || []
    products.value = reset ? list : products.value.concat(list)
    if (!list.length || (data && data.total !== undefined && products.value.length >= data.total)) finished.value = true
    else page.value += 1
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onReachBottom(() => loadProducts(false))
onPullDownRefresh(() => loadProducts(true).finally(() => uni.stopPullDownRefresh()))
</script>

<style lang="scss" scoped>
.category-page {
  display: flex;
  height: 100vh;
}
.left {
  width: 180rpx;
  height: 100%;
  background: #f7f8fa;
}
.left-item {
  padding: 30rpx 20rpx;
  font-size: 26rpx;
  color: #333;
  text-align: center;
  border-left: 6rpx solid transparent;
}
.left-item.active {
  background: #fff;
  color: #ff4d4f;
  font-weight: 600;
  border-left-color: #ff4d4f;
}
.right {
  flex: 1;
  height: 100%;
  background: #fff;
  padding: 20rpx;
  box-sizing: border-box;
}
.sub-chips {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 16rpx;
}
.chip {
  padding: 10rpx 24rpx;
  border-radius: 32rpx;
  background: #f5f6f8;
  font-size: 24rpx;
  color: #333;
  margin: 0 12rpx 12rpx 0;
}
.chip.active {
  background: #ffecec;
  color: #ff4d4f;
}
.sort-bar {
  display: flex;
  padding: 8rpx 0 16rpx;
}
.sort-item {
  margin-right: 30rpx;
  font-size: 26rpx;
  color: #666;
}
.sort-item.active {
  color: #ff4d4f;
  font-weight: 600;
}
.goods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.loading {
  text-align: center;
  color: #999;
  padding: 24rpx;
  font-size: 24rpx;
}
</style>
