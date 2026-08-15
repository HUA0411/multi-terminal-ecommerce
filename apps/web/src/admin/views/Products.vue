<template>
  <div class="products">
    <div class="admin-card">
      <div class="admin-toolbar">
        <el-input v-model="query.keyword" placeholder="商品名称关键词" clearable style="width:220px" @keyup.enter="onSearch" />
        <el-tree-select
          v-model="query.categoryId"
          :data="categoryTree"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          node-key="id"
          check-strictly
          clearable
          placeholder="全部分类"
          style="width:200px"
          @change="onSearch"
        />
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button type="success" style="margin-left:auto" @click="openEdit()">+ 新增商品</el-button>
      </div>

      <el-table :data="products" v-loading="loading" style="width:100%">
        <el-table-column label="商品" min-width="260">
          <template #default="{ row }">
            <div class="p-cell">
              <el-image :src="row.mainImage" fit="cover" style="width:52px;height:52px;border-radius:6px" />
              <div>
                <div class="p-name">{{ row.name }}</div>
                <div class="p-sub">{{ row.subtitle }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="categoryName" label="分类" width="110" />
        <el-table-column label="价格" width="130">
          <template #default="{ row }">
            <span v-if="row.isFlash" class="flash-price">{{ formatPrice(row.flashPrice, row.currency) }}</span>
            <span :class="{ 'origin': row.isFlash }">{{ formatPrice(row.price, row.currency) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="90" />
        <el-table-column prop="sales" label="销量" width="90" />
        <el-table-column prop="merchantName" label="店铺" width="140" />
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openSkus(row)">SKU</el-button>
            <el-button link type="warning" @click="openTiers(row)">批发价</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="load"
          @size-change="onSearch"
        />
      </div>
    </div>

    <!-- 商品编辑对话框 -->
    <el-dialog v-model="editDialog" :title="editingId ? '编辑商品' : '新增商品'" width="640px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="商品名称" required>
          <el-input v-model="form.name" placeholder="商品名称" />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="form.subtitle" placeholder="一句话卖点（选填）" />
        </el-form-item>
        <el-form-item label="主图 URL" required>
          <el-input v-model="form.mainImage" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="图片 URL 列表">
          <el-input v-model="form.imagesText" type="textarea" :rows="2" placeholder="多个 URL 用英文逗号分隔（选填）" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-tree-select
            v-model="form.categoryId"
            :data="categoryTree"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            node-key="id"
            check-strictly
            style="width:100%"
            placeholder="选择分类"
          />
        </el-form-item>
        <el-form-item label="售价（元）" required>
          <el-input-number v-model="form.priceYuan" :min="0" :precision="2" :controls="false" style="width:200px" />
        </el-form-item>
        <el-form-item label="划线价（元）">
          <el-input-number v-model="form.originalPriceYuan" :min="0" :precision="2" :controls="false" style="width:200px" />
        </el-form-item>
        <el-form-item label="库存" required>
          <el-input-number v-model="form.stock" :min="0" style="width:200px" />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="form.tagsText" placeholder="多个标签用英文逗号分隔（选填）" />
        </el-form-item>
        <el-form-item label="商品描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="图文详情（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批发阶梯价对话框（B2B） -->
    <el-dialog v-model="tierDialog" title="批发阶梯价（B2B）" width="560px">
      <div style="font-size:12px;color:#999;margin-bottom:10px">批发客户按数量自动命中最优档位；清空全部档位表示不启用批发价。</div>
      <div v-for="(t, i) in currentTiers" :key="i" style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
        <el-input-number v-model="t.minQuantity" :min="1" style="width:140px" />
        <span>件起，每件</span>
        <el-input-number v-model="t.priceYuan" :min="0" :precision="2" :controls="false" style="width:140px" />
        <span>元</span>
        <el-button link type="danger" @click="currentTiers.splice(i, 1)">删除</el-button>
      </div>
      <el-button size="small" @click="currentTiers.push({ minQuantity: 1, priceYuan: 0 })">+ 添加档位</el-button>
      <template #footer>
        <el-button @click="tierDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveTiers">保存</el-button>
      </template>
    </el-dialog>
    <!-- SKU 管理对话框 -->
    <el-dialog v-model="skuDialog" title="SKU 管理" width="720px">
      <template v-if="currentProduct">
        <div class="sku-head">
          <span>商品：{{ currentProduct.name }}</span>
          <el-button type="primary" size="small" style="margin-left:auto" @click="openSkuForm()">+ 新增 SKU</el-button>
        </div>
        <el-table :data="currentSkus" style="width:100%;margin-top:10px">
          <el-table-column prop="name" label="SKU 名称" min-width="160" />
          <el-table-column prop="specValues" label="规格值" min-width="140" />
          <el-table-column label="价格" width="130">
            <template #default="{ row }">{{ formatPrice(row.price, 'CNY') }}</template>
          </el-table-column>
          <el-table-column prop="stock" label="库存" width="90" />
          <el-table-column prop="code" label="编码" width="130" />
        </el-table>
        <el-empty v-if="!currentSkus.length" description="暂无 SKU，请为商品添加默认 SKU" />
      </template>
      <template #footer>
        <el-button @click="skuDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 新增 SKU 对话框 -->
    <el-dialog v-model="skuFormDialog" title="新增 SKU" width="520px">
      <el-form :model="skuForm" label-width="90px">
        <el-form-item label="SKU 名称" required>
          <el-input v-model="skuForm.name" placeholder="如：红色 / XL" />
        </el-form-item>
        <el-form-item label="规格值">
          <el-input v-model="skuForm.specValues" placeholder="如：红色;XL（选填）" />
        </el-form-item>
        <el-form-item label="价格（元）" required>
          <el-input-number v-model="skuForm.priceYuan" :min="0" :precision="2" :controls="false" style="width:200px" />
        </el-form-item>
        <el-form-item label="库存" required>
          <el-input-number v-model="skuForm.stock" :min="0" style="width:200px" />
        </el-form-item>
        <el-form-item label="SKU 编码">
          <el-input v-model="skuForm.code" placeholder="商家编码（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="skuFormDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveSku">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { productApi, adminApi } from '../../api'
import { auth } from '../../stores/auth'
import { formatPrice } from '../../utils/format'

const products = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const categoryTree = ref([])

const query = reactive({ keyword: '', categoryId: null })

const editDialog = ref(false)
const editingId = ref(null)
const saving = ref(false)
const form = reactive({
  name: '',
  subtitle: '',
  mainImage: '',
  imagesText: '',
  categoryId: null,
  priceYuan: 0,
  originalPriceYuan: 0,
  stock: 0,
  tagsText: '',
  description: '',
})

const tierDialog = ref(false)
const currentTiers = ref([])
const tierProductId = ref(null)
const skuDialog = ref(false)
const skuFormDialog = ref(false)
const currentProduct = ref(null)
const currentSkus = ref([])
const skuForm = reactive({ name: '', specValues: '', priceYuan: 0, stock: 0, code: '' })

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (query.keyword) params.keyword = query.keyword
    if (query.categoryId) params.categoryId = query.categoryId
    // 商家仅能查看本店商品（契约：商家数据隔离）
    if (auth.isMerchant && auth.merchantId) params.merchantId = auth.merchantId
    const data = await productApi.list(params)
    products.value = data.list || []
    total.value = data.total || 0
  } catch {
    products.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  load()
}

function resetForm() {
  Object.assign(form, {
    name: '',
    subtitle: '',
    mainImage: '',
    imagesText: '',
    categoryId: null,
    priceYuan: 0,
    originalPriceYuan: 0,
    stock: 0,
    tagsText: '',
    description: '',
  })
}

function openEdit(row) {
  resetForm()
  if (row) {
    editingId.value = row.id
    form.name = row.name || ''
    form.subtitle = row.subtitle || ''
    form.mainImage = row.mainImage || ''
    form.imagesText = (row.images || []).join(',')
    form.categoryId = row.categoryId ?? null
    form.priceYuan = Math.round(Number(row.price || 0)) / 100
    form.originalPriceYuan = Math.round(Number(row.originalPrice || 0)) / 100
    form.stock = row.stock ?? 0
    form.tagsText = (row.tags || []).join(',')
    form.description = row.description || ''
  } else {
    editingId.value = null
  }
  editDialog.value = true
}

async function save() {
  if (!form.name || !form.mainImage || !form.categoryId || form.priceYuan == null) {
    ElMessage.warning('请填写必填项（名称/主图/分类/售价）')
    return
  }
  saving.value = true
  const payload = {
    name: form.name,
    subtitle: form.subtitle,
    mainImage: form.mainImage,
    images: form.imagesText.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
    categoryId: form.categoryId,
    price: Math.round(form.priceYuan * 100),
    originalPrice: Math.round(form.originalPriceYuan * 100),
    stock: form.stock,
    tags: form.tagsText.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
    description: form.description,
  }
  try {
    if (editingId.value) {
      await adminApi.updateProduct(editingId.value, payload)
      ElMessage.success('商品已更新')
    } else {
      await adminApi.createProduct(payload)
      ElMessage.success('商品已创建，请为该商品添加 SKU')
    }
    editDialog.value = false
    load()
  } catch {
    /* 拦截器已提示 */
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  await ElMessageBox.confirm(`确认删除商品「${row.name}」吗？删除后不可恢复。`, '危险操作', {
    type: 'warning',
    confirmButtonText: '删除',
    confirmButtonClass: 'el-button--danger',
  })
  await adminApi.deleteProduct(row.id)
  ElMessage.success('已删除')
  load()
}

async function openSkus(row) {
  currentProduct.value = row
  currentSkus.value = []
  skuDialog.value = true
  try {
    const detail = await productApi.detail(row.id)
    currentSkus.value = detail.skus || []
  } catch {
    currentSkus.value = []
  }
}

async function openTiers(row) {
  tierProductId.value = row.id
  currentTiers.value = []
  tierDialog.value = true
  try {
    const detail = await productApi.detail(row.id)
    currentTiers.value = (detail.wholesaleTiers || []).map((t) => ({ minQuantity: t.minQuantity, priceYuan: t.price / 100 }))
  } catch {
    currentTiers.value = []
  }
}

async function saveTiers() {
  const tiers = currentTiers.value.filter((t) => t.minQuantity > 0 && t.priceYuan > 0).map((t) => ({ minQuantity: t.minQuantity, price: t.priceYuan }))
  saving.value = true
  try {
    await adminApi.setTiers(tierProductId.value, tiers)
    ElMessage.success('批发阶梯价已保存')
    tierDialog.value = false
    load()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function openSkuForm() {
  Object.assign(skuForm, { name: '', specValues: '', priceYuan: 0, stock: 0, code: '' })
  skuFormDialog.value = true
}

async function saveSku() {
  if (!skuForm.name || skuForm.priceYuan == null) {
    ElMessage.warning('请填写 SKU 名称和价格')
    return
  }
  saving.value = true
  try {
    await adminApi.addSkus(currentProduct.value.id, {
      name: skuForm.name,
      specValues: skuForm.specValues,
      price: Math.round(skuForm.priceYuan * 100),
      stock: skuForm.stock,
      code: skuForm.code,
    })
    ElMessage.success('SKU 已添加')
    skuFormDialog.value = false
    openSkus(currentProduct.value)
  } catch {
    /* 拦截器已提示 */
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    categoryTree.value = await productApi.categories()
  } catch {
    categoryTree.value = []
  }
  load()
})
</script>

<style scoped>
.p-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.p-name {
  font-size: 13px;
  font-weight: 500;
}

.p-sub {
  font-size: 12px;
  color: #999;
}

.flash-price {
  color: #e1251b;
  font-weight: 600;
  margin-right: 6px;
}

.origin {
  color: #999;
  text-decoration: line-through;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
}

.sku-head {
  display: flex;
  align-items: center;
  font-weight: 600;
}
</style>