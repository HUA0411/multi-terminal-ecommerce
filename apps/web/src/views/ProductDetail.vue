<template>
  <div class="product-detail page-container">
    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else-if="product">
      <div class="detail-panel">
        <div class="gallery">
          <el-image class="main-img" :src="mainImage" fit="cover" :preview-src-list="images" preview-teleported />
          <div class="thumbs">
            <el-image
              v-for="(img, i) in images"
              :key="i"
              :src="img"
              fit="cover"
              class="thumb"
              :class="{ active: img === mainImage }"
              @click="mainImage = img"
            />
          </div>
        </div>
        <div class="info">
          <h1 class="name">{{ product.name }}</h1>
          <div class="subtitle">{{ product.subtitle }}</div>
          <div class="price-box">
            <div class="price-row">
              <span class="p-label">价格</span>
              <PriceText v-if="isFlash" :cents="product.flashPrice" :currency="product.currency" :size="30" />
              <PriceText v-else :cents="skuPrice" :currency="product.currency" :size="30" />
              <el-tag v-if="isFlash" type="danger" size="small" style="margin-left:10px">秒杀价</el-tag>
            </div>
            <div v-if="isFlash" class="price-row">
              <span class="p-label">原价</span>
              <span class="origin-price">{{ formatPrice(product.price, product.currency) }}</span>
            </div>
          </div>
          <div class="meta-row">
            <span>销量 {{ product.sales ?? 0 }}</span>
            <span>库存 {{ selectedSku?.stock ?? product.stock ?? 0 }}</span>
            <span>评分 {{ (product.rating ?? 5).toFixed(1) }}</span>
          </div>
          <div class="meta-row">
            <span>店铺：<router-link :to="`/products?merchantId=${product.merchantId}`" class="merchant-link">{{ product.merchantName || '官方店铺' }}</router-link></span>
            <el-tag v-for="(tag, i) in product.tags || []" :key="i" size="small" style="margin-left:6px">{{ tag }}</el-tag>
            <el-tag v-if="wholesaleTiers.length" type="warning" size="small" style="margin-left:6px">B2B 批发</el-tag>
          </div>

          <div v-if="wholesaleTiers.length" class="tier-section">
            <div class="tier-title">批发阶梯价（B2B）</div>
            <div class="tier-table">
              <div v-for="t in wholesaleTiers" :key="t.minQuantity" class="tier-row">
                <span>满 {{ t.minQuantity }} 件</span>
                <span class="tier-price">{{ formatPrice(t.price, product.currency) }}/件</span>
              </div>
            </div>
          </div>

          <div v-if="skus.length" class="sku-box">
            <div class="sku-label">选择规格</div>
            <el-radio-group v-model="selectedSkuId" class="sku-group">
              <el-radio-button v-for="s in skus" :key="s.id" :value="s.id">
                {{ s.name || s.specValues || `规格 #${s.id}` }}
              </el-radio-button>
            </el-radio-group>
          </div>

          <div class="qty-row">
            <span class="sku-label">数量</span>
            <el-input-number v-model="quantity" :min="1" :max="Math.max(selectedSku?.stock ?? product.stock ?? 99, 1)" />
          </div>

          <div class="action-row">
            <el-button type="danger" size="large" @click="buyNow">立即购买</el-button>
            <el-button size="large" @click="addCart">加入购物车</el-button>
            <el-button size="large" @click="goFitting"><el-icon style="vertical-align:-2px"><MagicStick /></el-icon> 虚拟试衣</el-button>
            <el-button size="large" @click="doShare"><el-icon style="vertical-align:-2px"><Share /></el-icon> 分享</el-button>
          </div>
        </div>
      </div>

      <div class="recommend-panel">
        <div class="section-title">
          <span class="bar"></span>
          <h3>看了又看</h3>
        </div>
        <div class="goods-grid">
          <ProductCard v-for="p in recommendations" :key="p.id" :product="p" />
        </div>
        <div v-if="!recommendations.length" class="empty-tip">暂无推荐</div>
      </div>
    </template>
    <div v-else class="empty-tip page-panel">商品不存在或已下架</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ProductCard from '../components/ProductCard.vue'
import PriceText from '../components/PriceText.vue'
import { productApi, cartApi, shareApi, recommendApi } from '../api'
import { settings } from '../stores/settings'
import { refreshCart } from '../stores/cart'
import { auth } from '../stores/auth'
import { formatPrice } from '../utils/format'

const route = useRoute()
const router = useRouter()

