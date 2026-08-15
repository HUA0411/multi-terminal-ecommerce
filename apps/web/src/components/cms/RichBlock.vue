<template>
  <div class="rich-block page-panel" v-html="props.content || ''"></div>
</template>

<script setup>
defineProps({
  props: { type: Object, default: () => ({}) },
})
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
