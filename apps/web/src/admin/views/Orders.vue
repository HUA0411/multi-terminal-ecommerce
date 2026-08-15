<template>
  <div class="admin-orders">
    <div class="admin-card">
      <div class="admin-toolbar">
        <el-radio-group v-model="status" @change="onStatusChange">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="pending_payment">待付款</el-radio-button>
          <el-radio-button value="paid">待发货</el-radio-button>
          <el-radio-button value="shipped">已发货</el-radio-button>
          <el-radio-button value="completed">已完成</el-radio-button>
          <el-radio-button value="cancelled">已取消</el-radio-button>
          <el-radio-button value="refunding">退款中</el-radio-button>
        </el-radio-group>
        <el-button style="margin-left:auto" @click="load">刷新</el-button>
      </div>

      <el-table :data="orders" v-loading="loading" style="width:100%">
        <el-table-column prop="orderNo" label="订单号" min-width="190" />
        <el-table-column label="商品" min-width="220">
          <template #default="{ row }">
            <div class="items-mini">
              <el-image
                v-for="(it, i) in (row.items || []).slice(0, 3)"
                :key="i"
                :src="it.image"
                fit="cover"
                style="width:36px;height:36px;border-radius:4px;margin-right:4px"
              />
              <span v-if="!row.items?.length" class="muted">-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="应付金额" width="130">
          <template #default="{ row }">{{ formatPrice(row.payableAmount ?? row.totalAmount, row.currency) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ row.statusText || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'paid'" link type="success" @click="openShip(row)">发货</el-button>
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

    <!-- 订单详情抽屉 -->
    <el-drawer v-model="detailDrawer" title="订单详情" size="560px">
      <template v-if="current">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="订单号">{{ current.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ current.statusText || current.status }}</el-descriptions-item>
          <el-descriptions-item label="支付方式">{{ current.paymentMethod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ formatTime(current.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ formatTime(current.paidAt) }}</el-descriptions-item>
          <el-descriptions-item label="发货时间">{{ formatTime(current.shippedAt) }}</el-descriptions-item>
          <el-descriptions-item label="收货人">
            <template v-if="current.address">
              {{ current.address.name }}　{{ current.address.phone }}<br />{{ current.address.detail }}
            </template>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="drawer-sec">商品清单</div>
        <el-table :data="current.items || []" size="small" style="width:100%">
          <el-table-column prop="productName" label="商品" min-width="160" />
          <el-table-column prop="skuName" label="规格" width="90" />
          <el-table-column prop="quantity" label="数量" width="60" />
          <el-table-column label="小计" width="100">
            <template #default="{ row }">{{ formatPrice(row.price * row.quantity, current.currency) }}</template>
          </el-table-column>
        </el-table>

        <div class="drawer-sec">金额</div>
        <el-descriptions :column="1" size="small" border>
          <el-descriptions-item label="商品金额">{{ formatPrice(current.totalAmount, current.currency) }}</el-descriptions-item>
          <el-descriptions-item v-if="current.couponAmount" label="优惠券">-{{ formatPrice(current.couponAmount, current.currency) }}</el-descriptions-item>
          <el-descriptions-item label="应付">{{ formatPrice(current.payableAmount ?? current.totalAmount, current.currency) }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>

    <!-- 发货对话框 -->
    <el-dialog v-model="shipDialog" title="订单发货" width="460px">
      <el-form :model="shipForm" label-width="90px">
        <el-form-item label="承运商" required>
          <el-select v-model="shipForm.carrier" placeholder="选择承运商" style="width:100%">
            <el-option label="顺丰速运" value="顺丰速运" />
            <el-option label="圆通速递" value="圆通速递" />
            <el-option label="中通快递" value="中通快递" />
            <el-option label="韵达快递" value="韵达快递" />
            <el-option label="邮政 EMS" value="邮政EMS" />
          </el-select>
        </el-form-item>
        <el-form-item label="运单号" required>
          <el-input v-model="shipForm.trackingNo" placeholder="快递运单号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialog = false">取消</el-button>
        <el-button type="primary" :loading="shipping" @click="doShip">确认发货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi, aftersaleApi } from '../../api'
import { auth } from '../../stores/auth'
import { formatTime, formatPrice } from '../../utils/format'

const orders = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const status = ref('')
const loading = ref(false)

const detailDrawer = ref(false)
const current = ref(null)

const shipDialog = ref(false)
const shipping = ref(false)
const shipTarget = ref(null)
const shipForm = ref({ carrier: '顺丰速运', trackingNo: '' })

function statusTag(s) {
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
    if (auth.isMerchant && auth.merchantId) params.merchantId = auth.merchantId
    const data = await adminApi.orders(params)
    orders.value = data.list || []
    total.value = data.total || 0
  } catch {
    orders.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onStatusChange() {
  page.value = 1
  load()
}

function openDetail(row) {
  current.value = row
  detailDrawer.value = true
}

function openShip(row) {
  shipTarget.value = row
  shipForm.value = { carrier: '顺丰速运', trackingNo: '' }
  shipDialog.value = true
}

async function doShip() {
  if (!shipForm.value.carrier || !shipForm.value.trackingNo) {
    ElMessage.warning('请填写承运商和运单号')
    return
  }
  shipping.value = true
  try {
    await aftersaleApi.adminShip(shipTarget.value.id, shipForm.value)
    ElMessage.success('发货成功')
    shipDialog.value = false
    load()
  } catch {
    /* 拦截器已提示 */
  } finally {
    shipping.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.items-mini {
  display: flex;
  align-items: center;
}

.muted {
  color: #999;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
}

.drawer-sec {
  font-weight: 600;
  margin: 18px 0 10px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}
</style>
