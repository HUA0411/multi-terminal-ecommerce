<template>
  <div class="marketing">
    <el-tabs v-model="tab">
      <!-- 优惠券 -->
      <el-tab-pane label="优惠券" name="coupons">
        <div class="admin-card">
          <div class="admin-toolbar">
            <span class="tip">可领取优惠券（GET /coupons/available）</span>
            <el-button type="success" style="margin-left:auto" @click="couponDialog = true">+ 创建优惠券</el-button>
          </div>
          <el-table :data="coupons" v-loading="couponLoading" style="width:100%">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="name" label="名称" min-width="180" />
            <el-table-column label="面额" width="120">
              <template #default="{ row }">{{ formatPrice(row.amount, row.currency) }}</template>
            </el-table-column>
            <el-table-column label="门槛" width="120">
              <template #default="{ row }">{{ row.threshold ? '满 ' + formatPrice(row.threshold, row.currency) : '无门槛' }}</template>
            </el-table-column>
            <el-table-column prop="total" label="总量" width="90" />
            <el-table-column prop="claimed" label="已领" width="90" />
            <el-table-column label="有效期至" width="170">
              <template #default="{ row }">{{ formatDate(row.expireAt || row.endAt) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 秒杀 -->
      <el-tab-pane label="秒杀活动" name="flashsales">
        <div class="admin-card">
          <div class="admin-toolbar">
            <span class="tip">进行中的秒杀（GET /flashsales）</span>
            <el-button type="success" style="margin-left:auto" @click="flashDialog = true">+ 创建秒杀</el-button>
          </div>
          <el-table :data="flashsales" v-loading="flashLoading" style="width:100%">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="productId" label="商品ID" width="90" />
            <el-table-column prop="productName" label="商品" min-width="180" />
            <el-table-column label="秒杀价" width="120">
              <template #default="{ row }">{{ formatPrice(row.flashPrice, row.currency) }}</template>
            </el-table-column>
            <el-table-column label="原价" width="120">
              <template #default="{ row }">{{ formatPrice(row.originalPrice, row.currency) }}</template>
            </el-table-column>
            <el-table-column label="进度" width="160">
              <template #default="{ row }">
                <el-progress
                  :percentage="Math.min(Math.round((row.sold / Math.max(row.quota, 1)) * 100), 100)"
                  :stroke-width="8"
                  color="#e1251b"
                />
              </template>
            </el-table-column>
            <el-table-column label="开始时间" width="170">
              <template #default="{ row }">{{ formatTime(row.startAt) }}</template>
            </el-table-column>
            <el-table-column label="结束时间" width="170">
              <template #default="{ row }">{{ formatTime(row.endAt) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 分享链接 -->
      <el-tab-pane label="分享链接" name="shares">
        <div class="admin-card">
          <el-alert
            type="info"
            :closable="false"
            title="契约说明：当前 MVP 未提供分享链接的管理端列表接口，本页支持「创建分享链接」与「按 code 查询」。"
            style="margin-bottom:14px"
          />
          <div class="admin-toolbar">
            <el-select v-model="shareType" style="width:140px">
              <el-option label="商品分享" value="product" />
            </el-select>
            <el-input-number v-model="shareRefId" :min="1" placeholder="商品ID" style="width:160px" />
            <el-button type="primary" :loading="shareCreating" @click="createShare">生成分享链接</el-button>
          </div>
          <div v-if="createdShare" class="share-result">
            <div>分享码：<b>{{ createdShare.code }}</b></div>
            <div class="share-url">
              链接：{{ createdShare.url }}
              <el-button size="small" type="primary" plain @click="copyShare">复制</el-button>
            </div>
          </div>

          <el-divider>查询分享信息（GET /shares/:code）</el-divider>
          <div class="admin-toolbar">
            <el-input v-model="lookupCode" placeholder="输入分享码 code" style="width:220px" />
            <el-button @click="lookupShare">查询</el-button>
          </div>
          <el-descriptions v-if="lookupResult" :column="2" border size="small" style="max-width:720px">
            <el-descriptions-item label="code">{{ lookupCode }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ lookupResult.type }}</el-descriptions-item>
            <el-descriptions-item label="refId">{{ lookupResult.refId }}</el-descriptions-item>
            <el-descriptions-item label="分享人">{{ lookupResult.user?.nickname || '-' }}</el-descriptions-item>
            <el-descriptions-item label="商品" :span="2">
              {{ lookupResult.product?.name || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 创建优惠券 -->
    <el-dialog v-model="couponDialog" title="创建优惠券" width="500px">
      <el-form :model="couponForm" label-width="90px">
        <el-form-item label="名称" required>
          <el-input v-model="couponForm.name" placeholder="如：新人立减券" />
        </el-form-item>
        <el-form-item label="面额（元）" required>
          <el-input-number v-model="couponForm.amountYuan" :min="0" :precision="2" :controls="false" style="width:200px" />
        </el-form-item>
        <el-form-item label="门槛（元）">
          <el-input-number v-model="couponForm.thresholdYuan" :min="0" :precision="2" :controls="false" style="width:200px" />
        </el-form-item>
        <el-form-item label="发放总量">
          <el-input-number v-model="couponForm.total" :min="1" style="width:200px" />
        </el-form-item>
        <el-form-item label="有效期至">
          <el-date-picker v-model="couponForm.expireAt" type="datetime" placeholder="选择日期" style="width:100%" />
        </el-form-item>
      </el-form>
      <el-alert type="warning" :closable="false" title="提示：后端若未实现创建接口将返回 501，前端会友好提示。" style="margin-bottom:10px" />
      <template #footer>
        <el-button @click="couponDialog = false">取消</el-button>
        <el-button type="primary" :loading="couponSaving" @click="createCoupon">创建</el-button>
      </template>
    </el-dialog>

    <!-- 创建秒杀 -->
    <el-dialog v-model="flashDialog" title="创建秒杀活动" width="500px">
      <el-form :model="flashForm" label-width="90px">
        <el-form-item label="商品ID" required>
          <el-input-number v-model="flashForm.productId" :min="1" style="width:200px" />
        </el-form-item>
        <el-form-item label="秒杀价（元）" required>
          <el-input-number v-model="flashForm.flashPriceYuan" :min="0" :precision="2" :controls="false" style="width:200px" />
        </el-form-item>
        <el-form-item label="秒杀库存">
          <el-input-number v-model="flashForm.quota" :min="1" style="width:200px" />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker v-model="flashForm.startAt" type="datetime" placeholder="选择开始时间" style="width:100%" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="flashForm.endAt" type="datetime" placeholder="选择结束时间" style="width:100%" />
        </el-form-item>
      </el-form>
      <el-alert type="warning" :closable="false" title="提示：后端若未实现创建接口将返回 501，前端会友好提示。" style="margin-bottom:10px" />
      <template #footer>
        <el-button @click="flashDialog = false">取消</el-button>
        <el-button type="primary" :loading="flashSaving" @click="createFlash">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { couponApi, flashsaleApi, shareApi } from '../../api'
import { formatPrice, formatTime, formatDate } from '../../utils/format'

const tab = ref('coupons')

// 优惠券
const coupons = ref([])
const couponLoading = ref(false)
const couponDialog = ref(false)
const couponSaving = ref(false)
const couponForm = reactive({ name: '', amountYuan: 0, thresholdYuan: 0, total: 100, expireAt: null })

// 秒杀
const flashsales = ref([])
const flashLoading = ref(false)
const flashDialog = ref(false)
const flashSaving = ref(false)
const flashForm = reactive({ productId: null, flashPriceYuan: 0, quota: 10, startAt: null, endAt: null })

// 分享
const shareType = ref('product')
const shareRefId = ref(null)
const shareCreating = ref(false)
const createdShare = ref(null)
const lookupCode = ref('')
const lookupResult = ref(null)

async function loadCoupons() {
  couponLoading.value = true
  try {
    const data = await couponApi.available({ page: 1, pageSize: 50 })
    coupons.value = Array.isArray(data) ? data : data.list || []
  } catch {
    coupons.value = []
  } finally {
    couponLoading.value = false
  }
}

async function createCoupon() {
  if (!couponForm.name || couponForm.amountYuan == null) {
    ElMessage.warning('请填写名称和面额')
    return
  }
  couponSaving.value = true
  try {
    // 契约未定义管理端创建优惠券接口：调用后如 501 会被拦截器友好提示
    await couponApi.adminCreate({
      name: couponForm.name,
      amount: Math.round(couponForm.amountYuan * 100),
      threshold: Math.round(couponForm.thresholdYuan * 100),
      total: couponForm.total,
      expireAt: couponForm.expireAt ? new Date(couponForm.expireAt).toISOString() : undefined,
    })
    ElMessage.success('优惠券创建成功')
    couponDialog.value = false
    loadCoupons()
  } catch {
    /* 501 等错误由拦截器提示 */
  } finally {
    couponSaving.value = false
  }
}

async function loadFlashsales() {
  flashLoading.value = true
  try {
    const data = await flashsaleApi.list()
    flashsales.value = Array.isArray(data) ? data : []
  } catch {
    flashsales.value = []
  } finally {
    flashLoading.value = false
  }
}

async function createFlash() {
  if (!flashForm.productId || flashForm.flashPriceYuan == null) {
    ElMessage.warning('请填写商品ID和秒杀价')
    return
  }
  flashSaving.value = true
  try {
    await flashsaleApi.adminCreate({
      productId: flashForm.productId,
      flashPrice: Math.round(flashForm.flashPriceYuan * 100),
      quota: flashForm.quota,
      startAt: flashForm.startAt ? new Date(flashForm.startAt).toISOString() : undefined,
      endAt: flashForm.endAt ? new Date(flashForm.endAt).toISOString() : undefined,
    })
    ElMessage.success('秒杀活动创建成功')
    flashDialog.value = false
    loadFlashsales()
  } catch {
    /* 501 等错误由拦截器提示 */
  } finally {
    flashSaving.value = false
  }
}

async function createShare() {
  if (!shareRefId.value) {
    ElMessage.warning('请输入商品ID')
    return
  }
  shareCreating.value = true
  try {
    const data = await shareApi.create({ type: shareType.value, refId: Number(shareRefId.value) })
    createdShare.value = data
    ElMessage.success('分享链接已生成')
  } catch {
    /* 拦截器已提示 */
  } finally {
    shareCreating.value = false
  }
}

function copyShare() {
  const url = `${window.location.origin}/s/${createdShare.value.code}`
  navigator.clipboard?.writeText(url)
  ElMessage.success('已复制分享链接')
}

async function lookupShare() {
  if (!lookupCode.value.trim()) {
    ElMessage.warning('请输入分享码')
    return
  }
  try {
    lookupResult.value = await shareApi.get(lookupCode.value.trim())
  } catch {
    lookupResult.value = null
  }
}

onMounted(() => {
  loadCoupons()
  loadFlashsales()
})
</script>

<style scoped>
.tip {
  color: #666;
  font-size: 13px;
}

.share-result {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 6px;
  padding: 12px 16px;
  max-width: 720px;
  line-height: 1.9;
}

.share-url {
  color: #409eff;
  word-break: break-all;
}
</style>
