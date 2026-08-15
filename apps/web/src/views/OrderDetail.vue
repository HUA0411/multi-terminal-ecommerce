<template>
  <div class="order-detail page-container">
    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else-if="order">
      <div class="page-panel">
        <div class="section-title">
          <span class="bar"></span>
          <h3>订单详情</h3>
          <el-tag class="status-tag" :type="statusTagType(order.status)" size="large">{{ order.statusText || order.status }}</el-tag>
        </div>

        <el-steps :active="stepIndex" align-center style="margin: 20px 0 30px">
          <el-step title="提交订单" :description="formatTime(order.createdAt)" />
          <el-step title="支付成功" :description="formatTime(order.paidAt)" />
          <el-step title="商家发货" :description="formatTime(order.shippedAt)" />
          <el-step title="确认收货" :description="formatTime(order.completedAt)" />
        </el-steps>

        <div class="sec-block">
          <div class="sec-title">收货信息</div>
          <div class="addr-line">
            <template v-if="order.address">
              {{ order.address.name }}　{{ order.address.phone }}<br />
              {{ order.address.detail }}
            </template>
            <span v-else class="muted">无收货地址信息</span>
          </div>
        </div>

        <div class="sec-block">
          <div class="sec-title">商品清单</div>
          <el-table :data="order.items || []" style="width:100%">
            <el-table-column label="商品" min-width="280">
              <template #default="{ row }">
                <div class="goods-cell">
                  <el-image :src="row.image" fit="cover" style="width:52px;height:52px;border-radius:6px" />
                  <div>
                    <div class="g-name">{{ row.productName }}</div>
                    <div class="g-sku">{{ row.skuName || '默认规格' }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="单价" width="120">
              <template #default="{ row }"><PriceText :cents="row.price" :currency="order.currency" :size="14" /></template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column label="小计" width="130">
              <template #default="{ row }"><PriceText :cents="row.price * row.quantity" :currency="order.currency" :size="14" /></template>
            </el-table-column>
          </el-table>
          <div class="amount-box">
            <div class="amt-row"><span>商品金额</span><span>{{ formatPrice(order.totalAmount, order.currency) }}</span></div>
            <div v-if="order.couponAmount" class="amt-row"><span>优惠券</span><span>-{{ formatPrice(order.couponAmount, order.currency) }}</span></div>
            <div v-if="order.discountAmount" class="amt-row"><span>活动优惠</span><span>-{{ formatPrice(order.discountAmount, order.currency) }}</span></div>
            <div class="amt-row payable"><span>应付金额</span><PriceText :cents="order.payableAmount ?? order.totalAmount" :currency="order.currency" :size="22" /></div>
          </div>
        </div>

        <div v-if="order.remark" class="sec-block">
          <div class="sec-title">订单备注</div>
          <div class="muted">{{ order.remark }}</div>
        </div>

        <div v-if="payments.length" class="sec-block">
          <div class="sec-title">支付记录</div>
          <el-table :data="payments" style="width:100%">
            <el-table-column prop="paymentNo" label="支付单号" min-width="180" />
            <el-table-column prop="method" label="方式" width="120" />
            <el-table-column label="金额" width="140">
              <template #default="{ row }"><PriceText :cents="row.amount" :currency="row.currency || order.currency" :size="14" /></template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100" />
            <el-table-column label="时间" width="170">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </div>

        <div v-if="tracking" class="sec-block">
          <div class="sec-title">物流跟踪</div>
          <div class="track-head">{{ tracking.carrier || '承运商未知' }}　{{ tracking.trackingNo || '' }}</div>
          <el-timeline>
            <el-timeline-item v-for="(ev, i) in tracking.events || []" :key="i" :timestamp="formatTime(ev.time)">
              {{ ev.text }}
            </el-timeline-item>
          </el-timeline>
        </div>

        <div class="order-actions">
          <el-button v-if="order.status === 'pending_payment'" @click="cancelOrder">取消订单</el-button>
          <el-button v-if="order.status === 'pending_payment'" type="danger" @click="payDialog = true">去支付</el-button>
          <el-button v-if="order.status === 'paid'" type="danger" plain @click="openRefund">申请退款</el-button>
          <el-button v-if="order.status === 'shipped'" type="primary" @click="confirmReceipt">确认收货</el-button>
          <el-button v-if="order.status === 'refunding'" disabled>退款处理中，请耐心等待</el-button>
        </div>
      </div>

      <!-- 支付对话框 -->
      <el-dialog v-model="payDialog" title="选择支付方式" width="440px">
        <el-radio-group v-model="payMethod" class="pay-methods">
          <el-radio-button v-for="m in payMethods" :key="m.code" :value="m.code">
            {{ m.name || m.code }}
          </el-radio-button>
        </el-radio-group>
        <div class="pay-tip">应付：<PriceText :cents="order.payableAmount ?? order.totalAmount" :currency="order.currency" :size="20" /></div>
        <template #footer>
          <el-button @click="payDialog = false">取消</el-button>
          <el-button type="danger" :loading="paying" @click="doPay">确认支付</el-button>
        </template>
      </el-dialog>

      <!-- 扫码支付（沙箱） -->
      <el-dialog v-model="qrDialog" title="扫码支付（沙箱）" width="420px" align-center>
        <div class="qr-box">
          <el-image v-if="qrCodeUrl" :src="qrCodeUrl" fit="contain" style="width:200px;height:200px" />
          <el-icon v-else :size="60" color="#999"><VideoCamera /></el-icon>
          <p>模拟扫码支付：点击下方按钮模拟支付成功</p>
          <el-button type="danger" :loading="paying" @click="mockPaySuccess">模拟支付成功</el-button>
          <el-button @click="pollPayStatus">查询支付状态</el-button>
        </div>
      </el-dialog>

      <!-- 退款对话框 -->
      <el-dialog v-model="refundDialog" title="申请退款" width="460px">
        <el-form label-width="80px">
          <el-form-item label="退款原因" required>
            <el-input v-model="refundReason" type="textarea" :rows="3" placeholder="请说明退款原因" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="refundDialog = false">取消</el-button>
          <el-button type="danger" @click="submitRefund">提交申请</el-button>
        </template>
      </el-dialog>
    </template>
    <div v-else class="empty-tip page-panel">订单不存在</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PriceText from '../components/PriceText.vue'
import { orderApi, paymentApi } from '../api'
import { formatTime, formatPrice } from '../utils/format'

const route = useRoute()
const router = useRouter()

const order = ref(null)
const loading = ref(true)
const payments = ref([])
const tracking = ref(null)

const payDialog = ref(false)
const qrDialog = ref(false)
const payMethod = ref('wechat')
const payMethods = ref([])
const payId = ref(null)
const qrCodeUrl = ref('')
const paying = ref(false)

const refundDialog = ref(false)
const refundReason = ref('')

const stepIndex = computed(() => {
  const map = { pending_payment: 0, paid: 1, shipped: 2, completed: 3, cancelled: 0, refunding: 1, refunded: 1 }
  return map[order.value?.status] ?? 0
})

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
    const data = await orderApi.detail(route.params.id)
    order.value = data
    payments.value = Array.isArray(data.payments) ? data.payments : []
  } catch {
    order.value = null
  } finally {
    loading.value = false
  }
  try {
    tracking.value = await orderApi.track(route.params.id)
  } catch {
    tracking.value = null
  }
}

