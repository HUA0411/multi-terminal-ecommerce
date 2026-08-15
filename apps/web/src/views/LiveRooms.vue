<template>
  <div class="live-rooms page-container">
    <div class="page-panel">
      <div class="section-title">
        <span class="bar"></span>
        <h3>直播带货</h3>
      </div>
      <el-skeleton v-if="loading" :rows="4" animated />
      <template v-else>
        <div v-if="rooms.length" class="room-grid">
          <div v-for="r in rooms" :key="r.id" class="room-card" @click="router.push(`/live/${r.id}`)">
            <div class="room-cover-wrap">
              <el-image :src="r.cover" fit="cover" class="room-cover" />
              <span class="live-badge"><el-icon><VideoCamera /></el-icon> 直播中</span>
              <span class="viewer"><el-icon><View /></el-icon> {{ r.viewerCount ?? 0 }}</span>
            </div>
            <div class="room-body">
              <div class="room-title">{{ r.title }}</div>
              <div class="room-meta">
                <span class="merchant">{{ r.merchantName || '官方直播间' }}</span>
                <span class="likes"><el-icon><Pointer /></el-icon> {{ r.likeCount ?? 0 }}</span>
              </div>
            </div>
          </div>
        </div>
        <el-empty v-else description="当前没有直播中的房间" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { liveApi } from '../api'

const router = useRouter()
const rooms = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const data = await liveApi.rooms({ status: 'live' })
    rooms.value = Array.isArray(data) ? data : data.list || []
  } catch {
    rooms.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.room-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.room-card {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #eee;
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}

.room-card:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.room-cover-wrap {
  position: relative;
}

.room-cover {
  width: 100%;
  height: 190px;
  display: block;
}

.live-badge {
  position: absolute;
  left: 8px;
  top: 8px;
  background: #e1251b;
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.viewer {
  position: absolute;
  right: 8px;
  top: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.room-body {
  padding: 12px;
}

.room-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.room-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.likes {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
</style>
