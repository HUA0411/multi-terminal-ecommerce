<template>
  <div class="flashsale-block page-panel">
    <div class="flashsale-head">
      <div class="section-title">
        <span class="bar"></span>
        <h3>{{ bp.title || '限时秒杀' }}</h3>
      </div>
      <el-button link type="danger" @click="router.push('/flashsales')">更多秒杀 &gt;</el-button>
    </div>
    <div v-if="items.length" class="flash-grid">
      <div v-for="s in items" :key="s.id" class="flash-card">
        <el-image :src="s.image" fit="cover" class="flash-img" @click="router.push('/products/' + s.productId)" />
        <div class="flash-body">
          <div class="f-name" @click="router.push('/products/' + s.productId)">{{ s.productName }}</div>
          <div class="f-price">
            <PriceText :cents="s.flashPrice" :size="20" />
            <span class="f-origin">{{ formatPrice(s.originalPrice) }}</span>
          </div>
          <div class="f-countdown">距结束 <span class="cd-cell">{{ countdownText(endLeft(s)) }}</span></div>
          <el-button type="danger" style="width:100%;margin-top:8px" :disabled="endLeft(s) <= 0" @click="router.push('/flashsales')">
            立即抢购
          </el-button>
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无进行中的秒杀活动" :image-size="60" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import PriceText from '../PriceText.vue'
import { formatPrice, countdownText } from '../../utils/format'

const props = defineProps({
  props: { type: Object, default: () => ({}) },
})

const bp = computed(() => props.props || {})
const items = computed(() => (Array.isArray(bp.value.items) ? bp.value.items : []))
const router = useRouter()
const now = ref(Date.now())
let timer = null

function endLeft(s) {
  return new Date(s.endAt).getTime() - now.value
}

onMounted(() => {
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.flashsale-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.flash-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.flash-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}
.flash-img {
  width: 100%;
  height: 180px;
  cursor: pointer;
  display: block;
}
.flash-body {
  padding: 10px 12px 12px;
}
.f-name {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.f-price {
  margin-top: 6px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.f-origin {
  font-size: 12px;
  color: #999;
  text-decoration: line-through;
}
.f-countdown {
  margin-top: 6px;
  font-size: 12px;
  color: #666;
}
.cd-cell {
  background: #e1251b;
  color: #fff;
  border-radius: 4px;
  padding: 1px 6px;
  font-family: monospace;
  font-size: 12px;
}
</style>
