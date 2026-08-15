<template>
  <view class="detail-page" v-if="product">
    <!-- 图片轮播 -->
    <swiper class="gallery" circular indicator-dots>
      <swiper-item v-for="(img, i) in images" :key="i">
        <image class="gallery-img" :src="img" mode="aspectFill" />
      </swiper-item>
    </swiper>

    <view class="card price-card">
      <view class="flex" style="align-items: baseline">
        <text class="price big"><text class="symbol">{{ symbol }}</text>{{ priceText }}</text>
        <text v-if="product.originalPrice && product.originalPrice > product.price" class="original">¥{{ yuan(product.originalPrice) }}</text>
        <view v-if="product.isFlash" class="flash-tag">秒杀</view>
      </view>
      <view class="name">{{ product.name }}</view>
      <view v-if="product.subtitle" class="subtitle">{{ product.subtitle }}</view>
      <view class="meta flex">
        <text>已售 {{ product.sales || 0 }}</text>
        <text class="flex-1"></text>
        <text>库存 {{ product.stock !== undefined ? product.stock : '-' }}</text>
      </view>
      <view v-if="product.tags && product.tags.length" class="tags">
        <text class="tag" v-for="(t, i) in product.tags" :key="i">{{ t }}</text>
      </view>
    </view>

    <!-- 商家信息 -->
    <view v-if="product.merchant" class="card merchant flex" @click="goMerchant">
      <view class="m-avatar">🏪</view>
      <view class="flex-1">
        <view class="m-name">{{ product.merchant.name || product.merchantName }}</view>
        <view class="m-rating">评分 {{ product.merchant.rating !== undefined ? product.merchant.rating : '-' }}</view>
      </view>
      <text class="m-arrow">进店 ›</text>
    </view>
    <view v-else-if="product.merchantName" class="card merchant flex">
      <view class="m-avatar">🏪</view>
      <view class="m-name flex-1">{{ product.merchantName }}</view>
    </view>

    <!-- 服务/试衣 -->
    <view class="card services flex">
      <view class="service" @click="goFitting">👗 虚拟试衣</view>
      <view class="service">🚚 包邮</view>
      <view class="service">🔄 7天无理由</view>
    </view>

    <!-- 商品详情 -->
    <view class="card" v-if="product.images && product.images.length > 1">
      <view class="section-title">商品详情</view>
      <image v-for="(img, i) in product.images" :key="i" class="detail-img" :src="img" mode="widthFix" />
    </view>

    <!-- 推荐 -->
    <view v-if="recommendations.length">
      <view class="section-title">猜你喜欢</view>
      <view class="goods-grid">
        <ProductCard v-for="(p, i) in recommendations" :key="p.id || i" :product="p" />
      </view>
    </view>

    <!-- SKU 弹层 -->
    <view v-if="showSku" class="mask" @click="showSku = false">
      <view class="sku-panel" @click.stop>
        <view class="sku-head flex">
          <image class="sku-img" :src="product.mainImage || '/static/placeholder.png'" mode="aspectFill" />
          <view class="flex-1">
            <text class="price">{{ symbol }}{{ selectedSkuPrice }}</text>
            <view class="sku-stock" v-if="selectedSku">库存 {{ selectedSku.stock }} 件</view>
          </view>
          <view class="sku-close" @click="showSku = false">✕</view>
        </view>
        <scroll-view scroll-y class="sku-scroll">
          <view class="sku-group-title">选择规格</view>
          <view class="sku-list">
            <view
              v-for="s in product.skus || []"
              :key="s.id"
              class="sku-item"
              :class="{ active: selectedSku && selectedSku.id === s.id }"
              @click="selectedSku = s"
            >
              {{ s.name || s.specValues || '默认规格' }}
            </view>
          </view>
          <view class="sku-group-title">数量</view>
          <view class="stepper">
            <view class="step-btn" @click="qty > 1 && qty--">−</view>
            <text class="qty">{{ qty }}</text>
            <view class="step-btn" @click="qty++">+</view>
          </view>
        </scroll-view>
        <view class="sku-footer safe-bottom">
          <view class="sku-btn add" @click="addToCart">加入购物车</view>
          <view class="sku-btn buy" @click="buyNow">立即购买</view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="action-bar safe-bottom">
      <view class="act-item" @click="goHome">🏠<text>首页</text></view>
      <view class="act-item" @click="goCart">🛒<text>购物车</text></view>
      <view class="act-btns">
        <view class="ab add" @click="openSku('cart')">加入购物车</view>
        <view class="ab buy" @click="openSku('buy')">立即购买</view>
      </view>
    </view>
  </view>

  <view v-else class="loading-full">加载中...</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ProductCard from '@/components/ProductCard.vue'
