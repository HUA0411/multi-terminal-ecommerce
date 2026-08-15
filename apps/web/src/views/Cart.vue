<template>
  <div class="cart-page page-container">
    <div class="page-panel">
      <div class="section-title">
        <span class="bar"></span>
        <h3>购物车</h3>
      </div>
      <el-empty v-if="!cart.items.length" description="购物车还是空的，去逛逛吧">
        <el-button type="danger" @click="router.push('/products')">去逛逛</el-button>
      </el-empty>
      <template v-else>
        <el-table :data="cart.items" style="width:100%">
          <el-table-column width="60">
            <template #default="{ row }">
              <el-checkbox :model-value="row.checked" @change="(v) => toggleCheck(row, v)" />
            </template>
          </el-table-column>
          <el-table-column label="商品" min-width="320">
            <template #default="{ row }">
              <div class="goods-cell" @click="router.push(`/products/${row.productId}`)">
                <el-image :src="row.image" fit="cover" style="width:64px;height:64px;border-radius:6px" />
                <div class="goods-info">
                  <div class="g-name">{{ row.productName }}</div>
                  <div class="g-sku">{{ row.skuName || '默认规格' }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="单价" width="140">
            <template #default="{ row }">
              <PriceText :cents="row.price" :currency="row.currency" :size="16" />
            </template>
          </el-table-column>
          <el-table-column label="数量" width="170">
            <template #default="{ row }">
              <el-input-number
                :model-value="row.quantity"
                :min="1"
                :max="Math.max(row.stock || 999, 1)"
                size="small"
                @change="(v) => changeQty(row, v)"
              />
            </template>
          </el-table-column>
          <el-table-column label="小计" width="140">
            <template #default="{ row }">
              <PriceText :cents="row.price * row.quantity" :currency="row.currency" :size="16" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button link type="danger" @click="remove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="cart-footer">
          <el-checkbox :model-value="allChecked" @change="toggleAll">全选</el-checkbox>
          <el-button link @click="clearAll">清空购物车</el-button>
          <div class="summary">
            <span class="s-label">已选 <b>{{ cart.checkedQuantity }}</b> 件商品</span>
            <span class="s-label">合计：</span>
            <PriceText :cents="cart.totalPrice" :currency="cart.currency" :size="26" />
            <el-button type="danger" size="large" :disabled="!cart.checkedQuantity" @click="router.push('/checkout')">去结算</el-button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PriceText from '../components/PriceText.vue'
import { cart, refreshCart, updateCartItem, removeCartItem, clearCart } from '../stores/cart'
import { settings } from '../stores/settings'

const router = useRouter()

const allChecked = computed(() => cart.items.length > 0 && cart.items.every((i) => i.checked))

function toggleCheck(row, v) {
  updateCartItem(row.id, { checked: !!v })
}

function toggleAll(v) {
  cart.items.forEach((row) => updateCartItem(row.id, { checked: !!v }))
}

function changeQty(row, v) {
  if (v >= 1) updateCartItem(row.id, { quantity: v })
}

async function remove(row) {
  await ElMessageBox.confirm(`确认删除「${row.productName}」吗？`, '提示', { type: 'warning' })
  await removeCartItem(row.id)
  ElMessage.success('已删除')
}

async function clearAll() {
  await ElMessageBox.confirm('确认清空购物车吗？', '提示', { type: 'warning' })
  await clearCart()
  ElMessage.success('已清空')
}

onMounted(() => refreshCart(settings.currency))
</script>

<style scoped>
.goods-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.goods-info .g-name {
  font-size: 13px;
  margin-bottom: 4px;
  max-width: 240px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.goods-info .g-sku {
  font-size: 12px;
  color: #999;
}

.cart-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #eee;
}

.summary {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.s-label {
  font-size: 13px;
  color: #666;
}

.s-label b {
  color: #e1251b;
  font-size: 16px;
}
</style>
