<template>
  <el-table :data="rows" v-loading="loading" size="small" border style="width:100%">
    <el-table-column
      v-for="col in columns"
      :key="col"
      :prop="col"
      :label="col"
      :min-width="col === 'detail' || col === 'reason' || col === 'data' || col === 'message' ? 200 : 120"
      show-overflow-tooltip
    >
      <template #default="{ row }">
        <el-tag v-if="typeof row[col] === 'boolean'" :type="row[col] ? 'success' : 'info'" size="small">{{ row[col] }}</el-tag>
        <span v-else>{{ cellText(row[col]) }}</span>
      </template>
    </el-table-column>
    <el-table-column v-if="!columns.length" label="暂无数据" />
  </el-table>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

// 依据数据动态生成列（防御未知字段结构）
const columns = computed(() => {
  const keys = new Set()
  props.rows.slice(0, 20).forEach((r) => {
    if (r && typeof r === 'object') Object.keys(r).forEach((k) => keys.add(k))
  })
  return [...keys]
})

function cellText(v) {
  if (v == null) return '-'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
</script>
