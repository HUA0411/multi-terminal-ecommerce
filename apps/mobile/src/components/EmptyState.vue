<template>
  <view class="empty">
    <view class="icon">{{ icon }}</view>
    <text class="text">{{ text }}</text>
    <slot />
  </view>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '🛒' },
  text: { type: String, default: '暂无数据' },
})
</script>

<style lang="scss" scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
  color: #999;
}
.icon {
  font-size: 96rpx;
  margin-bottom: 20rpx;
}
.text {
  font-size: 26rpx;
  color: #999;
}
</style>
