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

    <!-- flashsale -->
    <view v-for="(block, i) in flashBlocks" :key="'fs' + i" class="block flashsale">
      <view class="block-head">
        <text class="block-title">{{ blockTitle(block) }}</text>
        <text class="block-more" @click="go('/pages/flashsale/index')">更多 &gt;</text>
      </view>
      <scroll-view scroll-x class="flash-scroll" :show-scrollbar="false">
        <view class="flash-row">
          <view class="flash-card" v-for="(s, j) in listOf(block)" :key="j" @click="go('/pages/product/detail?id=' + s.productId)">
            <image class="flash-img" :src="s.image" mode="aspectFill" />
            <view class="flash-name">{{ s.productName }}</view>
            <view class="flash-price-row">
              <text class="flash-price">{{ priceText(s.flashPrice) }}</text>
              <text class="flash-origin">{{ priceText(s.originalPrice) }}</text>
            </view>
            <view class="flash-cd">
              <text class="flash-cd-label">距结束</text>
              <CountDown :end-time="s.endAt" :show-day="false" />
            </view>
            <view class="flash-btn" @click.stop="go('/pages/flashsale/index')">立即抢购</view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- groupon -->
    <view v-for="(block, i) in grouponBlocks" :key="'gp' + i" class="block groupon">
      <view class="block-head">
        <text class="block-title">{{ blockTitle(block) }}</text>
        <text class="block-more" @click="go('/pages/groupon/index')">更多 &gt;</text>
      </view>
      <scroll-view scroll-x class="flash-scroll" :show-scrollbar="false">
        <view class="flash-row">
          <view class="flash-card" v-for="(g, j) in listOf(block)" :key="j" @click="go('/pages/product/detail?id=' + g.productId)">
            <image class="flash-img" :src="g.productImage" mode="aspectFill" />
            <view class="flash-name">{{ g.productName }}</view>
            <view class="flash-price-row">
              <text class="flash-price">{{ priceText(g.groupPrice) }}</text>
              <text class="flash-origin">{{ priceText(g.originalPrice) }}</text>
            </view>
            <view class="groupon-meta">已拼 {{ g.currentSize }}/{{ g.targetSize }} 人</view>
            <view class="groupon-btn" @click.stop="go('/pages/groupon/index')">去拼团</view>
          </view>
        </view>
      </scroll-view>
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
import CountDown from './CountDown.vue'
import { priceText } from '@/utils/format'

const props = defineProps({
  blocks: { type: Array, default: () => [] },
})

const banners = computed(() => props.blocks.filter((b) => b && b.type === 'banner' && listOf(b).length))
const navs = computed(() => props.blocks.filter((b) => b && b.type === 'nav' && listOf(b).length))
const goodsBlocks = computed(() => props.blocks.filter((b) => b && b.type === 'goods' && goodsList(b).length))
const imageBlocks = computed(() => props.blocks.filter((b) => b && b.type === 'image'))
const richBlocks = computed(() => props.blocks.filter((b) => b && b.type === 'rich'))
const noticeBlocks = computed(() => props.blocks.filter((b) => b && b.type === 'notice' && noticeText(b)))
const flashBlocks = computed(() => props.blocks.filter((b) => b && b.type === 'flashsale' && listOf(b).length))
const grouponBlocks = computed(() => props.blocks.filter((b) => b && b.type === 'groupon' && listOf(b).length))
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

function blockTitle(block) {
  const p = propsOf(block)
  return p.title || '限时秒杀'
}

function go(url) {
  uni.navigateTo({ url })
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
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.block-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #222;
}
.block-more {
  font-size: 24rpx;
  color: #999;
}
.flash-scroll {
  width: 100%;
}
.flash-row {
  display: flex;
  gap: 20rpx;
  padding-bottom: 8rpx;
}
.flash-card {
  flex-shrink: 0;
  width: 300rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.flash-img {
  width: 300rpx;
  height: 300rpx;
  display: block;
}
.flash-name {
  font-size: 26rpx;
  color: #333;
  padding: 12rpx 16rpx 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.flash-price-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  padding: 8rpx 16rpx 0;
}
.flash-price {
  color: #ff4d4f;
  font-size: 30rpx;
  font-weight: 700;
}
.flash-origin {
  color: #bbb;
  font-size: 22rpx;
  text-decoration: line-through;
}
.flash-cd {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx 0;
}
.flash-cd-label {
  font-size: 22rpx;
  color: #999;
}
.flash-btn {
  margin: 12rpx 16rpx 16rpx;
  background: #ff4d4f;
  color: #fff;
  text-align: center;
  border-radius: 32rpx;
  font-size: 26rpx;
  padding: 12rpx 0;
}
.groupon-meta {
  font-size: 22rpx;
  color: #ff9f0a;
  padding: 10rpx 16rpx 0;
}
.groupon-btn {
  margin: 12rpx 16rpx 16rpx;
  background: #ff9f0a;
  color: #fff;
  text-align: center;
  border-radius: 32rpx;
  font-size: 26rpx;
  padding: 12rpx 0;
}
</style>