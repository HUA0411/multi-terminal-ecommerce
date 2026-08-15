<template>
  <div class="quotes page-container">
    <div class="page-panel">
      <div class="section-title"><span class="bar"></span><h3>我的询价单</h3></div>
      <el-skeleton v-if="loading" :rows="3" animated />
      <el-table v-else :data="list" style="width:100%">
        <el-table-column prop="rfqNo" label="询价单号" width="150" />
        <el-table-column prop="productName" label="商品" min-width="180" />
        <el-table-column label="数量" width="80"><template #default="{ row }">{{ row.quantity }}</template></el-table-column>
        <el-table-column label="目标价" width="100"><template #default="{ row }">{{ row.targetPrice ? formatPrice(row.targetPrice) : "-" }}</template></el-table-column>
        <el-table-column label="商家报价" width="110"><template #default="{ row }">{{ row.quotePrice ? formatPrice(row.quotePrice) : "-" }}</template></el-table-column>
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ row.statusText }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button v-if="row.status === 'quoted'" link type="primary" @click="accept(row)">接受报价</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !list.length" description="暂无询价单，可在商品详情页发起询价" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { quoteApi } from "../api"
import { formatPrice } from "../utils/format"

const list = ref([])
const loading = ref(true)

function statusType(s) { return { pending: "warning", quoted: "primary", accepted: "success", rejected: "danger" }[s] || "info" }

onMounted(async () => {
  try {
    const d = await quoteApi.mine()
    list.value = d.list || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
})

async function accept(row) {
  try {
    await quoteApi.accept(row.id)
    ElMessage.success("已接受报价")
    const d = await quoteApi.mine()
    list.value = d.list || []
  } catch (e) {
    ElMessage.error(e.message || "操作失败")
  }
}
</script>
