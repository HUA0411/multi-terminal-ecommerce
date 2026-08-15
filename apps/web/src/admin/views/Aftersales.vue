<template>
  <div class="admin-aftersales">
    <div class="admin-card">
      <div class="admin-toolbar">
        <el-radio-group v-model="status" @change="onStatusChange">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="pending">待处理</el-radio-button>
          <el-radio-button value="approved">已同意</el-radio-button>
          <el-radio-button value="rejected">已驳回</el-radio-button>
        </el-radio-group>
        <el-button style="margin-left:auto" @click="load">刷新</el-button>
      </div>

      <el-alert
        type="info"
        :closable="false"
        title="说明：列表优先请求 GET /admin/aftersales；若后端未实现该接口，将回退展示 GET /aftersales（本账号售后单）。"
        style="margin-bottom:12px"
      />

      <el-table :data="list" v-loading="loading" style="width:100%">
        <el-table-column prop="id" label="售后单号" width="100" />
        <el-table-column prop="orderId" label="订单ID" width="90" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            {{ row.type === 'return_refund' ? '退货退款' : row.type === 'refund' ? '仅退款' : row.type || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="申请原因" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="!row.status || row.status === 'pending'">
              <el-button link type="success" @click="handle(row, true)">同意</el-button>
              <el-button link type="danger" @click="handle(row, false)">驳回</el-button>
            </template>
            <span v-else class="muted">已处理</span>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          :total="total"
          :page-size="pageSize"
          layout="total, prev, pager, next"
          background
          @current-change="load"
        />
      </div>
    </div>

    <!-- 处理对话框 -->
    <el-dialog v-model="handleDialog" :title="handleApprove ? '同意售后申请' : '驳回售后申请'" width="460px">
      <el-form label-width="80px">
        <el-form-item label="处理备注">
          <el-input v-model="handleNote" type="textarea" :rows="3" :placeholder="handleApprove ? '同意备注（选填）' : '请填写驳回原因'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleDialog = false">取消</el-button>
        <el-button :type="handleApprove ? 'success' : 'danger'" :loading="handling" @click="submitHandle">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { aftersaleApi } from '../../api'
import { formatTime } from '../../utils/format'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const status = ref('')
const loading = ref(false)

const handleDialog = ref(false)
const handleApprove = ref(true)
const handleNote = ref('')
const handleTarget = ref(null)
const handling = ref(false)

function statusTag(s) {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger', completed: 'info' }
  return map[s] || 'info'
}

function statusText(s) {
  const map = { pending: '待处理', approved: '已同意', rejected: '已驳回', completed: '已完成' }
  return map[s] || s || '待处理'
}

async function load() {
  loading.value = true
  try {
    // 优先管理端接口，未实现（501/404）时回退到用户售后单列表
    let data
    try {
      data = await aftersaleApi.adminList({ page: page.value, pageSize: pageSize.value })
    } catch {
      data = await aftersaleApi.list({ page: page.value, pageSize: pageSize.value })
    }
    list.value = data.list || []
    total.value = data.total || 0
    let filtered = list.value
    if (status.value) filtered = list.value.filter((x) => (x.status || 'pending') === status.value)
    list.value = filtered
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onStatusChange() {
  page.value = 1
  load()
}

function handle(row, approve) {
  handleTarget.value = row
  handleApprove.value = approve
  handleNote.value = ''
  handleDialog.value = true
}

async function submitHandle() {
  handling.value = true
  try {
    await aftersaleApi.handle(handleTarget.value.id, {
      approve: handleApprove.value,
      note: handleNote.value || undefined,
    })
    ElMessage.success(handleApprove.value ? '已同意该售后申请' : '已驳回该售后申请')
    handleDialog.value = false
    load()
  } catch {
    /* 拦截器已提示 */
  } finally {
    handling.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.muted {
  color: #999;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
}
</style>
