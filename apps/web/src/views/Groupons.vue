<template>
  <div class="groupons page-container">
    <div class="page-panel">
      <div class="section-title"><span class="bar"></span><h3>拼团专区</h3><el-button type="warning" size="small" @click="goProducts">去开团</el-button></div>
      <el-skeleton v-if="loading" :rows="3" animated />
      <div v-else-if="list.length" class="gp-grid">
        <div v-for="g in list" :key="g.id" class="gp-card">
          <img :src="g.productImage" class="gp-img" alt="" />
          <div class="gp-name">{{ g.productName }}</div>
          <div class="gp-price">拼团价 <b>{{ formatPrice(g.groupPrice) }}</b><span class="gp-origin">{{ formatPrice(g.originalPrice) }}</span></div>
          <div class="gp-progress">已参 {{ g.currentSize }}/{{ g.targetSize }} 人</div>
          <div class="gp-meta">团长：{{ g.leaderName }}</div>
          <el-button type="warning" size="small" style="width:100%;margin-top:8px" :disabled="g.currentSize >= g.targetSize" @click="join(g)">
            {{ g.currentSize >= g.targetSize ? "已满员" : "去参团" }}
          </el-button>
        </div>
      </div>
      <el-empty v-else description="暂无进行中的拼团，去商品详情开团吧" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { ElMessage } from "element-plus"
import { grouponApi } from "../api"
import { auth } from "../stores/auth"
import { formatPrice } from "../utils/format"

const router = useRouter()
const list = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const d = await grouponApi.list({ status: "open" })
    list.value = d.list || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
})

function goProducts() { router.push("/products") }

async function join(g) {
  if (!auth.isLogin) { ElMessage.warning("请先登录"); router.push("/login"); return }
  try {
    const d = await grouponApi.join(g.id)
    ElMessage.success("参团成功！生成拼团价订单，请尽快支付")
    load()
  } catch (e) {
    ElMessage.error(e.message || "参团失败")
  }
}

async function load() {
  const d = await grouponApi.list({ status: "open" })
  list.value = d.list || []
}
</script>

<style scoped>
.gp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.gp-card { border: 1px solid #f0f0f0; border-radius: 10px; padding: 12px; }
.gp-img { width: 100%; height: 140px; object-fit: cover; border-radius: 8px; background: #f5f5f5; }
.gp-name { font-size: 13px; color: #333; margin: 8px 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gp-price { font-size: 13px; color: #e1251b; }
.gp-price b { font-size: 18px; }
.gp-origin { color: #999; text-decoration: line-through; font-size: 12px; margin-left: 8px; font-weight: 400; }
.gp-progress { font-size: 12px; color: #e6a23c; margin-top: 4px; }
.gp-meta { font-size: 12px; color: #999; }
</style>
