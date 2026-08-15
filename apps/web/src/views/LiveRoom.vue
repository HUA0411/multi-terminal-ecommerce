<template>
  <div class="live-room page-container">
    <el-skeleton v-if="loading" :rows="6" animated />
    <template v-else-if="room">
      <div class="live-layout">
        <div class="player-col">
          <div class="player">
            <video
              v-if="room.streamUrl"
              :src="room.streamUrl"
              controls
              autoplay
              style="width:100%;height:100%;object-fit:cover;background:#000"
            ></video>
            <div v-else class="player-placeholder">
              <el-icon :size="60" color="#fff"><VideoCamera /></el-icon>
              <p>直播信号准备中…</p>
            </div>
            <span class="live-badge"><el-icon><VideoCamera /></el-icon> LIVE</span>
            <span class="viewer"><el-icon><View /></el-icon> {{ room.viewerCount ?? 0 }} 人观看</span>
          </div>
          <div class="room-title-bar">
            <h2>{{ room.title }}</h2>
            <div class="room-meta">
              <span class="merchant">{{ room.merchantName || '官方直播间' }}</span>
              <el-button size="small" round type="danger" plain @click="sendLike">
                <el-icon style="vertical-align:-2px"><Pointer /></el-icon> 点赞 {{ room.likeCount ?? 0 }}
              </el-button>
              <el-button size="small" round @click="sendShare">
                <el-icon style="vertical-align:-2px"><Share /></el-icon> 分享
              </el-button>
            </div>
          </div>
          <div class="product-strip">
            <div class="strip-title">主播推荐商品</div>
            <div v-if="(room.products || []).length" class="strip-list">
              <div
                v-for="p in room.products"
                :key="p.id"
                class="strip-item"
                :class="{ highlight: highlightId === p.id }"
                @click="goProduct(p)"
              >
                <el-image :src="p.mainImage || p.image" fit="cover" style="width:64px;height:64px;border-radius:8px" />
                <div class="strip-info">
                  <div class="s-name">{{ p.name }}</div>
                  <PriceText :cents="p.flashPrice ?? p.price" :currency="p.currency" :size="16" />
                </div>
              </div>
            </div>
            <div v-else class="empty-tip" style="padding:20px">暂无带货商品</div>
          </div>
        </div>
        <div class="chat-col">
          <div class="chat-title">互动聊天</div>
          <div class="live-chat">
            <div class="chat-list">
              <div v-for="(m, i) in messages" :key="i" class="chat-item" :class="{ 'like-notice': m.type === 'like' }">
                <template v-if="m.type === 'like'">
                  ❤️ {{ m.user || '用户' }} 点了赞
                </template>
                <template v-else-if="m.type === 'product'">
                  🛒 主播推送了商品（{{ m.productName || m.productId }}）
                </template>
                <template v-else>
                  <span class="nick">{{ m.user || '游客' }}：</span><span class="msg">{{ m.content }}</span>
                </template>
              </div>
            </div>
            <div class="chat-input">
              <el-input v-model="chatText" placeholder="发言（演示环境仅展示他人消息）" disabled>
                <template #append><el-button disabled>发送</el-button></template>
              </el-input>
            </div>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="empty-tip page-panel">直播间不存在或已结束</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PriceText from '../components/PriceText.vue'
import { liveApi } from '../api'
import { subscribe, unsubscribe, onWsMessage, connectWs } from '../utils/ws'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

const room = ref(null)
const loading = ref(true)
const messages = ref([])
const chatText = ref('')
const highlightId = ref(null)

const roomId = () => route.params.id
let offWs = null

async function load() {
  loading.value = true
  try {
    room.value = await liveApi.detail(roomId())
  } catch {
    room.value = null
  } finally {
    loading.value = false
  }
}

function onLiveMessage(msg) {
  const d = msg.data || {}
  if (String(d.roomId) !== String(roomId())) return
  if (msg.type === 'live:chat') {
    messages.value.push({ type: 'chat', user: d.user, content: d.content })
  } else if (msg.type === 'live:like') {
    messages.value.push({ type: 'like', user: d.user, count: d.count })
    if (room.value) room.value.likeCount = d.count ?? room.value.likeCount
  } else if (msg.type === 'live:product') {
    messages.value.push({ type: 'product', productId: d.productId })
    highlightId.value = d.productId
    setTimeout(() => (highlightId.value = null), 4000)
  }
  // 消息数量限制
  if (messages.value.length > 100) messages.value.splice(0, messages.value.length - 100)
}

async function sendLike() {
  try {
    await liveApi.action(roomId(), 'like')
  } catch {
    /* 拦截器已提示 */
  }
}

async function sendShare() {
  try {
    await liveApi.action(roomId(), 'share')
    ElMessage.success('已分享直播间')
  } catch {
    /* 拦截器已提示 */
  }
}

function goProduct(p) {
  router.push(`/products/${p.id}`)
}

onMounted(async () => {
  await load()
  connectWs()
  subscribe(`live:${roomId()}`)
  offWs = onWsMessage(onLiveMessage)
})

onBeforeUnmount(() => {
  unsubscribe(`live:${roomId()}`)
  if (offWs) offWs()
})
</script>

<style scoped>
.live-layout {
  display: flex;
  gap: 16px;
  margin-top: 14px;
}

.player-col {
  flex: 1;
  min-width: 0;
}

.chat-col {
  width: 320px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.player {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.player-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #333, #111);
}

.player-placeholder p {
  margin-top: 10px;
}

.live-badge {
  position: absolute;
  left: 10px;
  top: 10px;
  background: #e1251b;
  color: #fff;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.viewer {
  position: absolute;
  right: 10px;
  top: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.room-title-bar {
  background: #fff;
  border-radius: 8px;
  padding: 14px 16px;
  margin-top: 10px;
}

.room-title-bar h2 {
  margin: 0 0 10px;
  font-size: 18px;
}

.room-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.merchant {
  color: #999;
  font-size: 13px;
  margin-right: auto;
}

.product-strip {
  background: #fff;
  border-radius: 8px;
  padding: 14px 16px;
  margin-top: 10px;
}

.strip-title {
  font-weight: 600;
  margin-bottom: 10px;
}

.strip-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
}

.strip-item {
  display: flex;
  gap: 10px;
  align-items: center;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: border-color 0.3s, background 0.3s;
}

.strip-item.highlight {
  border-color: #e1251b;
  background: #fff5f5;
}

.strip-info .s-name {
  font-size: 13px;
  margin-bottom: 4px;
  max-width: 200px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.chat-title {
  padding: 12px 14px;
  font-weight: 600;
  border-bottom: 1px solid #eee;
}

.chat-input {
  padding: 10px;
  border-top: 1px solid #eee;
}
</style>
