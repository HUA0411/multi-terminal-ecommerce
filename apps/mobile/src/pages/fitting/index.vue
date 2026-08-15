<template>
  <view class="fitting-page">
    <!-- 试衣表单 -->
    <view class="card">
      <view class="f-title">虚拟试衣</view>
      <view class="form-row flex">
        <text class="label">身高 (cm)</text>
        <input class="input flex-1" type="number" v-model="height" placeholder="如 170" />
      </view>
      <view class="form-row flex">
        <text class="label">体重 (kg)</text>
        <input class="input flex-1" type="number" v-model="weight" placeholder="如 60" />
      </view>
      <view class="form-row flex">
        <text class="label">性别</text>
        <view class="gender flex-1 flex">
          <view class="g-item" :class="{ on: gender === 'male' }" @click="gender = 'male'">男</view>
          <view class="g-item" :class="{ on: gender === 'female' }" @click="gender = 'female'">女</view>
        </view>
      </view>
      <view class="start-btn" @click="startFitting" :class="{ disabled: processing }">
        {{ processing ? '生成中...' : '开始试衣' }}
      </view>
    </view>

    <!-- 试衣结果 -->
    <view v-if="resultUrl" class="card result-card">
      <view class="f-title">试衣效果</view>
      <image class="result-img" :src="resultUrl" mode="widthFix" />
      <view v-if="recommendedSize" class="rec-size">推荐尺码：<text class="rec-val">{{ recommendedSize }}</text></view>
    </view>

    <!-- 尺码表 -->
    <view v-if="sizeChart.length" class="card">
      <view class="f-title">尺码参考表</view>
      <view class="table">
        <view class="tr head">
          <view class="td">尺码</view>
          <view class="td">胸围</view>
          <view class="td">腰围</view>
          <view class="td">臀围</view>
          <view class="td">肩宽</view>
        </view>
        <view class="tr" v-for="(row, i) in sizeChart" :key="i">
          <view class="td">{{ row.size }}</view>
          <view class="td">{{ row.bust || '-' }}</view>
          <view class="td">{{ row.waist || '-' }}</view>
          <view class="td">{{ row.hip || '-' }}</view>
          <view class="td">{{ row.shoulder || '-' }}</view>
        </view>
      </view>
    </view>

    <EmptyState v-if="!sizeChart.length && !processing" :icon="'👗'" :text="'该商品暂无试衣数据'" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import EmptyState from '@/components/EmptyState.vue'
import { fittingApi } from '@/api'

const productId = ref('')
const sizeChart = ref([])
const modelUrl = ref('')
const recommendedSize = ref('')
const height = ref('')
const weight = ref('')
const gender = ref('female')
const sessionId = ref('')
const processing = ref(false)
const resultUrl = ref('')
let pollTimer = null

onLoad(async (options) => {
  productId.value = options.productId || ''
  if (!productId.value) return
  try {
    const data = await fittingApi.product(productId.value)
    sizeChart.value = (data && data.sizeChart) || []
    modelUrl.value = (data && data.modelUrl) || ''
    recommendedSize.value = (data && data.recommendedSize) || ''
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
})

async function startFitting() {
  if (!productId.value) {
    uni.showToast({ title: '缺少商品信息', icon: 'none' })
    return
  }
  if (!height.value || !weight.value) {
    uni.showToast({ title: '请填写身高体重', icon: 'none' })
    return
  }
  processing.value = true
  try {
    const data = await fittingApi.createSession({
      productId: productId.value,
      height: Number(height.value),
      weight: Number(weight.value),
      gender: gender.value,
    })
    sessionId.value = data.sessionId
    pollResult()
  } catch (e) {
    processing.value = false
    uni.showToast({ title: e.message || '创建试衣失败', icon: 'none' })
  }
}

function pollResult() {
  let tries = 0
  clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    tries += 1
    try {
      const st = await fittingApi.session(sessionId.value)
      if (st.status === 'ready' || st.resultUrl) {
        clearInterval(pollTimer)
        resultUrl.value = st.resultUrl
        if (st.recommendedSize) recommendedSize.value = st.recommendedSize
        processing.value = false
        uni.showToast({ title: '试衣完成', icon: 'success' })
      } else if (tries > 30) {
        clearInterval(pollTimer)
        processing.value = false
        uni.showToast({ title: '生成超时，请重试', icon: 'none' })
      }
    } catch (e) {
      clearInterval(pollTimer)
      processing.value = false
      uni.showToast({ title: '查询失败', icon: 'none' })
    }
  }, 2000)
}

onUnload(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style lang="scss" scoped>
.fitting-page {
  padding: 20rpx;
}
.f-title {
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 20rpx;
}
.form-row {
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}
.label {
  width: 180rpx;
  font-size: 26rpx;
  color: #333;
}
.input {
  font-size: 26rpx;
  text-align: right;
}
.gender {
  justify-content: flex-end;
}
.g-item {
  padding: 10rpx 40rpx;
  border: 2rpx solid #ddd;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #666;
  margin-left: 16rpx;
}
.g-item.on {
  border-color: #ff4d4f;
  color: #ff4d4f;
  background: #fff0f0;
}
.start-btn {
  margin-top: 28rpx;
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  color: #fff;
  text-align: center;
  padding: 22rpx 0;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
}
.start-btn.disabled {
  opacity: 0.6;
}
.result-card {
  margin-top: 20rpx;
}
.result-img {
  width: 100%;
  border-radius: 12rpx;
  background: #f2f3f5;
}
.rec-size {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: #333;
}
.rec-val {
  color: #ff4d4f;
  font-weight: 700;
}
.table {
  width: 100%;
}
.tr {
  display: flex;
  border-bottom: 2rpx solid #f5f5f5;
}
.tr.head {
  background: #fafafa;
  font-weight: 600;
}
.td {
  flex: 1;
  text-align: center;
  font-size: 24rpx;
  padding: 14rpx 4rpx;
}
</style>
