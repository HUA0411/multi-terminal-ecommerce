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
    <view v-if="wholesaleTiers.length" class="card tier-card">
      <view class="tier-title">批发阶梯价（B2B）</view>
      <view class="tier-row" v-for="t in wholesaleTiers" :key="t.minQuantity">
        <text>满 {{ t.minQuantity }} 件</text>
        <text class="tier-price">{{ symbol }}{{ yuan(t.price) }}/件</text>
      </view>
    </view>
    <view class="card services flex">
      <view class="service" @click="goFitting">👗 虚拟试衣</view>
      <view class="service" @click="toggleFav" :class="{ faved: favorited }">{{ favorited ? "❤️ 已收藏" : "🤍 收藏" }}</view>
      <view v-if="product.grouponPrice" class="service" @click="openGroupon">👥 拼团</view>
      <view class="service" @click="openQuote">📋 询价</view>
      <view class="service">🔄 7天无理由</view>
    </view>

    <!-- 商品详情 -->
    <view class="card" v-if="product.images && product.images.length > 1">
      <view class="section-title">商品详情</view>
      <image v-for="(img, i) in product.images" :key="i" class="detail-img" :src="img" mode="widthFix" />
    </view>


    <!-- 拼团 -->
    <view v-if="grouponDialog" class="mask" @click="grouponDialog = false">
      <view class="sku-panel" @click.stop>
        <view class="sku-head flex"><text class="b2b-title">开团（拼团价 {{ yuan(product.grouponPrice) }}）</text><text class="sku-close" @click="grouponDialog = false">✕</text></view>
        <view class="sku-row">目标人数：<input class="qty-input" type="number" v-model="grouponSize" /></view>
        <view class="sku-row">有效时长(时)：<input class="qty-input" type="number" v-model="grouponHours" /></view>
        <view class="submit-btn" @click="submitGroupon">开团</view>
      </view>
    </view>

    <!-- B2B 询价 -->
    <view v-if="quoteDialog" class="mask" @click="quoteDialog = false">
      <view class="sku-panel" @click.stop>
        <view class="sku-head flex"><text class="b2b-title">B2B 询价</text><text class="sku-close" @click="quoteDialog = false">✕</text></view>
        <view class="sku-row">商品：{{ product.name }}</view>
        <view class="sku-row">数量：<input class="qty-input" type="number" v-model="quoteQty" /></view>
        <view class="sku-row">目标单价(元)：<input class="qty-input" type="number" v-model="quotePrice" placeholder="选填" /></view>
        <view class="sku-row">备注：<textarea class="review-input" v-model="quoteNote" placeholder="批量采购需求" /></view>
        <view class="submit-btn" @click="submitQuote">提交询价</view>
      </view>
    </view>

    <!-- 商品评价 -->
    <view class="card" v-if="reviews.length || canReview">
      <view class="section-title">商品评价（{{ reviewCount }}）</view>
      <view v-if="reviews.length" class="review-list">
        <view class="review-item" v-for="rv in reviews" :key="rv.id">
          <view class="flex">
            <text class="rv-name">{{ rv.nickname }}</text>
            <text class="rv-rating">{{ stars(rv.rating) }}</text>
          </view>
          <view class="rv-content">{{ rv.content }}</view>
        </view>
      </view>
      <view v-else class="empty-tip">暂无评价</view>
      <view v-if="canReview" class="review-form">
        <view class="review-label">我的评价</view>
        <view class="stars" @click="cycleRating"><text>{{ stars(myRating) }}</text></view>
        <textarea class="review-input" v-model="myReview" placeholder="说说使用感受..." maxlength="500" />
        <view class="submit-btn" @click="submitReview">发表评价</view>
      </view>
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
import { productApi, cartApi, reviewApi, favoriteApi, quoteApi, grouponApi } from '@/api'
import { store, requireLogin, setCartCount } from '@/store'
import { addGuestItem } from '@/utils/guestCart'
import { fenToYuan } from '@/utils/format'

const product = ref(null)
const recommendations = ref([])
const showSku = ref(false)
const skuAction = ref('cart')
const selectedSku = ref(null)
const qty = ref(1)
const favorited = ref(false)
const reviews = ref([])
const reviewCount = ref(0)
const canReview = ref(false)
const myRating = ref(5)
const myReview = ref('')

function stars(n) { return '★'.repeat(Math.max(1, Math.min(5, Number(n) || 1))) }
function cycleRating() { myRating.value = myRating.value >= 5 ? 1 : myRating.value + 1 }

