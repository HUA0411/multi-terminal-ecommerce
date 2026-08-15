<template>
  <div class="image-block" :style="{ width: bp.width || '100%' }">
    <a v-if="bp.link" :href="bp.link" target="_blank">
      <el-image :src="bp.image || bp.url || bp.src" :style="{ height: bp.height || 'auto', width: '100%' }" fit="cover" />
    </a>
    <el-image v-else :src="bp.image" :style="{ height: bp.height || 'auto', width: '100%' }" fit="cover" />
  </div>
</template>

<script setup>
const props = defineProps({
  props: { type: Object, default: () => ({}) },
})

import { computed } from 'vue'
const bp = computed(() => props.props || {})
</script>

<style scoped>
.image-block {
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
}
</style>