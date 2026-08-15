<template>
  <view class="edit-page">
    <view class="card">
      <view class="form-row flex">
        <text class="label">收货人</text>
        <input class="input flex-1" v-model="form.name" placeholder="请输入姓名" />
      </view>
      <view class="form-row flex">
        <text class="label">手机号</text>
        <input class="input flex-1" v-model="form.phone" type="number" placeholder="请输入手机号" />
      </view>
      <view class="form-row flex">
        <text class="label">详细地址</text>
        <input class="input flex-1" v-model="form.detail" placeholder="省市区 + 街道门牌" />
      </view>
      <view class="form-row flex">
        <text class="label">设为默认</text>
        <switch :checked="form.isDefault" color="#ff4d4f" @change="onDefaultChange" />
      </view>
    </view>
    <view class="save-btn" @click="save">保 存</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { addAddress, updateAddress, findAddress } from '@/utils/address'

const form = ref({ name: '', phone: '', detail: '', isDefault: false })

onLoad((options) => {
  if (options.id) {
    const a = findAddress(options.id)
    if (a) form.value = { ...a }
  }
})

function onDefaultChange(e) {
  form.value.isDefault = e.detail.value
}

function save() {
  if (!form.value.name.trim()) return uni.showToast({ title: '请填写收货人', icon: 'none' })
  if (!form.value.phone.trim()) return uni.showToast({ title: '请填写手机号', icon: 'none' })
  if (!form.value.detail.trim()) return uni.showToast({ title: '请填写详细地址', icon: 'none' })
  if (form.value.id) updateAddress(form.value)
  else addAddress(form.value)
  uni.$emit('address:refresh')
  uni.showToast({ title: '保存成功', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 500)
}
</script>

<style lang="scss" scoped>
.edit-page {
  padding: 20rpx;
}
.form-row {
  padding: 24rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}
.label {
  width: 180rpx;
  font-size: 28rpx;
  color: #333;
}
.input {
  font-size: 28rpx;
}
.save-btn {
  margin-top: 40rpx;
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  color: #fff;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
}
</style>