async function cancelOrder() {
  await ElMessageBox.confirm('确认取消该订单吗？', '提示', { type: 'warning' })
  await orderApi.cancel(route.params.id)
  ElMessage.success('订单已取消')
  load()
}

async function confirmReceipt() {
  await ElMessageBox.confirm('确认已收到商品吗？', '提示', { type: 'warning' })
  await orderApi.confirm(route.params.id)
  ElMessage.success('已确认收货')
  load()
}

function openRefund() {
  refundReason.value = ''
  refundDialog.value = true
}

async function submitRefund() {
  if (!refundReason.value.trim()) {
    ElMessage.warning('请填写退款原因')
    return
  }
  await orderApi.applyRefund(route.params.id, refundReason.value.trim())
  ElMessage.success('退款申请已提交')
  refundDialog.value = false
  load()
}

async function openPay() {
  payDialog.value = true
  try {
    const list = await paymentApi.methods()
    payMethods.value = Array.isArray(list) ? list : []
    if (payMethods.value.length) payMethod.value = payMethods.value[0].code
  } catch {
    payMethods.value = []
  }
}

async function doPay() {
  paying.value = true
  try {
    const data = await paymentApi.pay(route.params.id, payMethod.value)
    payId.value = data.paymentId
    qrCodeUrl.value = data.qrCodeUrl || ''
    payDialog.value = false
    qrDialog.value = true
  } catch {
    /* 拦截器已提示 */
  } finally {
    paying.value = false
  }
}

async function mockPaySuccess() {
  if (!payId.value) return
  paying.value = true
  try {
    await paymentApi.mockSuccess(payId.value)
    ElMessage.success('支付成功！')
    qrDialog.value = false
    load()
  } catch {
    /* 拦截器已提示 */
  } finally {
    paying.value = false
  }
}

async function pollPayStatus() {
  if (!payId.value) return
  try {
    const data = await paymentApi.status(payId.value)
    if (data.status === 'success') {
      ElMessage.success('支付成功！')
      qrDialog.value = false
      load()
    } else {
      ElMessage.info('支付尚未完成，请稍后再试')
    }
  } catch {
    /* 拦截器已提示 */
  }
}

onMounted(load)
</script>

<style scoped>
.status-tag {
  margin-left: 12px;
}

.sec-block {
  margin-bottom: 20px;
}

.sec-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 3px solid #e1251b;
}

.addr-line {
  line-height: 1.9;
  color: #333;
}

.muted {
  color: #999;
  font-size: 13px;
}

.goods-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.g-name {
  font-size: 13px;
}

.g-sku {
  font-size: 12px;
  color: #999;
}

.amount-box {
  width: 320px;
  margin-left: auto;
  padding: 12px 0;
}

.amt-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #666;
  font-size: 13px;
}

.amt-row.payable {
  color: #333;
  font-weight: 600;
  align-items: center;
  border-top: 1px dashed #eee;
  padding-top: 10px;
}

.track-head {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}

.order-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid #eee;
}

.pay-methods {
  margin-bottom: 16px;
}

.pay-tip {
  color: #666;
  font-size: 13px;
}

.qr-box {
  text-align: center;
  color: #666;
  font-size: 13px;
}

.qr-box p {
  margin: 14px 0;
}
</style>
