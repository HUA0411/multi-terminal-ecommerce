<template>
  <div class="coupons page-container">
    <div class="page-panel">
      <div class="section-title">
        <span class="bar"></span>
        <h3>领券中心</h3>
        <router-link class="more" to="/my/coupons">我的优惠券 &gt;</router-link>
      </div>
      <el-skeleton v-if="loading" :rows="4" animated />
      <template v-else>
        <div v-if="coupons.length" class="coupon-grid">
          <div v-for="c in coupons" :key="c.id" class="coupon-card">
            <div class="coupon-left">
              <div class="coupon-amount">
                <span class="sym">{{ currencySymbol(c.currency) }}</span>
                <span class="num">{{ (Number(c.amount) / 100).toFixed(0) }}</span>
              </div>
              <div class="coupon-condition">
                {{ conditionText(c) }}
              </div>
            </div>
            <div class="coupon-right">
              <div class="coupon-name">{{ c.name || c.title || '优惠券' }}</div>
              <div class="coupon-range">{{ c.scope || '全场通用' }}</div>
              <el-button size="small" type="danger" round :disabled="c.claimed" @click="claim(c)">
                {{ c.claimed ? '已领取' : '立即领取' }}
              </el-button>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无可领取的优惠券" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { couponApi } from '../api'
import { auth } from '../stores/auth'
import { currencySymbol } from '../stores/settings'

const router = useRouter()
const coupons = ref([])
const loading = ref(true)

function conditionText(c) {
  if (c.threshold && Number(c.threshold) > 0) {
    return `满 ${currencySymbol(c.currency)}${(Number(c.threshold) / 100).toFixed(0)} 可用`
  }
  return '无门槛'
}

async function claim(c) {
  if (!auth.isLogin) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: '/coupons' } })
    return
  }
  try {
    await couponApi.claim(c.id)
    c.claimed = true
    ElMessage.success('领取成功')
  } catch {
    /* 拦截器已提示（如已领取/频控） */
  }
}

onMounted(async () => {
  try {
    const data = await couponApi.available({ page: 1, pageSize: 50 })
    coupons.value = Array.isArray(data) ? data : data.list || []
  } catch {
    coupons.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.more {
  margin-left: auto;
  font-size: 13px;
  color: #999;
}

.coupon-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.coupon-card {
  display: flex;
  border: 1px solid #f0c8c8;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.coupon-left {
  width: 130px;
  background: linear-gradient(135deg, #e1251b, #ff6a3d);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  flex-shrink: 0;
}

.coupon-amount .sym {
  font-size: 14px;
}

.coupon-amount .num {
  font-size: 34px;
  font-weight: 700;
}

.coupon-condition {
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.9;
}

.coupon-right {
  flex: 1;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.coupon-name {
  font-weight: 600;
  font-size: 14px;
}

.coupon-range {
  font-size: 12px;
  color: #999;
  flex: 1;
}
</style>
