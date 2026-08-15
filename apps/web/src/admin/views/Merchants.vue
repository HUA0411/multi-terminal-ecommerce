<template>
  <div class="merchants">
    <div class="admin-card">
      <div class="admin-toolbar">
        <span class="tip">商家入驻审核（GET /admin/merchants）</span>
        <el-button style="margin-left:auto" @click="load">刷新</el-button>
      </div>
      <el-table :data="list" v-loading="loading" style="width:100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="店铺名称" min-width="160" />
        <el-table-column prop="contactName" label="联系人" width="110" />
        <el-table-column prop="contactPhone" label="联系电话" width="140" />
        <el-table-column prop="description" label="店铺描述" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending' || !row.status">
              <el-button link type="success" @click="review(row, true)">通过</el-button>
              <el-button link type="danger" @click="review(row, false)">驳回</el-button>
            </template>
            <span v-else class="muted">已处理</span>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!list.length && !loading" class="empty-tip">暂无商家申请</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { merchantApi } from '../../api'
import { formatTime } from '../../utils/format'

const list = ref([])
const loading = ref(false)

function statusTag(s) {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger' }
  return map[s] || 'info'
}

function statusText(s) {
  const map = { pending: '待审核', approved: '已通过', rejected: '已驳回' }
  return map[s] || s || '待审核'
}

async function load() {
  loading.value = true
  try {
    const data = await merchantApi.adminList()
    list.value = Array.isArray(data) ? data : data.list || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

async function review(row, approve) {
  await ElMessageBox.confirm(
    approve ? `确认通过商家「${row.name}」的入驻申请？` : `确认驳回商家「${row.name}」的入驻申请？`,
    '审核确认',
    { type: approve ? 'success' : 'warning' }
  )
  try {
    await merchantApi.review(row.id, approve)
    ElMessage.success(approve ? '已通过，商家可登录管理后台' : '已驳回')
    load()
  } catch {
    /* 拦截器已提示 */
  }
}

onMounted(load)
</script>

<style scoped>
.tip {
  color: #666;
  font-size: 13px;
}

.muted {
  color: #999;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px 0;
}
</style>
