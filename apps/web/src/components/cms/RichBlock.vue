<template>
  <div class="rich-block page-panel" v-html="bp.content || bp.html || ''"></div>
</template>

<script setup>
const props = defineProps({
  props: { type: Object, default: () => ({}) },
})

import { computed } from 'vue'
const bp = computed(() => props.props || {})
</script>

<style scoped>
.rich-block {
  line-height: 1.8;
  word-break: break-all;
}

.rich-block :deep(img) {
  max-width: 100%;
}

.rich-block :deep(a) {
  color: #409eff;
}
</style>