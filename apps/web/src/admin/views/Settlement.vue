<template>
  <div>
    <div class="page-head">
      <h3>商家对账报表（B2B/B2C）</h3>
      <el-radio-group v-model="days" size="small" style="margin-left:16px" @change="load">
        <el-radio-button :value="7">近 7 天</el-radio-button>
        <el-radio-button :value="30">近 30 天</el-radio-button>
        <el-radio-button :value="90">近 90 天</el-radio-button>
      </el-radio-group>
    </div>
    <div v-if="summary" class="summary-row">
      <div class="sum-card"><div class="l">成交订单</div><div class="v">{{ summary.orderCount }}</div></div>
      <div class="sum-card"><div class="l">总 GMV</div><div class="v">{{ formatPrice(summary.totalGmv) }}</div></div>
      <div class="sum-card"><div class="l">平台佣金</div><div class="v">{{ formatPrice(summary.totalCommission) }}</div></div>
      <div class="sum-card"><div class="l">商家净结算</div><div class="v">{{ formatPrice(summary.totalNet) }}</div></div>
    </div>
    <el-table :data="summary.merchants" v-loading="loading" style="width:100%;margin-top:14px">
      <el-table-column prop="merchantName" label="商家" min-width="160" />
      <el-table-column prop="orderCount" label="订单数" width="90" />
      <el-table-column label="GMV" width="120"><template #default="{ row }">{{ formatPrice(row.gmv) }}</template></el-table-column>
      <el-table-column label="佣金率" width="90"><template #default="{ row }">{{ (row.commissionRate * 100).toFixed(1) }}%</template></el-table-column>
      <el-table-column label="佣金" width="110"><template #default="{ row }">{{ formatPrice(row.commission) }}</template></el-table-column>
      <el-table-column label="净结算" width="120"><template #default="{ row }"><span style="color:#e1251b;font-weight:700">{{ formatPrice(row.net) }}</span></template></el-table-column>
    </el-table>
    <el-empty v-if="!loading && (!summary || !summary.merchants || !summary.merchants.length)" description="该时间段暂无成交" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue"
import { dashboardApi } from "../../api"
import { auth } from "../../stores/auth"
const role = auth.isAdmin ? "admin" : "merchant"
import { formatPrice } from "../../utils/format"

const days = ref(30)
const loading = ref(true)
const summary = reactive({ merchants: [], totalGmv: 0, totalCommission: 0, totalNet: 0, orderCount: 0 })

onMounted(load)

async function load() {
  loading.value = true
  try {
    const d = await dashboardApi.settlement(role, { days: days.value })
    Object.assign(summary, d || {})
  } catch {
    Object.assign(summary, { merchants: [], totalGmv: 0, totalCommission: 0, totalNet: 0, orderCount: 0 })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-head { display: flex; align-items: center; margin-bottom: 14px; }
.page-head h3 { margin: 0; font-size: 17px; }
.summary-row { display: flex; gap: 14px; }
.sum-card { flex: 1; background: #fff; border-radius: 10px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.l { font-size: 12px; color: #999; }
.v { font-size: 22px; font-weight: 700; color: #333; margin-top: 6px; }
</style>