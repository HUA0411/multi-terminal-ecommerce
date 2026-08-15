<template>
  <view class="product-card" @click="goDetail">
    <image class="thumb" :src="img" mode="aspectFill" lazy-load />
    <view class="info">
      <view class="name text-ellipsis-2">{{ product.name || product.productName }}</view>
      <view class="row flex">
        <text class="price"><text class="symbol">{{ symbol }}</text>{{ priceText }}</text>
        <text class="sales">已售{{ product.sales || 0 }}</text>
      </view>
      <view v-if="product.isFlash" class="flash-tag">限时秒杀</view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { fenToYuan } from '@/utils/format'

const props = defineProps({
  product: { type: Object, required: true },
})

const img = computed(() => props.product.mainImage || props.product.image || '/static/placeholder.png')
const symbol = computed(() => (props.product.currency === 'USD' ? '$' : '¥'))
const priceText = computed(() => {
  const v = props.product.isFlash && props.product.flashPrice ? props.product.flashPrice : props.product.price
  return fenToYuan(v)
})

function goDetail() {
  uni.navigateTo({ url: '/pages/product/detail?id=' + props.product.id })
}
</script>

<style lang="scss" scoped>
.product-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  position: relative;
}
.thumb {
  width: 100%;
  height: 340rpx;
  background: #f2f3f5;
  display: block;
}
.info {
  padding: 16rpx;
}
.name {
  font-size: 26rpx;
  color: #333;
  min-height: 72rpx;
}
.row {
  margin-top: 8rpx;
  justify-content: space-between;
}
.symbol {
  font-size: 22rpx;
}
.price {
  font-size: 32rpx;
}
.sales {
  font-size: 22rpx;
  color: #999;
}
.flash-tag {
  position: absolute;
  top: 12rpx;
  left: 0;
  background: #ff4d4f;
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 0 12rpx 12rpx 0;
}
</style>
