<template>
  <div class="my-coupons page-container">
    <div class="page-panel">
      <div class="section-title">
        <span class="bar"></span>
        <h3>我的优惠券</h3>
        <router-link class="more" to="/coupons">去领券 &gt;</router-link>
      </div>
      <el-tabs v-model="status" @tab-change="onTabChange">
        <el-tab-pane label="未使用" name="unused" />
        <el-tab-pane label="已使用" name="used" />
        <el-tab-pane label="已过期" name="expired" />
      </el-tabs>
      <el-skeleton v-if="loading" :rows="4" animated />
      <template v-else>
        <div v-if="coupons.length" class="coupon-grid">
          <div v-for="c in coupons" :key="c.id" class="coupon-card" :class="{ disabled: status !== 'unused' }">
            <div class="coupon-left">
              <div class="coupon-amount">
                <span class="sym">{{ currencySymbol(c.currency) }}</span>
                <span class="num">{{ (Number(c.amount) / 100).toFixed(0) }}</span>
              </div>
              <div class="coupon-condition">{{ conditionText(c) }}</div>
            </div>
            <div class="coupon-right">
              <div class="coupon-name">{{ c.name || c.title || '优惠券' }}</div>
              <div class="coupon-time">有效期至：{{ formatDate(c.expireAt || c.expiresAt || c.endAt) }}</div>
              <el-tag size="small" :type="status === 'unused' ? 'success' : 'info'">
                {{ status === 'unused' ? '可用' : status === 'used' ? '已使用' : '已过期' }}
              </el-tag>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无优惠券" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { couponApi } from '../api'
import { currencySymbol } from '../stores/settings'
import { formatDate } from '../utils/format'

const status = ref('unused')
const coupons = ref([])
const loading = ref(false)

function conditionText(c) {
  if (c.threshold && Number(c.threshold) > 0) {
    return `满 ${currencySymbol(c.currency)}${(Number(c.threshold) / 100).toFixed(0)} 可用`
  }
  return '无门槛'
}

async function load() {
  loading.value = true
  try {
    const data = await couponApi.mine({ status: status.value })
    coupons.value = Array.isArray(data) ? data : data.list || []
  } catch {
    coupons.value = []
  } finally {
    loading.value = false
  }
}

function onTabChange() {
  load()
}

onMounted(load)
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
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.coupon-card.disabled {
  filter: grayscale(0.9);
  opacity: 0.75;
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
  font-size: 32px;
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

.coupon-time {
  font-size: 12px;
  color: #999;
  flex: 1;
}
</style>
