<template>
  <div class="product-card" @click="goDetail">
    <el-image class="p-img" :src="product.mainImage || fallbackImg" fit="cover">
      <template #error>
        <div class="img-err"><el-icon :size="32"><Picture /></el-icon></div>
      </template>
    </el-image>
    <div class="p-body">
      <div class="p-name">{{ product.name }}</div>
      <div class="p-sub">{{ product.subtitle || product.merchantName || '优质好物' }}</div>
      <div class="p-foot">
        <PriceText v-if="product.isFlash && product.flashPrice != null" :cents="product.flashPrice" :currency="product.currency" :size="20" />
        <PriceText v-else :cents="product.price" :currency="product.currency" :size="20" />
        <span v-if="product.isFlash" class="flash-tag">秒杀</span>
        <span v-else class="sales">已售 {{ product.sales ?? 0 }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import PriceText from './PriceText.vue'

const props = defineProps({
  product: { type: Object, required: true },
})

const router = useRouter()
const fallbackImg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#f0f0f0"/><text x="200" y="205" font-size="20" fill="#bbb" text-anchor="middle">暂无图片</text></svg>')

function goDetail() {
  router.push(`/products/${props.product.id}`)
}
</script>

<style scoped>
.img-err {
  width: 100%;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  color: #bbb;
}

.flash-tag {
  background: #e1251b;
  color: #fff;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
}

.sales {
  font-size: 12px;
  color: #999;
}
</style>
