<template>
  <div class="dashboard">
    <div class="stat-cards">
      <div class="stat-card">
        <div class="icon" style="background:#409EFF"><el-icon><Money /></el-icon></div>
        <div>
          <div class="label">累计 GMV</div>
          <div class="value">{{ formatPrice(overview.gmv, 'CNY') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon" style="background:#67C23A"><el-icon><List /></el-icon></div>
        <div>
          <div class="label">累计订单</div>
          <div class="value">{{ overview.orderCount ?? 0 }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon" style="background:#E6A23C"><el-icon><TrendCharts /></el-icon></div>
        <div>
          <div class="label">转化率</div>
          <div class="value">{{ formatPercent(overview.conversionRate) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon" style="background:#F56C6C"><el-icon><Wallet /></el-icon></div>
        <div>
          <div class="label">客单价</div>
          <div class="value">{{ formatPrice(overview.avgOrderValue, 'CNY') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon" style="background:#909399"><el-icon><User /></el-icon></div>
        <div>
          <div class="label">用户数</div>
          <div class="value">{{ overview.userCount ?? 0 }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon" style="background:#9B59B6"><el-icon><Goods /></el-icon></div>
        <div>
          <div class="label">商品数</div>
          <div class="value">{{ overview.productCount ?? 0 }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon" style="background:#1ABC9C"><el-icon><Sunny /></el-icon></div>
        <div>
          <div class="label">今日 GMV</div>
          <div class="value">{{ formatPrice(overview.todayGmv, 'CNY') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon" style="background:#F39C12"><el-icon><Clock /></el-icon></div>
        <div>
          <div class="label">今日订单</div>
          <div class="value">{{ overview.todayOrders ?? 0 }}</div>
        </div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="admin-card">
        <div class="card-title">
          <span>销售趋势（近 7 天）</span>
          <el-radio-group v-model="trendDays" size="small" @change="loadTrend">
            <el-radio-button :value="7">7 天</el-radio-button>
            <el-radio-button :value="30">30 天</el-radio-button>
          </el-radio-group>
        </div>
        <SimpleChart
          type="line"
          :data="trend.gmv"
          :labels="trend.labels"
          :height="280"
          show-value
        />
      </div>
      <div class="admin-card">
        <div class="card-title">品类销售分布</div>
        <SimpleChart type="donut" :data="categoryDist.values" :labels="categoryDist.labels" :height="240" />
      </div>
    </div>

    <div class="admin-card">
      <div class="card-title">Top 商品</div>
      <el-table :data="topProducts" style="width:100%">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="name" label="商品名称" min-width="220" />
        <el-table-column prop="sales" label="销量" width="120" />
        <el-table-column label="销售额" width="160">
          <template #default="{ row }">{{ formatPrice(row.gmv, 'CNY') }}</template>
        </el-table-column>
      </el-table>
      <div v-if="!topProducts.length" class="empty-tip">暂无数据</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import SimpleChart from '../../components/SimpleChart.vue'
import { dashboardApi } from '../../api'
import { auth } from '../../stores/auth'
import { formatPrice } from '../../utils/format'

// admin 用 /admin/dashboard/...，merchant 用 /merchant/dashboard/...（本店数据）
const role = auth.isAdmin ? 'admin' : 'merchant'

const overview = reactive({})
const trendDays = ref(7)
const trend = reactive({ gmv: [], labels: [] })
const categoryDist = reactive({ values: [], labels: [] })
const topProducts = ref([])

function formatPercent(v) {
  if (v == null) return '-'
  return `${(Number(v) * 100).toFixed(1)}%`
}

async function loadOverview() {
  try {
    const d = await dashboardApi.overview(role)
    Object.assign(overview, d || {})
  } catch {
    /* 拦截器已提示 */
  }
}

async function loadTrend() {
  try {
    const d = await dashboardApi.salesTrend(role, trendDays.value)
    const list = Array.isArray(d) ? d : []
    trend.labels = list.map((x) => String(x.date || '').slice(5))
    trend.gmv = list.map((x) => Math.round((Number(x.gmv) || 0) / 100))
  } catch {
    trend.labels = []
    trend.gmv = []
  }
}

async function loadCategory() {
  try {
    const d = await dashboardApi.categoryDistribution(role)
    const list = Array.isArray(d) ? d : []
    categoryDist.labels = list.map((x) => x.name || '未知')
    categoryDist.values = list.map((x) => Number(x.value) || 0)
  } catch {
    categoryDist.labels = []
    categoryDist.values = []
  }
}

async function loadTop() {
  try {
    const d = await dashboardApi.topProducts(role, 10)
    topProducts.value = Array.isArray(d) ? d : []
  } catch {
    topProducts.value = []
  }
}

onMounted(() => {
  loadOverview()
  loadTrend()
  loadCategory()
  loadTop()
})
</script>

<style scoped>
.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 30px 0;
}
</style>
