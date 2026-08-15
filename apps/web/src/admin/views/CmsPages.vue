<template>
  <div class="cms-pages">
    <div class="admin-card">
      <div class="admin-toolbar">
        <span class="tip">页面列表（GET /admin/cms/pages）· 门店首页使用 key = "home"</span>
        <el-button type="success" style="margin-left:auto" @click="router.push('/cms/editor')">+ 新建页面</el-button>
      </div>
      <el-table :data="pages" v-loading="loading" style="width:100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="key" label="页面 key" width="160">
          <template #default="{ row }">
            <el-tag size="small" :type="row.key === 'home' ? 'danger' : 'info'">{{ row.key }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column label="区块数" width="90">
          <template #default="{ row }">{{ (row.blocks || []).length }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
              {{ row.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/cms/editor/${row.id}`)">编辑</el-button>
            <el-button link type="success" :loading="publishingId === row.id" @click="publish(row)">发布</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!pages.length && !loading" class="empty-tip">暂无 CMS 页面</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { cmsApi, adminApi } from '../../api'
import { formatTime } from '../../utils/format'

const router = useRouter()
const pages = ref([])
const loading = ref(false)
const publishingId = ref(null)

async function load() {
  loading.value = true
  try {
    const data = await cmsApi.adminList()
    pages.value = Array.isArray(data) ? data : data.list || []
  } catch {
    pages.value = []
  } finally {
    loading.value = false
  }
}

async function publish(row) {
  publishingId.value = row.id
  try {
    await cmsApi.publish(row.id)
    ElMessage.success('页面已发布，门店端立即可见')
    load()
  } catch {
    /* 拦截器已提示 */
  } finally {
    publishingId.value = null
  }
}

async function remove(row) {
  await ElMessageBox.confirm(`确认删除页面「${row.title || row.key}」吗？`, '提示', { type: 'warning' })
  // 契约未提供删除接口，尝试 DELETE /admin/cms/pages/:id（后端若未实现会友好提示）
  try {
    await adminApi.removeCmsPage(row.id)
    ElMessage.success('已删除')
    load()
  } catch {
    /* 501/404 由拦截器提示 */
  }
}

onMounted(load)
</script>

<style scoped>
.tip {
  color: #666;
  font-size: 13px;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px 0;
}
</style>
