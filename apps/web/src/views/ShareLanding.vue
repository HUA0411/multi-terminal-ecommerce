<template>
  <div class="share-landing page-container">
    <div class="page-panel">
      <el-skeleton v-if="loading" :rows="5" animated />
      <template v-else-if="share">
        <div class="share-head">
          <el-avatar :size="56" :src="share.user?.avatar" style="background:#e1251b">
            {{ (share.user?.nickname || '友').slice(0, 1) }}
          </el-avatar>
          <div class="share-user">
            <div class="u-name">{{ share.user?.nickname || '好友' }} 分享了一件好物</div>
            <div class="u-tip">「{{ share.user?.nickname || 'TA' }}」邀请你一起购买</div>
          </div>
        </div>

        <div v-if="share.product" class="share-product" @click="router.push(`/products/${share.product.id}`)">
          <el-image :src="share.product.mainImage" fit="cover" class="sp-img" />
          <div class="sp-info">
            <div class="sp-name">{{ share.product.name }}</div>
            <div class="sp-sub">{{ share.product.subtitle }}</div>
            <div class="sp-price">
              <PriceText :cents="share.product.isFlash ? share.product.flashPrice : share.product.price" :currency="share.product.currency" :size="24" />
              <span v-if="share.product.isFlash" class="sp-flash">秒杀</span>
            </div>
            <el-button type="danger" style="margin-top:10px">查看商品详情</el-button>
          </div>
        </div>
        <el-empty v-else description="分享内容不存在或已下架" />
      </template>
      <div v-else class="empty-tip">分享链接无效</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PriceText from '../components/PriceText.vue'
import { shareApi } from '../api'

const route = useRoute()
const router = useRouter()

const share = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    share.value = await shareApi.get(route.params.code)
  } catch {
    share.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.share-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.u-name {
  font-size: 16px;
  font-weight: 600;
}

.u-tip {
  color: #999;
  font-size: 13px;
  margin-top: 4px;
}

.share-product {
  display: flex;
  gap: 18px;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 18px;
  cursor: pointer;
}

.sp-img {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  flex-shrink: 0;
}

.sp-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
}

.sp-sub {
  color: #999;
  font-size: 13px;
  margin-bottom: 10px;
}

.sp-price {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sp-flash {
  background: #e1251b;
  color: #fff;
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 3px;
}
</style>
