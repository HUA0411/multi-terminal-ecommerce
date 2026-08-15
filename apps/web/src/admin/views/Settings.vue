<template>
  <div class="admin-settings">
    <div class="admin-card">
      <div class="card-title">门店基础设置（GET /settings/public）</div>
      <el-skeleton v-if="!settings.loaded" :rows="4" animated />
      <el-descriptions v-else :column="2" border>
        <el-descriptions-item label="店铺名称">{{ settings.storeName }}</el-descriptions-item>
        <el-descriptions-item label="Logo">
          <el-image v-if="settings.logo" :src="settings.logo" fit="cover" style="width:48px;height:48px;border-radius:6px" />
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="默认语言">{{ defaultLangName }}</el-descriptions-item>
        <el-descriptions-item label="默认币种">{{ settings.defaultCurrency }}（{{ defaultCurSymbol }}）</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ paymentText }}</el-descriptions-item>
        <el-descriptions-item label="秒杀功能">
          <el-tag :type="settings.seckillEnabled ? 'success' : 'info'" size="small">
            {{ settings.seckillEnabled ? '启用' : '停用' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <el-alert
        type="info"
        :closable="false"
        title="说明：当前 MVP 未提供配置修改接口，本页为多语言 / 多货币配置的查看视图。"
        style="margin-top:12px"
      />
    </div>

    <div class="admin-card">
      <div class="card-title">币种列表（GET /currencies）</div>
      <el-table :data="currencies" v-loading="curLoading" style="width:100%">
        <el-table-column prop="code" label="代码" width="110" />
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column prop="symbol" label="符号" width="90" />
        <el-table-column prop="rate" label="汇率" width="110" />
        <el-table-column label="默认" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isDefault" type="success" size="small">默认</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="admin-card">
      <div class="card-title">翻译表查看（GET /i18n/:lang）</div>
      <div class="admin-toolbar">
        <el-select v-model="lang" style="width:200px" @change="loadI18nData">
          <el-option v-for="l in settings.languages" :key="l.code" :label="l.name" :value="l.code" />
        </el-select>
        <el-input v-model="i18nFilter" placeholder="过滤 key / value" clearable style="width:240px" />
      </div>
      <el-table :data="filteredI18n" v-loading="i18nLoading" size="small" style="width:100%" max-height="460">
        <el-table-column prop="key" label="key" min-width="240" />
        <el-table-column prop="value" label="value" min-width="280" />
      </el-table>
      <div class="i18n-count">共 {{ filteredI18n.length }} 条翻译</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { settingApi } from '../../api'
import { settings, loadSettings } from '../../stores/settings'

const currencies = ref([])
const curLoading = ref(false)
const lang = ref('zh-CN')
const i18nData = ref([])
const i18nFilter = ref('')
const i18nLoading = ref(false)

const defaultLangName = computed(() => {
  const l = settings.languages.find((x) => x.code === settings.defaultLanguage)
  return l ? l.name : settings.defaultLanguage
})

const defaultCurSymbol = computed(() => {
  const c = settings.currencies.find((x) => x.code === settings.defaultCurrency)
  return c?.symbol || ''
})

const paymentText = computed(() => {
  if (!Array.isArray(settings.paymentMethods) || !settings.paymentMethods.length) return '-'
  return settings.paymentMethods.map((m) => (typeof m === 'string' ? m : m.name || m.code)).join('、')
})

const filteredI18n = computed(() => {
  const f = i18nFilter.value.trim().toLowerCase()
  if (!f) return i18nData.value
  return i18nData.value.filter(
    (x) => String(x.key).toLowerCase().includes(f) || String(x.value).toLowerCase().includes(f)
  )
})

async function loadCurrencies() {
  curLoading.value = true
  try {
    const data = await settingApi.currencies()
    currencies.value = Array.isArray(data) ? data : []
  } catch {
    currencies.value = []
  } finally {
    curLoading.value = false
  }
}

async function loadI18nData() {
  i18nLoading.value = true
  try {
    const dict = await settingApi.i18n(lang.value)
    i18nData.value = dict && typeof dict === 'object' ? Object.entries(dict).map(([key, value]) => ({ key, value })) : []
  } catch {
    i18nData.value = []
  } finally {
    i18nLoading.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  if (settings.languages.length) lang.value = settings.language || settings.defaultLanguage || 'zh-CN'
  loadCurrencies()
  loadI18nData()
})
</script>

<style scoped>
.card-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
}

.i18n-count {
  margin-top: 10px;
  color: #999;
  font-size: 12px;
}
</style>