const product = ref(null)
const loading = ref(true)
const mainImage = ref('')
const selectedSkuId = ref(null)
const quantity = ref(1)
const recommendations = ref([])

const productId = computed(() => route.params.id)

const images = computed(() => {
  const list = product.value?.images?.length ? product.value.images : product.value?.mainImage ? [product.value.mainImage] : []
  return list
})

const skus = computed(() => product.value?.skus || [])

const selectedSku = computed(() => skus.value.find((s) => s.id === selectedSkuId.value) || null)

const skuPrice = computed(() => selectedSku.value?.price ?? product.value?.price ?? 0)

const isFlash = computed(() => !!product.value?.isFlash && product.value.flashPrice != null)
const wholesaleTiers = computed(() => (product.value?.wholesaleTiers || []).slice().sort((a, b) => a.minQuantity - b.minQuantity))

async function load() {
  loading.value = true
  try {
    const data = await productApi.detail(productId.value, { currency: settings.currency || settings.defaultCurrency })
    product.value = data
    mainImage.value = images.value[0] || ''
    if (skus.value.length) selectedSkuId.value = skus.value[0].id
    quantity.value = 1
    recommendations.value = Array.isArray(data.recommendations) ? data.recommendations : []
    if (!recommendations.value.length) {
      try {
        const rec = await recommendApi.get({ scene: 'detail', productId: productId.value, limit: 4 })
        recommendations.value = Array.isArray(rec) ? rec : rec.list || []
      } catch {
        recommendations.value = []
      }
    }
  } catch {
    product.value = null
  } finally {
    loading.value = false
  }
}

async function addCart() {
  if (!auth.isLogin) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!selectedSku.value && skus.value.length) {
    ElMessage.warning('请选择商品规格')
    return
  }
  const skuId = selectedSku.value ? selectedSku.value.id : product.value.id
  try {
    await cartApi.add({ skuId, quantity: quantity.value, checked: true })
    await refreshCart(settings.currency)
    ElMessage.success('已加入购物车')
  } catch {
    /* 拦截器已提示 */
  }
}

async function buyNow() {
  if (!auth.isLogin) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!selectedSku.value && skus.value.length) {
    ElMessage.warning('请选择商品规格')
    return
  }
  const skuId = selectedSku.value ? selectedSku.value.id : product.value.id
  await cartApi.add({ skuId, quantity: quantity.value, checked: true })
  await refreshCart(settings.currency)
  router.push('/checkout')
}

function goFitting() {
  router.push(`/fitting/${productId.value}`)
}

async function doShare() {
  try {
    const data = await shareApi.create({ type: 'product', refId: Number(productId.value) })
    const shareUrl = `${window.location.origin}/s/${data.code}`
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      /* 剪贴板不可用时降级 */
    }
    ElMessage.success(`分享链接已生成：${shareUrl}`)
  } catch {
    /* 拦截器已提示 */
  }
}

watch(productId, load)
onMounted(load)
</script>

<style scoped>
.detail-panel {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  gap: 30px;
  margin-top: 14px;
}

.gallery {
  width: 420px;
  flex-shrink: 0;
}

.main-img {
  width: 420px;
  height: 420px;
  border-radius: 8px;
  display: block;
}

.thumbs {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.thumb {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
}

.thumb.active {
  border-color: #e1251b;
}

.info {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 22px;
  margin: 0 0 6px;
}

.subtitle {
  color: #999;
  font-size: 13px;
  margin-bottom: 14px;
}

.price-box {
  background: #fff5f5;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 14px;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.price-row:last-child {
  margin-bottom: 0;
}

.p-label {
  color: #999;
  font-size: 13px;
  width: 40px;
}

.origin-price {
  color: #999;
  text-decoration: line-through;
  font-size: 14px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #666;
  font-size: 13px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.tier-section { margin: 12px 0; padding: 12px 16px; background: #fffbe6; border-radius: 8px; }
.tier-title { font-size: 13px; font-weight: 600; color: #b88230; margin-bottom: 8px; }
.tier-table { display: flex; gap: 10px; flex-wrap: wrap; }
.tier-row { font-size: 12px; color: #8a6a2f; background: #fff; border: 1px solid #f0e0b8; border-radius: 6px; padding: 6px 12px; }
.tier-price { color: #e1251b; font-weight: 700; }
.merchant-link {
  color: #409eff;
}

.sku-box,
.qty-row {
  margin-bottom: 16px;
}

.sku-label {
  color: #666;
  font-size: 13px;
  margin-bottom: 8px;
  display: block;
}

.sku-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.action-row {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.recommend-panel {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-top: 16px;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
</style>