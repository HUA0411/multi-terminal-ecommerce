<template>
  <div class="orders-page page-container">
    <div class="page-panel">
      <div class="section-title">
        <span class="bar"></span>
        <h3>我的订单</h3>
      </div>
      <el-tabs v-model="status" @tab-change="onTabChange">
        <el-tab-pane label="全部" name="" />
        <el-tab-pane label="待付款" name="pending_payment" />
        <el-tab-pane label="待发货" name="paid" />
        <el-tab-pane label="待收货" name="shipped" />
        <el-tab-pane label="已完成" name="completed" />
        <el-tab-pane label="退款/售后" name="refunding" />
      </el-tabs>

      <el-skeleton v-if="loading" :rows="5" animated />
      <template v-else>
        <div v-for="o in orders" :key="o.id" class="order-card">
          <div class="order-head">
            <span class="order-no">订单号：{{ o.orderNo || o.id }}</span>
            <span class="order-time">{{ formatTime(o.createdAt) }}</span>
            <el-tag :type="statusTagType(o.status)" size="small">{{ o.statusText || o.status }}</el-tag>
          </div>
          <div class="order-body" @click="router.push(`/orders/${o.id}`)">
            <div class="order-items">
              <el-image
                v-for="(it, i) in (o.items || []).slice(0, 4)"
                :key="i"
                :src="it.image"
                fit="cover"
                style="width:60px;height:60px;border-radius:6px;margin-right:8px"
              />
              <span v-if="!o.items?.length" class="no-items">共 {{ o.items?.length || 0 }} 件商品</span>
            </div>
            <div class="order-amount">
              <div class="amt-main">应付 <PriceText :cents="o.payableAmount ?? o.totalAmount" :currency="o.currency" :size="18" /></div>
              <div v-if="o.couponAmount" class="amt-sub">已优惠 {{ formatPrice(o.couponAmount, o.currency) }}</div>
            </div>
          </div>
          <div class="order-ops">
            <el-button v-if="o.status === 'pending_payment'" size="small" @click="cancelOrder(o)">取消订单</el-button>
            <el-button v-if="o.status === 'pending_payment'" size="small" type="danger" @click="router.push(`/orders/${o.id}`)">去支付</el-button>
            <el-button v-if="o.status === 'paid'" size="small" @click="openRefund(o)">申请退款</el-button>
            <el-button v-if="o.status === 'shipped'" size="small" type="primary" @click="confirmOrder(o)">确认收货</el-button>
            <el-button size="small" @click="router.push(`/orders/${o.id}`)">订单详情</el-button>
          </div>
        </div>
        <el-empty v-if="!orders.length && !loading" description="暂无订单" />
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
      </template>
    </div>

    <!-- 退款对话框 -->
    <el-dialog v-model="refundDialog" title="申请退款" width="460px">
      <el-form label-width="70px">
        <el-form-item label="退款原因" required>
          <el-input v-model="refundReason" type="textarea" :rows="3" placeholder="请说明退款原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundDialog = false">取消</el-button>
        <el-button type="danger" @click="submitRefund">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PriceText from '../components/PriceText.vue'
import { orderApi } from '../api'
import { formatTime, formatPrice } from '../utils/format'

const router = useRouter()
const status = ref('')
const orders = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)

const refundDialog = ref(false)
const refundReason = ref('')
const refundTarget = ref(null)

function statusTagType(s) {
  const map = {
    pending_payment: 'warning',
    paid: 'primary',
    shipped: 'success',
    completed: 'info',
    cancelled: 'info',
    refunding: 'danger',
    refunded: 'danger',
  }
  return map[s] || 'info'
}

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (status.value) params.status = status.value
    const data = await orderApi.list(params)
    orders.value = data.list || []
    total.value = data.total || 0
  } catch {
    orders.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onTabChange() {
  page.value = 1
  load()
}

async function cancelOrder(o) {
  await ElMessageBox.confirm('确认取消该订单吗？', '提示', { type: 'warning' })
  await orderApi.cancel(o.id)
  ElMessage.success('订单已取消')
  load()
}

async function confirmOrder(o) {
  await ElMessageBox.confirm('确认已收到商品吗？', '提示', { type: 'warning' })
  await orderApi.confirm(o.id)
  ElMessage.success('已确认收货')
  load()
}

function openRefund(o) {
  refundTarget.value = o
  refundReason.value = ''
  refundDialog.value = true
}

async function submitRefund() {
  if (!refundReason.value.trim()) {
    ElMessage.warning('请填写退款原因')
    return
  }
  await orderApi.applyRefund(refundTarget.value.id, refundReason.value.trim())
  ElMessage.success('退款申请已提交')
  refundDialog.value = false
  load()
}

onMounted(load)
</script>

<style scoped>
.order-card {
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 14px;
  overflow: hidden;
}

.order-head {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fafafa;
  padding: 10px 14px;
  font-size: 13px;
  color: #666;
}

.order-no {
  font-weight: 600;
}

.order-time {
  color: #999;
}

.order-head .el-tag {
  margin-left: auto;
}

.order-body {
  display: flex;
  align-items: center;
  padding: 14px;
  cursor: pointer;
}

.order-items {
  flex: 1;
  display: flex;
  align-items: center;
}

.no-items {
  color: #999;
  font-size: 13px;
}

.order-amount {
  text-align: right;
}

.amt-main {
  font-size: 14px;
}

.amt-sub {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}

.order-ops {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 14px 14px;
}

.pager {
  display: flex;
  justify-content: center;
  padding-top: 10px;
}
</style>
