<template>
  <view class="confirm-page" v-if="loaded">
    <!-- 收货地址 -->
    <view class="card address" @click="chooseAddress">
      <view v-if="address" class="flex">
        <view class="a-icon">📍</view>
        <view class="flex-1">
          <view class="a-line1">{{ address.name }} <text class="a-phone">{{ address.phone }}</text></view>
          <view class="a-detail">{{ address.detail }}</view>
        </view>
        <text class="a-arrow">›</text>
      </view>
      <view v-else class="add-address flex">
        <view class="a-icon">📍</view>
        <text class="flex-1">请选择收货地址</text>
        <text class="a-arrow">›</text>
      </view>
    </view>

    <!-- 商品清单 -->
    <view class="card">
      <view class="o-item flex" v-for="item in items" :key="item.id || item.skuId">
        <image class="o-img" :src="item.image || '/static/placeholder.png'" mode="aspectFill" />
        <view class="flex-1 info">
          <view class="o-name text-ellipsis">{{ item.productName }}</view>
          <view v-if="item.skuName" class="o-sku">{{ item.skuName }}</view>
          <view class="flex" style="justify-content: space-between; margin-top: 8rpx">
            <text class="price">{{ symbol }}{{ yuan(item.price) }}</text>
            <text class="o-qty">x{{ item.quantity }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 优惠券 -->
    <view class="card flex" @click="chooseCoupon">
      <text class="row-label">优惠券</text>
      <text class="flex-1" :class="coupon ? 'coupon-on' : 'row-placeholder'">
        {{ coupon ? (coupon.name || coupon.title || '优惠券') + ' -' + yuan(coupon.amount || coupon.value) : '选择优惠券' }}
      </text>
      <text class="a-arrow">›</text>
    </view>

    <!-- 备注 -->
    <view class="card flex">
      <text class="row-label">备注</text>
      <input class="flex-1 remark" v-model="remark" placeholder="选填，给商家留言" />
    </view>

    <!-- 金额汇总 -->
    <view class="card">
      <view class="flex row2"><text class="flex-1">商品金额</text><text>{{ symbol }}{{ yuan(goodsAmount) }}</text></view>
      <view class="flex row2"><text class="flex-1">运费</text><text>包邮</text></view>
    </view>

    <!-- 提交栏 -->
    <view class="footer safe-bottom">
      <view class="flex-1">
        <text class="f-label">应付:</text>
        <text class="price f-price"><text class="symbol">{{ symbol }}</text>{{ yuan(goodsAmount) }}</text>
      </view>
      <view class="submit-btn" @click="submitOrder">提交订单</view>
    </view>
  </view>
  <view v-else class="loading-full">加载中...</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { cartApi, orderApi, couponApi } from '@/api'
import { store, requireLogin } from '@/store'
import { defaultAddress, findAddress } from '@/utils/address'
import { fenToYuan } from '@/utils/format'

const loaded = ref(false)
const items = ref([])
const ids = ref([])
const address = ref(null)
const coupon = ref(null)
const coupons = ref([])
const remark = ref('')

const goodsAmount = computed(() => items.value.reduce((s, i) => s + (Number(i.price) || 0) * i.quantity, 0))
const symbol = computed(() => (store.currency === 'USD' ? '$' : '¥'))

function yuan(fen) {
  return fenToYuan(fen)
}

onLoad(async (options) => {
  if (!requireLogin()) return
  ids.value = options.ids ? String(options.ids).split(',').filter(Boolean).map((x) => String(x)) : []
  address.value = defaultAddress()
  try {
    const [cart, couponData] = await Promise.all([cartApi.get(), couponApi.mine({ status: 'unused' })])
    let list = (cart && cart.items) || []
    if (ids.value.length) list = list.filter((i) => ids.value.includes(String(i.id)))
    else list = list.filter((i) => i.checked)
    items.value = list
    coupons.value = (couponData && couponData.list) || couponData || []
    loaded.value = true
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
    loaded.value = true
  }
})

function chooseAddress() {
  uni.navigateTo({ url: '/pages/address/list?select=1' })
}

uni.$on('address-selected', (addr) => {
  address.value = addr
})

onUnload(() => {
  uni.$off('address-selected')
})

function chooseCoupon() {
  if (!coupons.value.length) {
    uni.showToast({ title: '暂无可用优惠券', icon: 'none' })
    return
  }
  const names = ['不使用优惠券'].concat(coupons.value.map((c) => (c.name || c.title || '优惠券') + ' -' + yuan(c.amount || c.value || 0)))
  uni.showActionSheet({
    itemList: names,
    success: (res) => {
      if (res.tapIndex === 0) coupon.value = null
      else coupon.value = coupons.value[res.tapIndex - 1]
    },
  })
}

async function submitOrder() {
  if (!address.value) {
    uni.showToast({ title: '请先选择收货地址', icon: 'none' })
    return
  }
  if (!items.value.length) {
    uni.showToast({ title: '没有可结算的商品', icon: 'none' })
    return
  }
  uni.showLoading({ title: '提交中...' })
  try {
    const payload = {
      cartItemIds: ids.value.length ? ids.value : [],
      addressId: address.value.id,
      remark: remark.value,
    }
    if (coupon.value) payload.couponId = coupon.value.id
    const data = await orderApi.create(payload)
    const order = data && data.order
    uni.hideLoading()
    if (order) {
      uni.redirectTo({ url: '/pages/order/pay?orderId=' + order.id + '&amount=' + (order.payableAmount || 0) })
    } else {
      uni.showToast({ title: '下单成功', icon: 'success' })
      setTimeout(() => uni.switchTab({ url: '/pages/order/list' }), 800)
    }
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '下单失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.confirm-page {
  padding: 20rpx;
  padding-bottom: 160rpx;
}
.address {
  display: flex;
  align-items: center;
}
.a-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}
.a-line1 {
  font-size: 30rpx;
  font-weight: 600;
}
.a-phone {
  font-size: 26rpx;
  color: #666;
  margin-left: 12rpx;
}
.a-detail {
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
}
.add-address {
  font-size: 28rpx;
  color: #333;
}
.a-arrow {
  color: #ccc;
  font-size: 32rpx;
}
.o-item {
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}
.o-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f2f3f5;
  margin-right: 16rpx;
  flex-shrink: 0;
}
.info {
  min-width: 0;
}
.o-name {
  font-size: 26rpx;
}
.o-sku {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}
.o-qty {
  color: #999;
  font-size: 26rpx;
}
.row-label {
  font-size: 28rpx;
  color: #333;
  margin-right: 24rpx;
}
.row-placeholder {
  color: #999;
  font-size: 26rpx;
}
.coupon-on {
  color: #ff4d4f;
  font-size: 26rpx;
}
.remark {
  font-size: 26rpx;
  color: #333;
}
.row2 {
  font-size: 26rpx;
  color: #666;
  padding: 10rpx 0;
}
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  z-index: 10;
}
.f-label {
  font-size: 24rpx;
  color: #999;
}
.f-price {
  font-size: 36rpx;
}
.submit-btn {
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  color: #fff;
  padding: 20rpx 60rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
}
.loading-full {
  text-align: center;
  color: #999;
  padding: 200rpx 0;
}
</style>
