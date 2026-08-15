<template>
  <view class="shop-page">
    <view v-if="merchant" class="shop-head card">
      <image class="shop-logo" :src="merchant.logo || 'https://picsum.photos/seed/merchant/200/200'" mode="aspectFill" />
      <view class="shop-info flex-1">
        <view class="shop-name">{{ merchant.name }}</view>
        <view class="shop-rating">评分 {{ merchant.rating || "-" }} · 在售 {{ merchant.productCount }} 件</view>
        <view class="shop-desc">{{ merchant.description }}</view>
      </view>
    </view>
    <view v-if="loading" class="tip">加载中...</view>
    <view v-else-if="products.length" class="goods-grid">
      <ProductCard v-for="p in products" :key="p.id" :product="p" />
    </view>
    <EmptyState v-else :icon="'\u{1F6CD}'" :text="'该店铺暂无在售商品'" />
  </view>
</template>

<script setup>
import { ref } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import ProductCard from "@/components/ProductCard.vue"
import EmptyState from "@/components/EmptyState.vue"
import { merchantApi } from "@/api"

const merchant = ref(null)
const products = ref([])
const loading = ref(true)

onLoad((query) => {
  const id = query.id
  if (!id) { uni.showToast({ title: "缺少店铺ID", icon: "none" }); return }
  loadMerchant(id)
})

async function loadMerchant(id) {
  loading.value = true
  try {
    const data = await merchantApi.detail(id)
    merchant.value = data
    products.value = (data && data.products) || []
  } catch (e) {
    uni.showToast({ title: e.message || "加载失败", icon: "none" })
  } finally { loading.value = false }
}
</script>

<style lang="scss" scoped>
.shop-page { padding: 20rpx; }
.shop-head { display: flex; align-items: center; padding: 24rpx; margin-bottom: 20rpx; }
.shop-logo { width: 110rpx; height: 110rpx; border-radius: 16rpx; margin-right: 24rpx; background: #f0f0f0; }
.shop-info { min-width: 0; }
.shop-name { font-size: 32rpx; font-weight: 700; color: #333; }
.shop-rating { font-size: 24rpx; color: #e6a23c; margin: 6rpx 0; }
.shop-desc { font-size: 24rpx; color: #888; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.goods-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.tip { text-align: center; color: #aaa; font-size: 24rpx; padding: 40rpx 0; }
</style>
