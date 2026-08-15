<template>
  <div class="home">
    <div class="page-container">
      <el-skeleton v-if="loading" :rows="6" animated style="margin-top:16px" />
      <template v-else>
        <CmsRenderer v-if="blocks.length" :blocks="blocks" />
        <!-- CMS 不可用时的兜底：推荐商品 -->
        <template v-else>
          <div class="page-panel">
            <div class="section-title">
              <span class="bar"></span>
              <h3>热门推荐</h3>
              <router-link class="more" to="/products">更多商品 &gt;</router-link>
            </div>
            <div class="goods-grid">
              <ProductCard v-for="p in fallbackProducts" :key="p.id" :product="p" />
            </div>
            <div v-if="!fallbackProducts.length" class="empty-tip">暂无推荐商品</div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import CmsRenderer from '../components/cms/CmsRenderer.vue'
import ProductCard from '../components/ProductCard.vue'
import { cmsApi } from '../api'
import { recommendApi } from '../api'

const loading = ref(true)
const blocks = ref([])
const fallbackProducts = ref([])

onMounted(async () => {
  loading.value = true
  try {
    // 优先渲染 CMS 首页（GET /cms/pages/home）
    const page = await cmsApi.public('home')
    if (page && Array.isArray(page.blocks) && page.blocks.length) {
      blocks.value = page.blocks
    } else {
      await loadFallback()
    }
  } catch {
    await loadFallback()
  } finally {
    loading.value = false
  }
})

async function loadFallback() {
  try {
    const data = await recommendApi.get({ scene: 'home', limit: 8 })
    fallbackProducts.value = Array.isArray(data) ? data : data.list || []
  } catch {
    fallbackProducts.value = []
  }
}
</script>

<style scoped>
.goods-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
</style>
