<template>
  <div class="product-list page-container">
    <div class="filter-bar">
      <div class="filter-row">
        <span class="f-label">关键词：</span>
        <el-input v-model="filters.keyword" placeholder="输入商品名称" clearable style="width:220px" @keyup.enter="onSearch" @clear="onSearch" />
        <el-button type="danger" @click="onSearch">搜索</el-button>
      </div>
      <div class="filter-row">
        <span class="f-label">分类：</span>
        <el-tree-select
          v-model="filters.categoryId"
          :data="categoryTree"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          node-key="id"
          check-strictly
          clearable
          placeholder="全部分类"
          style="width:220px"
          @change="onSearch"
        />
        <span class="f-label" style="margin-left:16px">价格区间：</span>
        <el-input-number v-model="priceMin" :min="0" :precision="2" :controls="false" placeholder="最低价" style="width:110px" />
        <span class="f-sep">-</span>
        <el-input-number v-model="priceMax" :min="0" :precision="2" :controls="false" placeholder="最高价" style="width:110px" />
        <el-button style="margin-left:8px" @click="onSearch">确定</el-button>
      </div>
      <div class="filter-row">
        <span class="f-label">排序：</span>
        <el-radio-group v-model="filters.sort" @change="onSearch">
          <el-radio-button value="default">综合</el-radio-button>
          <el-radio-button value="sales">销量</el-radio-button>
          <el-radio-button value="price_asc">价格↑</el-radio-button>
          <el-radio-button value="price_desc">价格↓</el-radio-button>
          <el-radio-button value="new">上新</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <template v-else>
      <div v-if="products.length" class="goods-grid">
        <ProductCard v-for="p in products" :key="p.id" :product="p" />
      </div>
      <div v-else class="empty-tip page-panel">未找到相关商品，换个关键词试试吧</div>
    </template>

    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[12, 24, 48]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="load"
        @size-change="onSearch"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductCard from '../components/ProductCard.vue'
import { productApi } from '../api'
import { settings } from '../stores/settings'

const route = useRoute()
const router = useRouter()

const products = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(12)
const loading = ref(false)
const categoryTree = ref([])
const priceMin = ref(null)
const priceMax = ref(null)

const filters = reactive({
  keyword: route.query.keyword || '',
  categoryId: route.query.categoryId ? Number(route.query.categoryId) : null,
  sort: route.query.sort || 'default',
})

watch(
  () => route.query,
  (q) => {
    filters.keyword = q.keyword || ''
    filters.categoryId = q.categoryId ? Number(q.categoryId) : null
  }
)

async function load() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      sort: filters.sort,
      currency: settings.currency || settings.defaultCurrency,
    }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.categoryId) params.categoryId = filters.categoryId
    if (priceMin.value != null && priceMin.value > 0) params.minPrice = Math.round(priceMin.value * 100)
    if (priceMax.value != null && priceMax.value > 0) params.maxPrice = Math.round(priceMax.value * 100)
    const data = await productApi.list(params)
    products.value = data.list || []
    total.value = data.total || 0
  } catch {
    products.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  router.replace({
    path: '/products',
    query: {
      ...(filters.keyword ? { keyword: filters.keyword } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.sort && filters.sort !== 'default' ? { sort: filters.sort } : {}),
    },
  })
  load()
}

onMounted(async () => {
  try {
    categoryTree.value = await productApi.categories()
  } catch {
    categoryTree.value = []
  }
  load()
})
</script>

<style scoped>
.filter-bar {
  background: #fff;
  border-radius: 6px;
  padding: 14px 16px;
  margin: 14px 0;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.f-label {
  color: #666;
  font-size: 13px;
  flex-shrink: 0;
}

.f-sep {
  color: #999;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.pager {
  display: flex;
  justify-content: center;
  padding: 10px 0 20px;
}
</style>
