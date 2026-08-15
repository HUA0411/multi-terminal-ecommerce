<template>
  <view class="cms-blocks">
    <!-- banner -->
    <swiper v-for="(block, i) in banners" :key="'b' + i" class="block banner" circular autoplay indicator-dots indicator-color="rgba(255,255,255,0.5)" indicator-active-color="#ffffff">
      <swiper-item v-for="(item, j) in listOf(block)" :key="j" @click="onTap(item)">
        <image class="banner-img" :src="imgOf(item)" mode="aspectFill" />
      </swiper-item>
    </swiper>

    <!-- nav -->
    <view v-for="(block, i) in navs" :key="'n' + i" class="block nav">
      <view class="nav-item" v-for="(item, j) in listOf(block)" :key="j" @click="onTap(item)">
        <image v-if="iconOf(item)" class="nav-icon" :src="iconOf(item)" mode="aspectFit" />
        <view v-else class="nav-icon placeholder-icon">{{ (titleOf(item) || '·').slice(0, 1) }}</view>
        <text class="nav-title">{{ titleOf(item) }}</text>
      </view>
    </view>

    <!-- goods -->
    <view v-for="(block, i) in goodsBlocks" :key="'g' + i" class="block goods">
      <view class="goods-grid">
        <ProductCard v-for="(p, j) in goodsList(block)" :key="j" :product="p" />
      </view>
    </view>

    <!-- image -->
    <view v-for="(block, i) in imageBlocks" :key="'i' + i" class="block image-block" @click="onTap(propsOf(block))">
      <image class="full-img" :src="imgOf(propsOf(block))" mode="widthFix" />
    </view>

    <!-- rich -->
    <view v-for="(block, i) in richBlocks" :key="'r' + i" class="block rich">
      <rich-text :nodes="richHtml(block)"></rich-text>
    </view>

    <!-- notice -->
    <view v-for="(block, i) in noticeBlocks" :key="'t' + i" class="block notice">
      <text class="notice-label">公告</text>
      <text class="notice-text text-ellipsis">{{ noticeText(block) }}</text>
    </view>

    <!-- video -->
    <view v-for="(block, i) in videoBlocks" :key="'v' + i" class="block video-block">
      <video class="video" :src="videoUrl(block)" controls></video>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import ProductCard from './ProductCard.vue'

const props = defineProps({
  blocks: { type: Array, default: () => [] },
})

const banners = computed(() => props.blocks.filter((b) => b && b.type === 'banner' && listOf(b).length))
const navs = computed(() => props.blocks.filter((b) => b && b.type === 'nav' && listOf(b).length))
const goodsBlocks = computed(() => props.blocks.filter((b) => b && b.type === 'goods' && goodsList(b).length))
const imageBlocks = computed(() => props.blocks.filter((b) => b && b.type === 'image'))
const richBlocks = computed(() => props.blocks.filter((b) => b && b.type === 'rich'))
const noticeBlocks = computed(() => props.blocks.filter((b) => b && b.type === 'notice' && noticeText(b)))
const videoBlocks = computed(() => props.blocks.filter((b) => b && b.type === 'video' && videoUrl(b)))

function propsOf(block) {
  return (block && block.props) || {}
}

// 通用列表归一化：兼容 props.images / props.items / props.list / props 本身为数组
function listOf(block) {
  const p = propsOf(block)
  if (Array.isArray(p)) return p
  return p.images || p.items || p.list || p.banners || []
}

function imgOf(item) {
  if (!item) return ''
  return item.image || item.img || item.src || item.url || item.pic || ''
}

function iconOf(item) {
  return item.icon || item.iconUrl || ''
}

function titleOf(item) {
  return item.title || item.name || item.text || ''
}

function goodsList(block) {
  const p = propsOf(block)
  if (Array.isArray(p.items)) return p.items.filter((it) => it && it.id)
  if (Array.isArray(p.products)) return p.products.filter((it) => it && it.id)
  return []
}

function richHtml(block) {
  const p = propsOf(block)
  return p.html || p.content || p.richText || ''
}

function noticeText(block) {
  const p = propsOf(block)
  if (p.text) return p.text
  if (Array.isArray(p.items)) return p.items.map((it) => (typeof it === 'string' ? it : it.text || it.title)).join('  ·  ')
  return ''
}

function videoUrl(block) {
  const p = propsOf(block)
  return p.src || p.url || ''
}

function onTap(item) {
  if (!item) return
  const link = item.link || item.url || item.path || (item.productId ? '/pages/product/detail?id=' + item.productId : '')
  if (!link) return
  if (typeof link === 'string' && link.indexOf('/pages/') === 0) {
    uni.navigateTo({ url: link })
  } else if (typeof link === 'string' && /^https?:/.test(link)) {
    // 外部链接：复制提示，避免内置 web-view 依赖
    uni.setClipboardData({ data: link })
  } else if (item.productId) {
    uni.navigateTo({ url: '/pages/product/detail?id=' + item.productId })
  }
}
</script>

<style lang="scss" scoped>
.block {
  margin-bottom: 20rpx;
}
.banner {
  height: 320rpx;
  border-radius: 16rpx;
  overflow: hidden;
}
.banner-img {
  width: 100%;
  height: 320rpx;
  display: block;
}
.nav {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 0;
  display: flex;
  flex-wrap: wrap;
}
.nav-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20rpx;
}
.nav-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  margin-bottom: 8rpx;
}
.placeholder-icon {
  background: linear-gradient(135deg, #ffd6d6, #ffb3b3);
  color: #ff4d4f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 700;
}
.nav-title {
  font-size: 24rpx;
  color: #333;
}
.goods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.image-block {
  border-radius: 16rpx;
  overflow: hidden;
}
.full-img {
  width: 100%;
  display: block;
}
.rich {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  overflow: hidden;
}
.notice {
  display: flex;
  align-items: center;
  background: #fff7e6;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
}
.notice-label {
  flex-shrink: 0;
  background: #ff9f0a;
  color: #fff;
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  margin-right: 16rpx;
}
.notice-text {
  font-size: 24rpx;
  color: #b26a00;
  flex: 1;
}
.video {
  width: 100%;
  height: 400rpx;
  border-radius: 16rpx;
}
</style>