async function toggleFav() {
  if (!requireLogin()) return
  try {
    if (favorited.value) { await favoriteApi.remove(product.value.id); favorited.value = false; uni.showToast({ title: '已取消收藏', icon: 'none' }) }
    else { await favoriteApi.add(product.value.id); favorited.value = true; uni.showToast({ title: '已收藏', icon: 'success' }) }
  } catch (e) { uni.showToast({ title: e.message || '操作失败', icon: 'none' }) }
}

async function loadReviews() {
  try {
    const d = await reviewApi.list(product.value.id)
    reviews.value = (d && d.list) || []
    reviewCount.value = (d && d.reviewCount) || 0
    canReview.value = !!requireLogin()
  } catch { }
}

const grouponDialog = ref(false)
const grouponSize = ref(3)
const grouponHours = ref(24)

function openGroupon() {
  if (!requireLogin()) return
  grouponDialog.value = true
}

async function submitGroupon() {
  try {
    const d = await grouponApi.create({ productId: product.value.id, targetSize: Number(grouponSize.value) || 3, hours: Number(grouponHours.value) || 24 })
    uni.showToast({ title: '开团成功：' + d.groupon.grouponNo, icon: 'none' })
    grouponDialog.value = false
  } catch (e) { uni.showToast({ title: e.message || '开团失败', icon: 'none' }) }
}

const quoteDialog = ref(false)
const quoteQty = ref(10)
const quotePrice = ref('')
const quoteNote = ref('')

function openQuote() {
  if (!requireLogin()) return
  quoteDialog.value = true
}

async function submitQuote() {
  try {
    const d = await quoteApi.create({ productId: product.value.id, quantity: Number(quoteQty.value) || 1, targetPrice: quotePrice.value ? Math.round(Number(quotePrice.value) * 100) : undefined, note: quoteNote.value })
    uni.showToast({ title: '询价已提交：' + d.rfqNo, icon: 'none' })
    quoteDialog.value = false
    quoteNote.value = ''
  } catch (e) { uni.showToast({ title: e.message || '提交失败', icon: 'none' }) }
}

async function submitReview() {
  try {
    await reviewApi.create(product.value.id, { rating: myRating.value, content: myReview.value })
    uni.showToast({ title: '评价成功', icon: 'success' })
    myReview.value = ''
    loadReviews()
  } catch (e) { uni.showToast({ title: e.message || '评价失败', icon: 'none' }) }
}

const images = computed(() => {
  if (!product.value) return []
  const imgs = (product.value.images && product.value.images.length ? product.value.images : [product.value.mainImage]).filter(Boolean)
  return imgs.length ? imgs : ['/static/placeholder.png']
})

const wholesaleTiers = computed(() => (product.value?.wholesaleTiers || []).slice().sort((a, b) => a.minQuantity - b.minQuantity))
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
    loadReviews()
    if (requireLogin()) { try { const favs = await favoriteApi.list(); favorited.value = favs.some((f) => f.productId === product.value.id) } catch {} }
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
  const mid = product.value.merchant?.id || product.value.merchantId
  if (mid) uni.navigateTo({ url: '/pages/merchant/shop?id=' + mid })
  else uni.showToast({ title: '暂无店铺信息', icon: 'none' })
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
.tier-card { padding: 20rpx 24rpx; margin-bottom: 20rpx; }
.tier-title { font-size: 26rpx; font-weight: 700; color: #b88230; margin-bottom: 12rpx; }
.tier-row { display: flex; justify-content: space-between; font-size: 24rpx; color: #8a6a2f; line-height: 1.9; }
.tier-price { color: #ff4d4f; font-weight: 700; }
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
.review-list { padding-top: 8rpx; }
.review-item { padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.rv-name { font-size: 26rpx; color: #333; font-weight: 600; }
.rv-rating { font-size: 24rpx; color: #ffb400; margin-left: 16rpx; }
.rv-content { font-size: 26rpx; color: #555; line-height: 1.6; margin-top: 6rpx; }
.review-form { margin-top: 20rpx; }
.review-label { font-size: 26rpx; color: #666; margin-bottom: 8rpx; }
.stars { font-size: 40rpx; color: #ffb400; padding: 8rpx 0; }
.review-input { width: 100%; min-height: 120rpx; background: #f7f8fa; border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; box-sizing: border-box; }
.submit-btn { margin-top: 16rpx; background: #ff4d4f; color: #fff; text-align: center; padding: 16rpx 0; border-radius: 40rpx; font-size: 28rpx; }
.service.faved { color: #ff4d4f; }
.sku-row { font-size: 26rpx; color: #333; margin: 14rpx 0; display: flex; align-items: center; }
.sku-row .qty-input { flex: 1; margin-left: 16rpx; background: #f7f8fa; border-radius: 8rpx; padding: 10rpx 16rpx; font-size: 26rpx; }
.b2b-title { font-size: 30rpx; font-weight: 700; }
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