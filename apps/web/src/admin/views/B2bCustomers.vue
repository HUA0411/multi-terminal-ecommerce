<template>
  <div>
    <div class="page-head"><h3>B2B 客户管理</h3><span class="tip">批发客户在本店/全平台的采购概览</span></div>
    <el-table :data="list" v-loading="loading" style="width:100%">
      <el-table-column prop="nickname" label="客户" min-width="140" />
      <el-table-column prop="phone" label="手机号" width="140" />
      <el-table-column prop="orderCount" label="成交订单" width="100" />
      <el-table-column label="累计 GMV" width="140"><template #default="{ row }">{{ formatPrice(row.gmv) }}</template></el-table-column>
      <el-table-column label="最近采购" width="170"><template #default="{ row }">{{ row.lastOrderAt ? formatTime(row.lastOrderAt) : "-" }}</template></el-table-column>
    </el-table>
    <el-empty v-if="!loading && !list.length" description="暂无 B2B 批发客户采购记录" />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { adminApi } from "../../api"
import { formatPrice } from "../../utils/format"

const list = ref([])
const loading = ref(true)

function formatTime(s) { return (s || "").replace("T", " ").slice(0, 16) }

onMounted(async () => {
  try {
    const d = await adminApi.b2bCustomers()
    list.value = d.list || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px; }
.page-head h3 { margin: 0; font-size: 17px; }
.tip { color: #999; font-size: 12px; }
</style>
