<template>
  <div class="notice-block" :style="{ background: bp.bgColor || '#fffbe6' }" @click="go">
    <el-icon color="#e6a23c"><Bell /></el-icon>
    <span class="notice-text">{{ bp.text || '欢迎光临' }}</span>
    <el-icon v-if="bp.link" class="notice-more" color="#e6a23c"><ArrowRight /></el-icon>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  props: { type: Object, default: () => ({}) },
})

import { computed } from 'vue'
const bp = computed(() => props.props || {})

const router = useRouter()

function go() {
  const link = bp.value.link
  if (!link) return
  if (link.startsWith('/') && !link.startsWith('//')) router.push(link)
  else if (link) window.open(link, '_blank')
}
</script>

<style scoped>
.notice-block {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  cursor: pointer;
  border: 1px solid #f0e6c8;
}

.notice-text {
  flex: 1;
  font-size: 14px;
  color: #7a6a2f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
