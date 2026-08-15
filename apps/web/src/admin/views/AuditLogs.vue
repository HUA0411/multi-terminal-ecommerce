<template>
  <div>
    <div class="page-head"><h3>操作审计日志</h3><span class="tip">管理员/商家管理操作全量留痕（仅平台管理员可见）</span></div>
    <el-table :data="list" v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="adminName" label="操作人" width="110" />
      <el-table-column prop="action" label="操作" width="160" />
      <el-table-column prop="target" label="对象" min-width="160" />
      <el-table-column prop="ip" label="IP" width="120" />
      <el-table-column label="时间" width="170"><template #default="{ row }">{{ (row.createdAt || "").replace("T", " ").slice(0, 19) }}</template></el-table-column>
    </el-table>
    <el-empty v-if="!loading && !list.length" description="暂无审计记录" />
    <div class="pager" style="margin-top:12px">
      <el-pagination v-model:current-page="page" :total="total" :page-size="pageSize" layout="total, prev, pager, next" background @current-change="load" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { quoteApi } from "../../api"

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(true)

onMounted(load)

async function load() {
  loading.value = true
  try {
    const d = await quoteApi.auditLogs({ page: page.value, pageSize: pageSize.value })
    list.value = d.list || []
    total.value = d.total || 0
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px; }
.page-head h3 { margin: 0; font-size: 17px; }
.tip { color: #999; font-size: 12px; }
</style>
