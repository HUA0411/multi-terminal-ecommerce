<template>
  <div class="points page-container">
    <div class="points-banner">
      <div class="points-balance">
        <div class="p-label">我的积分</div>
        <div class="p-num">{{ balance }}</div>
        <div class="p-tip">下单可得积分，积分可兑换好礼</div>
      </div>
    </div>
    <div v-if="products.length" class="page-panel">
      <div class="section-title">
        <span class="bar"></span>
        <h3>积分商城</h3>
      </div>
      <div class="mall-grid">
        <div v-for="p in products" :key="p.id" class="mall-item">
          <img :src="p.image" class="mall-img" alt="" />
          <div class="mall-name">{{ p.name }}</div>
          <div class="mall-points">{{ p.points }} 积分</div>
          <el-button size="small" type="danger" :disabled="balance < p.points || p.stock <= 0" @click="redeem(p)">
            {{ balance >= p.points && p.stock > 0 ? '立即兑换' : '积分不足' }}
          </el-button>
        </div>
      </div>
    </div>
    <div class="page-panel">
      <div class="section-title">
        <span class="bar"></span>
        <h3>积分明细</h3>
      </div>
      <el-skeleton v-if="loading" :rows="4" animated />
      <template v-else>
        <el-table :data="logs" style="width:100%">
          <el-table-column label="积分变动" width="140">
            <template #default="{ row }">
              <span :style="{ color: row.points > 0 ? '#67C23A' : '#F56C6C', fontWeight: 600 }">
                {{ row.points > 0 ? '+' : '' }}{{ row.points }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="说明" min-width="220" />
          <el-table-column label="时间" width="180">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!logs.length && !loading" description="暂无积分记录" />
        <div class="pager">
          <el-pagination
            v-model:current-page="page"
            :total="total"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            background
            @current-change="loadLogs"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { pointApi } from '../api'
import { formatTime } from '../utils/format'

const balance = ref(0)
const logs = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const products = ref([])

async function loadProducts() {
  try {
    const d = await pointApi.products()
    products.value = Array.isArray(d) ? d : []
  } catch {
    products.value = []
  }
}

async function redeem(p) {
  try {
    const d = await pointApi.redeem({ productId: p.id, quantity: 1 })
    ElMessage.success('兑换成功！兑换码：' + d.code)
    loadBalance()
    loadProducts()
  } catch (e) {
    ElMessage.error(e.message || '兑换失败')
  }
}

async function loadBalance() {
  try {
    const d = await pointApi.balance()
    balance.value = d?.balance ?? 0
  } catch {
    balance.value = 0
  }
}

async function loadLogs() {
  loading.value = true
  try {
    const data = await pointApi.logs({ page: page.value, pageSize: pageSize.value })
    logs.value = Array.isArray(data) ? data : data.list || []
    total.value = data.total || 0
  } catch {
    logs.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadBalance()
  loadProducts()
  loadLogs()
})
</script>

<style scoped>
.mall-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.mall-item { border: 1px solid #f0f0f0; border-radius: 10px; padding: 12px; text-align: center; }
.mall-img { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; background: #f5f5f5; }
.mall-name { font-size: 13px; color: #333; margin: 8px 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mall-points { font-size: 14px; color: #e1251b; font-weight: 700; margin-bottom: 8px; }
.points-banner {
  background: linear-gradient(135deg, #f5b041, #f39c12);
  border-radius: 10px;
  padding: 30px;
  color: #fff;
  margin: 14px 0;
}

.points-balance .p-label {
  font-size: 14px;
  opacity: 0.9;
}

.points-balance .p-num {
  font-size: 44px;
  font-weight: 700;
  margin: 6px 0;
}

.points-balance .p-tip {
  font-size: 13px;
  opacity: 0.85;
}

.pager {
  display: flex;
  justify-content: center;
  padding-top: 12px;
}
</style>