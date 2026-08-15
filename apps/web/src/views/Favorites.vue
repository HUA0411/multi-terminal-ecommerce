<template>
  <div class="favorites page-container">
    <div class="page-panel">
      <div class="section-title"><span class="bar"></span><h3>我的收藏（{{ total }}）</h3></div>
      <el-skeleton v-if="loading" :rows="4" animated />
      <div v-else-if="list.length" class="goods-grid">
        <ProductCard v-for="f in list" :key="f.id" :product="f.product" />
      </div>
      <el-empty v-else description="暂无收藏，去逛逛吧" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import ProductCard from "../components/ProductCard.vue"
import { favoriteApi } from "../api"
import { auth } from "../stores/auth"

const list = ref([])
const total = ref(0)
const loading = ref(true)

onMounted(async () => {
  if (!auth.isLogin) return
  try {
    const d = await favoriteApi.list()
    list.value = (d || []).filter((f) => f.product)
    total.value = list.value.length
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.goods-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
</style>
