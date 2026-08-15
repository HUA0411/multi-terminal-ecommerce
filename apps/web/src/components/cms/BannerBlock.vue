<template>
  <div class="banner-block" :style="{ height: (bp.height || 320) + 'px' }">
    <el-carousel v-if="banners.length" height="100%" :interval="4000" arrow="hover">
      <el-carousel-item v-for="(img, i) in banners" :key="i">
        <a v-if="img.link" :href="linkOf(img.link)" target="_blank">
          <el-image :src="img.image" fit="cover" style="width:100%;height:100%" />
        </a>
        <el-image v-else :src="img.image" fit="cover" style="width:100%;height:100%" />
      </el-carousel-item>
    </el-carousel>
    <div v-else class="empty-tip">Banner 未配置图片</div>
  </div>
</template>

<script setup>
const props = defineProps({
  props: { type: Object, default: () => ({}) },
})

import { computed } from 'vue'
const bp = computed(() => props.props || {})

// 兼容两种形态：字符串 URL 或 { image, link } 对象
const banners = computed(() =>
  (bp.value.images || []).map((x) => (typeof x === 'string' ? { image: x, link: '' } : x))
)

function linkOf(link) {
  if (!link) return '#'
  if (link.startsWith('/') && !link.startsWith('//')) return '/#' + link
  return link
}
</script>

<style scoped>
.banner-block {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}
</style>