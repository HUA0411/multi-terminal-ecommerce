<template>
  <div class="video-block page-panel">
    <div v-if="bp.title" class="video-title">{{ bp.title }}</div>
    <video
      v-if="bp.url"
      :src="bp.url"
      :poster="bp.poster"
      controls
      preload="metadata"
      style="width:100%;max-height:480px;border-radius:8px;background:#000"
    ></video>
    <div v-else class="empty-tip">未配置视频地址</div>
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
.video-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
}
</style>
