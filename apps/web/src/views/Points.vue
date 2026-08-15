<template>
  <div class="points page-container">
    <div class="points-banner">
      <div class="points-balance">
        <div class="p-label">我的积分</div>
        <div class="p-num">{{ balance }}</div>
        <div class="p-tip">下单可得积分，积分可兑换好礼</div>
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
  loadLogs()
})
</script>

<style scoped>
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
