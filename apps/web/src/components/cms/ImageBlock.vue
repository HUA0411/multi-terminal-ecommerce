<template>
  <div class="image-block" :style="{ width: props.width || '100%' }">
    <a v-if="props.link" :href="props.link" target="_blank">
      <el-image :src="props.image" :style="{ height: props.height || 'auto', width: '100%' }" fit="cover" />
    </a>
    <el-image v-else :src="props.image" :style="{ height: props.height || 'auto', width: '100%' }" fit="cover" />
  </div>
</template>

<script setup>
defineProps({
  props: { type: Object, default: () => ({}) },
})
</script>

<style scoped>
.image-block {
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
}
</style>
