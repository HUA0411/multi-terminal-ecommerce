<template>
  <div class="admin-risk">
    <div class="admin-card">
      <div class="card-title">风控规则（GET /admin/risk/rules）</div>
      <el-skeleton v-if="rulesLoading" :rows="3" animated />
      <el-table v-else :data="rules" style="width:100%">
        <el-table-column prop="key" label="规则 key" min-width="150" />
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
        <el-table-column label="窗口(ms)" width="110">
          <template #default="{ row }">{{ row.windowMs ?? row.window ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="阈值" width="90">
          <template #default="{ row }">{{ row.max ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="启用" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled === false ? 'info' : 'success'" size="small">
              {{ row.enabled === false ? '停用' : '启用' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!rules.length && !rulesLoading" class="empty-tip">暂无风控规则数据</div>
    </div>

    <div class="admin-card">
      <div class="card-title">风险事件审计（GET /admin/risk/events）</div>
      <div class="admin-toolbar">
        <span class="tip">事件列表</span>
        <el-button style="margin-left:auto" @click="loadEvents">刷新</el-button>
      </div>
      <JsonTable :rows="events" :loading="eventsLoading" />
      <div v-if="!events.length && !eventsLoading" class="empty-tip">暂无风险事件</div>
      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          :total="total"
          :page-size="pageSize"
          layout="total, prev, pager, next"
          background
          @current-change="loadEvents"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import JsonTable from '../../components/JsonTable.vue'
import { riskApi } from '../../api'

const rules = ref([])
const rulesLoading = ref(false)
const events = ref([])
const eventsLoading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

async function loadRules() {
  rulesLoading.value = true
  try {
    const data = await riskApi.rules()
    rules.value = Array.isArray(data) ? data : data.list || []
  } catch {
    rules.value = []
  } finally {
    rulesLoading.value = false
  }
}

async function loadEvents() {
  eventsLoading.value = true
  try {
    const data = await riskApi.events({ page: page.value, pageSize: pageSize.value })
    events.value = data.list || []
    total.value = data.total || 0
  } catch {
    events.value = []
    total.value = 0
  } finally {
    eventsLoading.value = false
  }
}

onMounted(() => {
  loadRules()
  loadEvents()
})
</script>

<style scoped>
.card-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
}

.tip {
  color: #666;
  font-size: 13px;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 30px 0;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}
</style>