import { productApi, cartApi } from '@/api'
import { store, requireLogin, setCartCount } from '@/store'
import { addGuestItem } from '@/utils/guestCart'
import { fenToYuan } from '@/utils/format'

const product = ref(null)
const recommendations = ref([])
const showSku = ref(false)
const skuAction = ref('cart')
const selectedSku = ref(null)
const qty = ref(1)

const images = computed(() => {
  if (!product.value) return []
  const imgs = (product.value.images && product.value.images.length ? product.value.images : [product.value.mainImage]).filter(Boolean)
  return imgs.length ? imgs : ['/static/placeholder.png']
})

const symbol = computed(() => (store.currency === 'USD' ? '$' : '¥'))
const priceText = computed(() => {
  const p = product.value
  const v = p.isFlash && p.flashPrice ? p.flashPrice : p.price
  return fenToYuan(v)
})
const selectedSkuPrice = computed(() => {
  const s = selectedSku.value
  if (!s) return priceText.value
  return fenToYuan(s.price)
})

function yuan(fen) {
  return fenToYuan(fen)
}

onLoad(async (options) => {
  const id = options.id
  if (!id) return
  try {
    const data = await productApi.detail(id)
    product.value = data
    recommendations.value = (data && data.recommendations) || []
    if (data && data.skus && data.skus.length) selectedSku.value = data.skus[0]
    if (data && data.name) uni.setNavigationBarTitle({ title: data.name })
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
})

function openSku(action) {
  if (!product.value.skus || !product.value.skus.length) {
    // 无 SKU：直接添加
    selectedSku.value = null
    doAction(action)
    return
  }
  skuAction.value = action
  showSku.value = true
}

function addToCart() {
  doAction('cart')
}

function buyNow() {
  doAction('buy')
}

async function doAction(action) {
  const skuId = selectedSku.value ? selectedSku.value.id : null
  if (product.value.skus && product.value.skus.length && !skuId) {
    uni.showToast({ title: '请选择规格', icon: 'none' })
    return
  }
  showSku.value = false
  if (!requireLogin()) {
    // 游客：加入本地购物车
    if (skuId) addGuestItem(product.value.id, skuId, qty.value)
    else addGuestItem(product.value.id, 'default', qty.value)
    uni.showToast({ title: '已加入本地购物车', icon: 'none' })
    return
  }
  try {
    const data = await cartApi.add({ skuId, quantity: qty.value, checked: true })
    const count = (data && data.totalQuantity) || (await cartApi.get()).totalQuantity || 0
    setCartCount(count)
    uni.showToast({ title: '已加入购物车', icon: 'success' })
    if (action === 'buy') {
      // 立即购买：找到刚加入的购物车项 id 跳转结算
      const cart = await cartApi.get()
      const item = cart.items.find((i) => String(i.skuId) === String(skuId))
      uni.navigateTo({ url: '/pages/order/confirm?ids=' + (item ? item.id : '') })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '加入失败', icon: 'none' })
  }
}

