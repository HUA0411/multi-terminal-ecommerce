<template>
  <div class="admin-users">
    <div class="admin-card">
      <div class="admin-toolbar">
        <el-input v-model="keyword" placeholder="搜索昵称/手机号" clearable style="width:220px" @keyup.enter="onSearch" />
        <el-button type="primary" @click="onSearch">查询</el-button>
        <span class="tip" style="margin-left:auto">用户列表（GET /admin/users）</span>
      </div>
      <el-table :data="users" v-loading="loading" style="width:100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div class="u-cell">
              <el-avatar :size="34" :src="row.avatar" style="background:#409EFF">{{ (row.nickname || 'U').slice(0, 1) }}</el-avatar>
              <span>{{ row.nickname || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : row.role === 'merchant' ? 'warning' : 'info'" size="small">
              {{ roleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="points" label="积分" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'disabled' ? 'danger' : 'success'" size="small">
              {{ row.status === 'disabled' ? '已禁用' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              :type="row.status === 'disabled' ? 'success' : 'danger'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'disabled' ? '启用' : '禁用' }}
            </el-button>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '../../api'
import { formatTime } from '../../utils/format'

const users = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')
const loading = ref(false)

function roleText(role) {
  const map = { admin: '管理员', merchant: '商家', user: '买家' }
  return map[role] || role || '用户'
}

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    const data = await adminApi.users(params)
    users.value = data.list || []
    total.value = data.total || 0
  } catch {
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  load()
}

async function toggleStatus(row) {
  const disable = row.status !== 'disabled'
  await ElMessageBox.confirm(
    disable ? `确认禁用用户「${row.nickname}」？禁用后该用户将无法登录。` : `确认恢复用户「${row.nickname}」？`,
    '操作确认',
    { type: disable ? 'warning' : 'success' }
  )
  try {
    await adminApi.updateUserStatus(row.id, disable ? 'disabled' : 'active')
    ElMessage.success(disable ? '已禁用该用户' : '已启用该用户')
    load()
  } catch {
    /* 拦截器已提示 */
  }
}

onMounted(load)
</script>

<style scoped>
.u-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tip {
  color: #666;
  font-size: 13px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
}
</style>
