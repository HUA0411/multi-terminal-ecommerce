<template>
  <view class="room-page" v-if="room">
    <!-- 视频区 -->
    <view class="video-wrap">
      <video v-if="room.streamUrl" class="player" :src="room.streamUrl" controls object-fit="contain" />
      <view v-else class="player placeholder-player">
        <text class="pp-icon">📺</text>
        <text class="pp-text">{{ room.title }}</text>
      </view>
      <view class="room-head">
        <view class="rh-live">LIVE</view>
        <view class="rh-title">{{ room.title }}</view>
        <view class="rh-meta">{{ room.merchantName || '直播间' }} · {{ viewerCount }} 人在看</view>
      </view>
    </view>

    <!-- 主播推送商品 -->
    <view v-if="hotProduct" class="hot-product card" @click="goProduct(hotProduct)">
      <image class="hp-img" :src="hotProduct.image || hotProduct.mainImage || '/static/placeholder.png'" mode="aspectFill" />
      <view class="flex-1">
        <view class="hp-name text-ellipsis">{{ hotProduct.name || hotProduct.productName }}</view>
        <view class="hp-price price" v-if="hotProduct.price !== undefined">¥{{ yuan(hotProduct.price) }}</view>
      </view>
      <view class="hp-btn">去看看</view>
    </view>

    <!-- 聊天区 -->
    <view class="card chat-card">
      <view class="chat-title">互动区（{{ likeCount }} 👍）</view>
      <scroll-view scroll-y class="chat-list" :scroll-into-view="scrollInto">
        <view v-for="(msg, i) in messages" :key="i" :id="'msg-' + i" class="chat-msg">
          <text class="cm-user">{{ msg.user || '观众' }}：</text>
          <text class="cm-content">{{ msg.content }}</text>
        </view>
        <view v-if="!messages.length" class="chat-empty">主播开播啦，快来互动吧～</view>
      </scroll-view>
      <view class="chat-actions flex">
        <view class="ca-like" @click="like">👍 点赞 {{ likeCount }}</view>
        <view class="ca-share" @click="shareRoom">↗ 分享</view>
      </view>
    </view>

    <!-- 带货商品 -->
    <view class="section-title">带货商品</view>
    <view v-if="room.products && room.products.length" class="goods-grid">
      <ProductCard v-for="(p, i) in room.products" :key="i" :product="p" />
    </view>
    <EmptyState v-else :icon="'🛍️'" :text="'主播暂未上架商品'" />
  </view>
  <view v-else class="loading-full">加载中...</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import ProductCard from '@/components/ProductCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { liveApi } from '@/api'
import { realtime } from '@/utils/ws'
import { fenToYuan } from '@/utils/format'

const room = ref(null)
const viewerCount = ref(0)
const likeCount = ref(0)
const messages = ref([])
const hotProduct = ref(null)
const scrollInto = ref('')

function yuan(fen) {
  return fenToYuan(fen)
}

let onChat = null
let onLike = null
let onProduct = null

onLoad(async (options) => {
  try {
    const data = await liveApi.detail(options.id)
    room.value = data
    viewerCount.value = data.viewerCount || 0
    likeCount.value = data.likeCount || 0
    const roomId = String(data.id || options.id)

    // 订阅直播间实时事件
    realtime.subscribe('live:' + roomId)
    onChat = (d) => {
      if (String(d.roomId) !== roomId) return
      messages.value.push({ user: d.user, content: d.content })
      if (messages.value.length > 100) messages.value.shift()
      scrollInto.value = 'msg-' + (messages.value.length - 1)
    }
    onLike = (d) => {
      if (String(d.roomId) !== roomId) return
      likeCount.value = d.count !== undefined ? d.count : likeCount.value + 1
    }
    onProduct = (d) => {
      if (String(d.roomId) !== roomId) return
      const p = (room.value.products || []).find((x) => String(x.id) === String(d.productId))
      if (p) hotProduct.value = p
    }
    realtime.on('live:chat', onChat)
    realtime.on('live:like', onLike)
    realtime.on('live:product', onProduct)
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
})

onUnload(() => {
  if (onChat) realtime.off('live:chat', onChat)
  if (onLike) realtime.off('live:like', onLike)
  if (onProduct) realtime.off('live:product', onProduct)
})

async function like() {
  likeCount.value += 1
  try {
    await liveApi.action(room.value.id, { type: 'like' })
  } catch (e) {
    /* 乐观更新，失败忽略 */
  }
}

async function shareRoom() {
  try {
    await liveApi.action(room.value.id, { type: 'share' })
    uni.showToast({ title: '分享成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '分享失败', icon: 'none' })
  }
}

function goProduct(p) {
  uni.navigateTo({ url: '/pages/product/detail?id=' + p.id })
}
</script>

<style lang="scss" scoped>
.room-page {
  padding-bottom: 40rpx;
}
.video-wrap {
  background: #000;
  position: relative;
}
.player {
  width: 100%;
  height: 480rpx;
}
.placeholder-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}
.pp-icon {
  font-size: 72rpx;
  margin-bottom: 12rpx;
}
.pp-text {
  font-size: 26rpx;
}
.room-head {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  color: #fff;
  padding: 40rpx 20rpx 16rpx;
}
.rh-live {
  display: inline-block;
  background: #ff4d4f;
  font-size: 20rpx;
  font-weight: 700;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  margin-bottom: 8rpx;
}
.rh-title {
  font-size: 32rpx;
  font-weight: 700;
}
.rh-meta {
  font-size: 22rpx;
  opacity: 0.85;
  margin-top: 4rpx;
}
.hot-product {
  display: flex;
  align-items: center;
  margin: 20rpx;
}
.hp-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f2f3f5;
  margin-right: 16rpx;
}
.hp-name {
  font-size: 26rpx;
}
.hp-price {
  margin-top: 8rpx;
}
.hp-btn {
  background: #ff4d4f;
  color: #fff;
  font-size: 24rpx;
  padding: 12rpx 24rpx;
  border-radius: 32rpx;
}
.chat-card {
  margin: 0 20rpx 20rpx;
}
.chat-title {
  font-size: 26rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}
.chat-list {
  height: 320rpx;
  background: #fafafa;
  border-radius: 12rpx;
  padding: 16rpx;
  box-sizing: border-box;
}
.chat-msg {
  font-size: 24rpx;
  padding: 6rpx 0;
}
.cm-user {
  color: #1677ff;
}
.cm-content {
  color: #333;
}
.chat-empty {
  text-align: center;
  color: #999;
  font-size: 24rpx;
  padding: 60rpx 0;
}
.chat-actions {
  margin-top: 16rpx;
}
.ca-like {
  flex: 1;
  text-align: center;
  background: #fff0f0;
  color: #ff4d4f;
  padding: 14rpx 0;
  border-radius: 32rpx;
  font-size: 26rpx;
  margin-right: 16rpx;
}
.ca-share {
  flex: 1;
  text-align: center;
  background: #f5f6f8;
  color: #666;
  padding: 14rpx 0;
  border-radius: 32rpx;
  font-size: 26rpx;
}
.goods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  padding: 0 20rpx;
}
.loading-full {
  text-align: center;
  color: #999;
  padding: 200rpx 0;
}
</style>
