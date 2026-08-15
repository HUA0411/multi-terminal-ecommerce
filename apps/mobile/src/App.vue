<script>
import { initStore } from '@/store'

export default {
  onLaunch() {
    // 从本地存储恢复登录态 / 语言 / 货币
    initStore()
  },
  onShow() {},
}
</script>

<style lang="scss">
/* 全局样式（非 scoped，作用于所有页面） */
page {
  background-color: $uni-bg-color;
  color: $uni-text-color;
  font-size: 28rpx;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.container {
  padding: 20rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.price {
  color: $uni-color-primary;
  font-weight: 600;
}

.text-ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.text-ellipsis-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.flex {
  display: flex;
  align-items: center;
}

.flex-1 {
  flex: 1;
}

.btn-primary {
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;
}

.btn-plain {
  border: 2rpx solid #ddd;
  color: #666;
  border-radius: 44rpx;
  background: #fff;
}

.safe-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  margin: 24rpx 0 16rpx;
  padding-left: 16rpx;
  border-left: 8rpx solid $uni-color-primary;
}
</style>
