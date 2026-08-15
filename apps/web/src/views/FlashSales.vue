<template>
  <div class="flashsales page-container">
    <div class="flash-banner">
      <div class="flash-title">限时秒杀</div>
      <div class="countdown">
        <span style="color:#fff;margin-right:6px">本场剩余：</span>
        <span class="cd-cell">{{ countdownText(nowLeft) }}</span>
      </div>
    </div>
    <div class="page-panel">
      <el-skeleton v-if="loading" :rows="4" animated />
      <template v-else>
        <div v-if="sales.length" class="flash-grid">
          <div v-for="s in sales" :key="s.id" class="flash-card">
            <el-image :src="s.image" fit="cover" class="flash-img" @click="router.push(`/products/${s.productId}`)" />
            <div class="flash-body">
              <div class="f-name">{{ s.productName }}</div>
              <div class="f-price">
                <PriceText :cents="s.flashPrice" :currency="s.currency" :size="22" />
                <span class="f-origin">{{ formatPrice(s.originalPrice, s.currency) }}</span>
              </div>
              <div class="f-stock">
                <el-progress
                  :percentage="Math.min(Math.round((s.sold / Math.max(s.quota, 1)) * 100), 100)"
                  :stroke-width="8"
                  :show-text="false"
                  color="#e1251b"
                />
                <span class="f-stock-text">已抢 {{ s.sold }} / {{ s.quota }}</span>
              </div>
              <div class="f-countdown">距结束 <span class="cd-cell">{{ countdownText(endLeft(s)) }}</span></div>
              <el-button
                type="danger"
                style="width:100%;margin-top:10px"
                :disabled="!settings.seckillEnabled || endLeft(s) <= 0"
                @click="openSeckill(s)"
              >
                {{ endLeft(s) > 0 ? '立即抢购' : '已结束' }}
              </el-button>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无进行中的秒杀活动" />
      </template>
    </div>

    <!-- 秒杀确认 -->
    <el-dialog v-model="seckillDialog" title="秒杀抢购" width="440px">
      <template v-if="current">
        <div class="sk-product">
          <el-image :src="current.image" fit="cover" style="width:80px;height:80px;border-radius:8px" />
          <div>
            <div class="sk-name">{{ current.productName }}</div>
            <PriceText :cents="current.flashPrice" :currency="current.currency" :size="22" />
          </div>
        </div>
        <div class="sk-sku">
          <span class="sk-label">选择规格</span>
          <el-select v-model="seckillSkuId" placeholder="请选择规格" style="width:100%">
            <el-option v-for="s in skus" :key="s.id" :label="s.name || s.specValues || `规格 #${s.id}`" :value="s.id" />
          </el-select>
        </div>
        <el-alert type="warning" :closable="false" title="秒杀商品限购 1 件，请尽快下单" style="margin-top:10px" />
      </template>
      <template #footer>
        <el-button @click="seckillDialog = false">取消</el-button>
        <el-button type="danger" :loading="seckilling" @click="doSeckill">确认抢购</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PriceText from '../components/PriceText.vue'
import { flashsaleApi, productApi } from '../api'
import { settings } from '../stores/settings'
import { auth } from '../stores/auth'
import { formatPrice, countdownText } from '../utils/format'

const router = useRouter()
const sales = ref([])
const loading = ref(true)
const now = ref(Date.now())

const seckillDialog = ref(false)
const seckilling = ref(false)
const current = ref(null)
const skus = ref([])
const seckillSkuId = ref(null)

let timer = null

const nowLeft = computed(() => {
  const first = sales.value[0]
  if (!first) return 0
  return new Date(first.endAt).getTime() - now.value
})

function endLeft(s) {
  return new Date(s.endAt).getTime() - now.value
}

async function load() {
  loading.value = true
  try {
    const data = await flashsaleApi.list()
    sales.value = Array.isArray(data) ? data : []
  } catch {
    sales.value = []
  } finally {
    loading.value = false
  }
}

async function openSeckill(s) {
  if (!auth.isLogin) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: '/flashsales' } })
    return
  }
  current.value = s
  seckillSkuId.value = null
  skus.value = []
  seckillDialog.value = true
  try {
    const detail = await productApi.detail(s.productId)
    skus.value = detail.skus || []
    if (skus.value.length) seckillSkuId.value = skus.value[0].id
  } catch {
    skus.value = []
  }
}

async function doSeckill() {
  if (!seckillSkuId.value && skus.value.length) {
    ElMessage.warning('请选择规格')
    return
  }
  seckilling.value = true
  try {
    const data = await flashsaleApi.seckill(current.value.id, seckillSkuId.value || current.value.productId)
    ElMessage.success('抢购成功！请尽快完成支付')
    seckillDialog.value = false
    if (data.order?.id) {
      router.push(`/orders/${data.order.id}`)
    } else {
      router.push('/orders')
    }
  } catch {
    /* 拦截器已提示（频控/售罄） */
  } finally {
    seckilling.value = false
  }
}

onMounted(() => {
  load()
  timer = setInterval(() => (now.value = Date.now()), 1000)
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.flash-banner {
  background: linear-gradient(135deg, #e1251b, #ff5a3c);
  border-radius: 10px;
  padding: 22px 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 14px 0;
}

.flash-title {
  color: #fff;
  font-size: 26px;
  font-weight: 700;
}

.flash-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.flash-card {
  border: 1px solid #f0d0d0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.flash-img {
  width: 100%;
  height: 180px;
  cursor: pointer;
}

.flash-body {
  padding: 12px;
}

.f-name {
  font-size: 13px;
  margin-bottom: 8px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.f-price {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.f-origin {
  color: #999;
  text-decoration: line-through;
  font-size: 12px;
}

.f-stock {
  margin-bottom: 8px;
}

.f-stock-text {
  font-size: 12px;
  color: #999;
}

.f-countdown {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sk-product {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.sk-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.sk-sku {
  margin-top: 10px;
}

.sk-label {
  font-size: 13px;
  color: #666;
  display: block;
  margin-bottom: 6px;
}
</style>
