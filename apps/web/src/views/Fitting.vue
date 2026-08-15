<template>
  <div class="fitting page-container">
    <el-skeleton v-if="loading" :rows="6" animated />
    <template v-else-if="info">
      <div class="page-panel">
        <div class="section-title">
          <span class="bar"></span>
          <h3>虚拟试衣 · 尺码推荐</h3>
          <router-link class="more" :to="`/products/${productId}`">返回商品 &gt;</router-link>
        </div>
        <div class="fit-layout">
          <div class="fit-left">
            <div class="fit-sub">模特参考</div>
            <el-image :src="info.modelUrl" fit="cover" class="model-img">
              <template #error><div class="img-err">暂无模特图</div></template>
            </el-image>
            <el-alert
              v-if="info.recommendedSize"
              type="success"
              :closable="false"
              style="margin-top:12px"
              :title="`系统推荐尺码：${info.recommendedSize}`"
            />
          </div>
          <div class="fit-right">
            <div class="fit-sub">尺码表（单位：cm）</div>
            <el-table :data="sizeChart" border style="width:100%">
              <el-table-column prop="size" label="尺码" width="90" />
              <el-table-column prop="bust" label="胸围" />
              <el-table-column prop="waist" label="腰围" />
              <el-table-column prop="hip" label="臀围" />
              <el-table-column prop="shoulder" label="肩宽" />
            </el-table>

            <div class="fit-sub" style="margin-top:20px">输入身材参数，获取个性化推荐</div>
            <el-form label-width="90px" style="max-width:420px">
              <el-form-item label="身高 (cm)" required>
                <el-input-number v-model="height" :min="100" :max="230" :controls="false" style="width:200px" placeholder="如 170" />
              </el-form-item>
              <el-form-item label="体重 (kg)" required>
                <el-input-number v-model="weight" :min="30" :max="200" :controls="false" style="width:200px" placeholder="如 60" />
              </el-form-item>
              <el-form-item label="性别">
                <el-radio-group v-model="gender">
                  <el-radio value="female">女</el-radio>
                  <el-radio value="male">男</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item>
                <el-button type="danger" :loading="creating" @click="createSession">开始试衣</el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>

      <!-- 试衣结果 -->
      <div v-if="session" class="page-panel">
        <div class="section-title">
          <span class="bar"></span>
          <h3>试衣结果</h3>
          <el-tag :type="session.status === 'ready' ? 'success' : 'warning'" style="margin-left:auto">
            {{ session.status === 'ready' ? '已完成' : '生成中…' }}
          </el-tag>
        </div>
        <div v-if="session.status === 'ready'">
          <el-alert
            v-if="session.recommendedSize"
            type="success"
            :closable="false"
            :title="`推荐尺码：${session.recommendedSize}`"
            style="margin-bottom:14px"
          />
          <el-image v-if="session.resultUrl" :src="session.resultUrl" fit="contain" style="max-width:100%;border-radius:8px" />
          <div v-else class="empty-tip">试衣图生成中，请稍候…</div>
        </div>
        <div v-else class="empty-tip">
          <el-icon class="is-loading" :size="30" color="#e1251b"><Loading /></el-icon>
          <p>AI 试衣生成中，通常需要几秒钟…</p>
        </div>
      </div>
    </template>
    <div v-else class="empty-tip page-panel">未找到该商品的试衣信息</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { fittingApi } from '../api'

const route = useRoute()
const productId = computed(() => route.params.productId)

const info = ref(null)
const loading = ref(true)

const sizeChart = computed(() => (Array.isArray(info.value?.sizeChart) ? info.value.sizeChart : []))

const height = ref(170)
const weight = ref(60)
const gender = ref('female')
const creating = ref(false)

const session = ref(null)
let pollTimer = null

async function load() {
  loading.value = true
  try {
    info.value = await fittingApi.product(productId.value)
  } catch {
    info.value = null
  } finally {
    loading.value = false
  }
}

async function createSession() {
  if (!height.value || !weight.value) {
    return
  }
  creating.value = true
  try {
    const data = await fittingApi.createSession({
      productId: Number(productId.value),
      height: height.value,
      weight: weight.value,
      gender: gender.value,
    })
    session.value = { id: data.sessionId, status: 'processing' }
    pollTimer = setInterval(pollSession, 2500)
    pollSession()
  } catch {
    /* 拦截器已提示 */
  } finally {
    creating.value = false
  }
}

async function pollSession() {
  if (!session.value?.id) return
  try {
    const data = await fittingApi.session(session.value.id)
    session.value = { ...session.value, ...data }
    if (data.status === 'ready') {
      clearInterval(pollTimer)
      pollTimer = null
    }
  } catch {
    /* 会话尚未就绪或出错，继续轮询 */
  }
}

onMounted(load)
onBeforeUnmount(() => clearInterval(pollTimer))
</script>

<style scoped>
.more {
  margin-left: auto;
  font-size: 13px;
  color: #999;
}

.fit-layout {
  display: flex;
  gap: 24px;
}

.fit-left {
  width: 300px;
  flex-shrink: 0;
}

.fit-right {
  flex: 1;
  min-width: 0;
}

.fit-sub {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}

.model-img {
  width: 100%;
  height: 380px;
  border-radius: 8px;
  display: block;
}

.img-err {
  width: 100%;
  height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #999;
}
</style>
