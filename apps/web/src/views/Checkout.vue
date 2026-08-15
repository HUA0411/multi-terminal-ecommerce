<template>
  <div class="checkout page-container">
    <div class="page-panel">
      <div class="section-title">
        <span class="bar"></span>
        <h3>确认订单</h3>
      </div>

      <!-- 收货地址 -->
      <div class="check-sec">
        <div class="sec-title">收货地址</div>
        <div v-if="addresses.length" class="addr-grid">
          <div
            v-for="a in addresses"
            :key="a.id"
            class="addr-card"
            :class="{ active: selectedAddressId === a.id }"
            @click="selectedAddressId = a.id"
          >
            <div class="addr-name">{{ a.name }} <el-tag v-if="a.isDefault" size="small" type="danger">默认</el-tag></div>
            <div class="addr-phone">{{ a.phone }}</div>
            <div class="addr-detail">{{ a.detail }}</div>
          </div>
        </div>
        <div v-else class="empty-tip" style="padding:20px 0">还没有收货地址</div>
        <el-button type="primary" plain style="margin-top:10px" @click="openAddrDialog()">+ 新增地址</el-button>
      </div>

      <!-- 商品清单 -->
      <div class="check-sec">
        <div class="sec-title">商品清单</div>
        <el-table :data="cart.items.filter((i) => i.checked)" style="width:100%">
          <el-table-column label="商品" min-width="280">
            <template #default="{ row }">
              <div class="goods-cell">
                <el-image :src="row.image" fit="cover" style="width:50px;height:50px;border-radius:6px" />
                <div>
                  <div class="g-name">{{ row.productName }}</div>
                  <div class="g-sku">{{ row.skuName || '默认规格' }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="单价" width="120">
            <template #default="{ row }"><PriceText :cents="row.price" :currency="row.currency" :size="15" /></template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column label="小计" width="120">
            <template #default="{ row }"><PriceText :cents="row.price * row.quantity" :currency="row.currency" :size="15" /></template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 优惠券与备注 -->
      <div class="check-sec">
        <div class="sec-title">优惠与备注</div>
        <div class="form-row">
          <span class="row-label">优惠券</span>
          <el-select v-model="selectedCouponId" placeholder="选择优惠券" clearable style="width:320px">
            <el-option v-for="c in myCoupons" :key="c.id" :label="couponLabel(c)" :value="c.id" />
          </el-select>
          <router-link to="/my/coupons" style="margin-left:10px;color:#409eff;font-size:13px">查看我的优惠券</router-link>
        </div>
        <div class="form-row">
          <span class="row-label">订单备注</span>
          <el-input v-model="remark" placeholder="选填，留言给商家" style="width:320px" maxlength="100" />
        </div>
      </div>

      <!-- 结算 -->
      <div class="check-footer">
        <div class="amounts">
          <div class="amt-row"><span>商品金额</span><span>{{ formatPrice(cart.totalPrice, cart.currency) }}</span></div>
          <div class="amt-row"><span>优惠券抵扣</span><span class="discount">-{{ formatPrice(couponAmount, cart.currency) }}</span></div>
          <div class="amt-row total"><span>应付金额</span><PriceText :cents="payable" :currency="cart.currency" :size="26" /></div>
        </div>
        <el-button type="danger" size="large" :loading="submitting" :disabled="!canSubmit" @click="submit">
          提交订单
        </el-button>
      </div>
    </div>

    <!-- 地址编辑对话框 -->
    <el-dialog v-model="addrDialog" :title="editingId ? '编辑地址' : '新增地址'" width="480px">
      <el-form :model="addrForm" label-width="80px">
        <el-form-item label="收货人" required>
          <el-input v-model="addrForm.name" placeholder="收货人姓名" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="addrForm.phone" placeholder="手机号码" maxlength="11" />
        </el-form-item>
        <el-form-item label="详细地址" required>
          <el-input v-model="addrForm.detail" type="textarea" :rows="2" placeholder="省市区 + 街道门牌号" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="addrForm.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addrDialog = false">取消</el-button>
        <el-button type="primary" @click="saveAddr">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PriceText from '../components/PriceText.vue'
import { cart, refreshCart, checkedItemIds } from '../stores/cart'
import { auth } from '../stores/auth'
import { orderApi, couponApi } from '../api'
import { settings } from '../stores/settings'
import { formatPrice } from '../utils/format'
import { getAddresses, addAddress, updateAddress, defaultAddress } from '../utils/address'

const router = useRouter()

const addresses = ref([])
const selectedAddressId = ref(null)
const myCoupons = ref([])
const selectedCouponId = ref(null)
const remark = ref('')
const submitting = ref(false)

const addrDialog = ref(false)
const editingId = ref(null)
const addrForm = ref({ name: '', phone: '', detail: '', isDefault: false })

const selectedCoupon = computed(() => myCoupons.value.find((c) => c.id === selectedCouponId.value) || null)

const couponAmount = computed(() => {
  const c = selectedCoupon.value
  if (!c) return 0
  if (typeof c.amount === 'number') return c.amount
  if (typeof c.discountAmount === 'number') return c.discountAmount
  return 0
})

const payable = computed(() => Math.max((cart.totalPrice || 0) - couponAmount.value, 0))

const canSubmit = computed(() => !!selectedAddressId.value && cart.items.some((i) => i.checked))

function couponLabel(c) {
  const name = c.name || c.title || `优惠券 #${c.id}`
  const amt = typeof c.amount === 'number' ? `（${formatPrice(c.amount, c.currency || 'CNY')}）` : ''
  return name + amt
}

function loadAddresses() {
  addresses.value = getAddresses()
  if (!selectedAddressId.value) {
    const def = defaultAddress()
    selectedAddressId.value = def ? def.id : addresses.value[0]?.id || null
  }
}

function openAddrDialog(addr) {
  editingId.value = addr?.id || null
  addrForm.value = addr
    ? { name: addr.name, phone: addr.phone, detail: addr.detail, isDefault: addr.isDefault }
    : { name: '', phone: '', detail: '', isDefault: addresses.value.length === 0 }
  addrDialog.value = true
}

function saveAddr() {
  const { name, phone, detail } = addrForm.value
  if (!name || !phone || !detail) {
    ElMessage.warning('请完整填写地址信息')
    return
  }
  if (editingId.value) {
    updateAddress({ id: editingId.value, ...addrForm.value })
  } else {
    addAddress({ ...addrForm.value })
  }
  addrDialog.value = false
  loadAddresses()
}

async function submit() {
  if (!auth.isLogin) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: '/checkout' } })
    return
  }
  submitting.value = true
  try {
    const payload = {
      cartItemIds: checkedItemIds(),
      addressId: selectedAddressId.value,
      currency: settings.currency || settings.defaultCurrency,
    }
    if (selectedCouponId.value) payload.couponId = selectedCouponId.value
    if (remark.value) payload.remark = remark.value
    const data = await orderApi.create(payload)
    await refreshCart(settings.currency)
    ElMessage.success('下单成功，请尽快完成支付')
    router.push(`/orders/${data.order?.id || data.id}`)
  } catch {
    /* 拦截器已提示 */
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await refreshCart(settings.currency)
  loadAddresses()
  if (!cart.items.length) {
    await ElMessageBox.confirm('购物车为空，是否先去逛逛？', '提示', { type: 'info', confirmButtonText: '去逛逛', cancelButtonText: '留在本页' })
      .then(() => router.push('/products'))
      .catch(() => {})
  }
  try {
    const data = await couponApi.mine({ status: 'unused' })
    myCoupons.value = Array.isArray(data) ? data : data.list || []
  } catch {
    myCoupons.value = []
  }
})
</script>

<style scoped>
.check-sec {
  margin-bottom: 20px;
}

.sec-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 3px solid #e1251b;
}

.addr-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.addr-card {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.addr-card.active {
  border-color: #e1251b;
  background: #fff5f5;
}

.addr-card:hover {
  border-color: #e1251b;
}

.addr-name {
  font-weight: 600;
  margin-bottom: 6px;
}

.addr-phone {
  color: #666;
  margin-bottom: 4px;
  font-size: 13px;
}

.addr-detail {
  color: #999;
  font-size: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.row-label {
  width: 80px;
  color: #666;
  flex-shrink: 0;
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

.check-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 30px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.amounts {
  text-align: right;
}

.amt-row {
  display: flex;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 6px;
  font-size: 13px;
  color: #666;
}

.amt-row.total {
  font-weight: 600;
  color: #333;
  align-items: center;
}

.discount {
  color: #e1251b;
}
</style>
