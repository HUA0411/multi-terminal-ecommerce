<template>
  <view class="fav-page">
    <view v-if="list.length" class="goods-grid">
      <ProductCard v-for="f in list" :key="f.id" :product="f.product" />
    </view>
    <EmptyState v-else :icon="'\u{1F49B}'" :text="'暂无收藏'" />
  </view>
</template>

<script setup>
import { ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import ProductCard from "@/components/ProductCard.vue"
import EmptyState from "@/components/EmptyState.vue"
import { favoriteApi } from "@/api"
import { requireLogin } from "@/store"

const list = ref([])

onShow(() => { if (requireLogin()) load() })

async function load() {
  try {
    const data = await favoriteApi.list()
    list.value = (data && data.filter((f) => f.product)) || []
  } catch (e) {
    uni.showToast({ title: e.message || "加载失败", icon: "none" })
  }
}
</script>

<style lang="scss" scoped>
.fav-page { padding: 20rpx; }
.goods-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
</style>
