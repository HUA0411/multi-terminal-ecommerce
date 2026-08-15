<template>
  <div>
    <div class="page-head"><h3>询价管理（RFQ）</h3><span class="tip">B2B 买家询价单，商家可报价</span></div>
    <el-table :data="list" v-loading="loading" style="width:100%">
      <el-table-column prop="rfqNo" label="单号" width="140" />
      <el-table-column prop="productName" label="商品" min-width="160" />
      <el-table-column prop="buyerName" label="买家" width="100" />
      <el-table-column label="数量" width="80"><template #default="{ row }">{{ row.quantity }}</template></el-table-column>
      <el-table-column label="目标价" width="100"><template #default="{ row }">{{ row.targetPrice ? "¥" + (row.targetPrice / 100).toFixed(2) : "-" }}</template></el-table-column>
      <el-table-column label="报价" width="100"><template #default="{ row }">{{ row.quotePrice ? "¥" + (row.quotePrice / 100).toFixed(2) : "-" }}</template></el-table-column>
      <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ row.statusText }}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="110">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" link type="primary" @click="openQuote(row)">报价</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && !list.length" description="暂无询价单" />
    <el-dialog v-model="quoteDialog" title="商家报价" width="400px">
      <div style="margin-bottom:12px">{{ current.rfqNo }} · {{ current.productName }} × {{ current.quantity }}</div>
      <el-form label-width="80px">
        <el-form-item label="单价(元)"><el-input-number v-model="quotePriceYuan" :min="0.01" :precision="2" :controls="false" style="width:100%" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="quoteNote" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quoteDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitQuote">提交报价</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { ElMessage } from "element-plus"
import { quoteApi } from "../../api"

const list = ref([])
const loading = ref(true)
const quoteDialog = ref(false)
const current = ref({})
const quotePriceYuan = ref(0)
const quoteNote = ref("")
const saving = ref(false)

function statusType(s) { return { pending: "warning", quoted: "primary", accepted: "success", rejected: "danger" }[s] || "info" }

onMounted(load)

async function load() {
  loading.value = true
  try {
    const d = await quoteApi.adminList()
    list.value = d.list || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function openQuote(row) {
  current.value = row
  quotePriceYuan.value = row.targetPrice ? row.targetPrice / 100 : 0
  quoteDialog.value = true
}

async function submitQuote() {
  saving.value = true
  try {
    await quoteApi.adminQuote(current.value.id, { price: Math.round(quotePriceYuan.value * 100), note: quoteNote.value })
    ElMessage.success("报价成功")
    quoteDialog.value = false
    load()
  } catch (e) {
    ElMessage.error(e.message || "报价失败")
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px; }
.page-head h3 { margin: 0; font-size: 17px; }
.tip { color: #999; font-size: 12px; }
</style>
