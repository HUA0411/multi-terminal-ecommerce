<template>
  <div class="goods-block page-panel">
    <div class="section-title">
      <span class="bar"></span>
      <h3>{{ props.title || '精选好物' }}</h3>
    </div>
    <el-skeleton v-if="loading" :rows="4" animated />
    <div v-else class="goods-grid">
      <ProductCard v-for="p in products" :key="p.id" :product="p" />
    </div>
    <div v-if="!loading && !products.length" class="empty-tip">暂无商品数据</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ProductCard from '../ProductCard.vue'
import { productApi, recommendApi } from '../../api'

const props = defineProps({
  props: { type: Object, default: () => ({}) },
})

const products = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const p = props.props || {}
    let list = []
    if (p.goodsIds && String(p.goodsIds).trim()) {
      const ids = String(p.goodsIds).split(/[,，]/).map((s) => s.trim()).filter(Boolean).slice(0, 12)
      const results = await Promise.allSettled(ids.map((id) => productApi.detail(id, { silent: true })))
      list = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
    } else if (p.categoryId) {
      const data = await productApi.list({ categoryId: p.categoryId, page: 1, pageSize: p.count || 8 })
      list = data.list || []
    } else {
      const data = await recommendApi.get({ scene: 'home', limit: p.count || 8 })
      list = Array.isArray(data) ? data : data.list || []
    }
    products.value = list
  } catch {
    products.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.goods-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
</style>