function goCart() {
  uni.switchTab({ url: '/pages/cart/cart' })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function goMerchant() {
  uni.showToast({ title: '商家店铺页开发中', icon: 'none' })
}

function goFitting() {
  uni.navigateTo({ url: '/pages/fitting/index?productId=' + product.value.id })
}
</script>

<style lang="scss" scoped>
.detail-page {
  padding-bottom: 140rpx;
}
.gallery {
  height: 750rpx;
  background: #f2f3f5;
}
.gallery-img {
  width: 100%;
  height: 750rpx;
}
.price-card {
  margin-top: 20rpx;
}
.price.big {
  font-size: 44rpx;
}
.symbol {
  font-size: 26rpx;
}
.original {
  color: #999;
  text-decoration: line-through;
  font-size: 26rpx;
  margin-left: 16rpx;
}
.flash-tag {
  background: #ff4d4f;
  color: #fff;
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  margin-left: 16rpx;
}
.name {
  font-size: 30rpx;
  font-weight: 600;
  margin-top: 12rpx;
}
.subtitle {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}
.meta {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #999;
}
.tags {
  margin-top: 12rpx;
  display: flex;
  flex-wrap: wrap;
}
.tag {
  background: #fff0f0;
  color: #ff4d4f;
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  margin: 0 12rpx 8rpx 0;
}
.merchant {
  padding: 20rpx 24rpx;
}
.m-avatar {
  font-size: 48rpx;
  margin-right: 16rpx;
}
.m-name {
  font-size: 28rpx;
  font-weight: 600;
}
.m-rating {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}
.m-arrow {
  font-size: 24rpx;
  color: #999;
}
.services {
  padding: 20rpx 24rpx;
  justify-content: space-around;
}
.service {
  font-size: 24rpx;
  color: #666;
}
.detail-img {
  width: 100%;
  display: block;
  border-radius: 8rpx;
  margin-bottom: 12rpx;
}
.goods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  padding: 0 20rpx 20rpx;
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
  display: flex;
  align-items: flex-end;
}
.sku-panel {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx;
  box-sizing: border-box;
}
.sku-head {
  margin-bottom: 16rpx;
}
.sku-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: #f2f3f5;
  margin-right: 20rpx;
}
.sku-stock {
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
}
.sku-close {
  font-size: 36rpx;
  color: #999;
  padding: 8rpx;
}
.sku-scroll {
  max-height: 480rpx;
}
.sku-group-title {
  font-size: 26rpx;
  font-weight: 600;
  margin: 16rpx 0;
}
.sku-list {
  display: flex;
  flex-wrap: wrap;
}
.sku-item {
  padding: 14rpx 32rpx;
  border-radius: 12rpx;
  background: #f5f6f8;
  font-size: 26rpx;
  margin: 0 16rpx 16rpx 0;
  color: #333;
}
.sku-item.active {
  background: #ffecec;
  color: #ff4d4f;
  border: 2rpx solid #ff4d4f;
}
.stepper {
  display: flex;
  align-items: center;
  border: 2rpx solid #eee;
  border-radius: 8rpx;
  width: 200rpx;
}
.step-btn {
  width: 60rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
}
.qty {
  flex: 1;
  text-align: center;
  font-size: 28rpx;
}
.sku-footer {
  display: flex;
  margin-top: 24rpx;
}
.sku-btn {
  flex: 1;
  text-align: center;
  padding: 22rpx 0;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: 600;
}
.sku-btn.add {
  background: #fff0e6;
  color: #ff6b35;
  margin-right: 16rpx;
}
.sku-btn.buy {
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  color: #fff;
}
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 12rpx 20rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  z-index: 10;
}
.act-item {
  width: 96rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 20rpx;
  color: #666;
}
.act-btns {
  flex: 1;
  display: flex;
  margin-left: 16rpx;
}
.ab {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  font-weight: 600;
}
.ab.add {
  background: #fff0e6;
  color: #ff6b35;
  border-radius: 44rpx 0 0 44rpx;
}
.ab.buy {
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  color: #fff;
  border-radius: 0 44rpx 44rpx 0;
}
.loading-full {
  text-align: center;
  color: #999;
  padding: 200rpx 0;
}
</style>
