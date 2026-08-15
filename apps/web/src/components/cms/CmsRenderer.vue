<template>
  <div class="cms-renderer">
    <template v-for="(block, i) in blocks" :key="i">
      <BannerBlock v-if="block.type === 'banner'" :props="block.props" />
      <NavBlock v-else-if="block.type === 'nav'" :props="block.props" />
      <GoodsBlock v-else-if="block.type === 'goods'" :props="block.props" />
      <FlashsaleBlock v-else-if="block.type === 'flashsale'" :props="block.props" />
      <GrouponBlock v-else-if="block.type === 'groupon'" :props="block.props" />
      <ImageBlock v-else-if="block.type === 'image'" :props="block.props" />
      <RichBlock v-else-if="block.type === 'rich'" :props="block.props" />
      <VideoBlock v-else-if="block.type === 'video'" :props="block.props" />
      <NoticeBlock v-else-if="block.type === 'notice'" :props="block.props" />
    </template>
    <div v-if="!blocks || !blocks.length" class="empty-tip">页面暂无内容</div>
  </div>
</template>

<script setup>
import BannerBlock from './BannerBlock.vue'
import NavBlock from './NavBlock.vue'
import GoodsBlock from './GoodsBlock.vue'
import FlashsaleBlock from './FlashsaleBlock.vue'
import GrouponBlock from './GrouponBlock.vue'
import ImageBlock from './ImageBlock.vue'
import RichBlock from './RichBlock.vue'
import VideoBlock from './VideoBlock.vue'
import NoticeBlock from './NoticeBlock.vue'

defineProps({
  blocks: { type: Array, default: () => [] },
})
</script>