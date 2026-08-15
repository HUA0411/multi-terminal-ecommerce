<template>
  <div class="nav-block page-panel">
    <div class="nav-grid">
      <a
        v-for="(item, i) in navItems"
        :key="i"
        class="nav-cell"
        :href="linkOf(item.link)"
        @click.prevent="go(item.link)"
      >
        <el-icon :size="30" color="#e1251b"><component :is="item.icon || 'Grid'" /></el-icon>
        <span>{{ item.name || item.text || '入口' }}</span>
      </a>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  props: { type: Object, default: () => ({}) },
})

import { computed } from 'vue'
const bp = computed(() => props.props || {})

// 兼容 {text, categoryId}（后端 seed）与 {name, link, icon} 两种形态
const navItems = (bp.value.items || []).map((it) => {
  if (typeof it === 'string') return { name: it, link: '' }
  if (it.categoryId && !it.link) return { ...it, name: it.name || it.text, link: '/products?categoryId=' + it.categoryId }
  return { ...it, name: it.name || it.text }
})

const router = useRouter()

function linkOf(link) {
  return link || '#'
}

function go(link) {
  if (!link) return
  if (link.startsWith('/') && !link.startsWith('//')) {
    router.push(link)
  } else if (link) {
    window.open(link, '_blank')
  }
}
</script>

<style scoped>
.nav-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 10px;
}

.nav-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 4px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  transition: background 0.2s;
}

.nav-cell:hover {
  background: #fafafa;
}
</style>