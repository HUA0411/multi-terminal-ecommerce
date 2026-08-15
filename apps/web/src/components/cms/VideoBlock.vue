<template>
  <div class="video-block page-panel">
    <div v-if="props.title" class="video-title">{{ props.title }}</div>
    <video
      v-if="props.url"
      :src="props.url"
      :poster="props.poster"
      controls
      preload="metadata"
      style="width:100%;max-height:480px;border-radius:8px;background:#000"
    ></video>
    <div v-else class="empty-tip">未配置视频地址</div>
  </div>
</template>

<script setup>
defineProps({
  props: { type: Object, default: () => ({}) },
})
</script>

<style scoped>
.video-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
}
</style>
