<template>
  <div class="groupon-block page-panel">
    <div class="groupon-head">
      <div class="section-title">
        <span class="bar"></span>
        <h3>{{ bp.title || '拼团专区' }}</h3>
      </div>
      <el-button link type="warning" @click="router.push('/groupons')">更多拼团 &gt;</el-button>
    </div>
    <div v-if="items.length" class="groupon-grid">
      <div v-for="g in items" :key="g.id" class="groupon-card">
        <el-image :src="g.productImage" fit="cover" class="g-img" @click="router.push('/products/' + g.productId)" />
        <div class="g-body">
          <div class="g-name" @click="router.push('/products/' + g.productId)">{{ g.productName }}</div>
          <div class="g-price-row">
            <span class="g-price"><PriceText :cents="g.groupPrice" :size="20" /></span>
            <span class="g-origin">{{ formatPrice(g.originalPrice) }}</span>
          </div>
          <div class="g-meta">
            已拼 {{ g.currentSize }}/{{ g.targetSize }} 人
            <el-tag size="small" type="warning" effect="plain">{{ g.statusText }}</el-tag>
          </div>
          <el-button type="warning" style="width:100%;margin-top:8px" @click="router.push('/groupons')">去拼团</el-button>
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无拼团活动" :image-size="60" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PriceText from '../PriceText.vue'
import { formatPrice } from '../../utils/format'

const props = defineProps({
  props: { type: Object, default: () => ({}) },
})

const bp = computed(() => props.props || {})
const items = computed(() => (Array.isArray(bp.value.items) ? bp.value.items : []))
const router = useRouter()
</script>

<style scoped>
.groupon-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.groupon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.groupon-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}
.g-img {
  width: 100%;
  height: 180px;
  cursor: pointer;
  display: block;
}
.g-body {
  padding: 10px 12px 12px;
}
.g-name {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.g-price-row {
  margin-top: 6px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.g-origin {
  font-size: 12px;
  color: #999;
  text-decoration: line-through;
}
.g-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
