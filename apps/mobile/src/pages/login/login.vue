<template>
  <view class="login-page">
    <view class="logo-wrap">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <view class="app-name">多端商城</view>
    </view>

    <!-- 模式切换 -->
    <view class="mode-tabs flex">
      <view class="mode-tab" :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</view>
      <view class="mode-tab" :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</view>
    </view>

    <!-- 登录表单 -->
    <view class="card form" v-if="mode === 'login'">
      <view class="form-row flex">
        <text class="f-label">账号</text>
        <input class="f-input flex-1" v-model="account" placeholder="手机号或昵称" />
      </view>
      <view class="form-row flex">
        <text class="f-label">密码</text>
        <input class="f-input flex-1" v-model="password" password placeholder="请输入密码" />
      </view>
      <view class="submit-btn" @click="doLogin" :class="{ disabled: submitting }">{{ submitting ? '登录中...' : '登 录' }}</view>
      <view class="demo-tip">测试账号：user / user123</view>
    </view>

    <!-- 注册表单 -->
    <view class="card form" v-if="mode === 'register'">
      <view class="form-row flex">
        <text class="f-label">手机号</text>
        <input class="f-input flex-1" v-model="phone" type="number" placeholder="请输入手机号" />
      </view>
      <view class="form-row flex">
        <text class="f-label">昵称</text>
        <input class="f-input flex-1" v-model="nickname" placeholder="选填" />
      </view>
      <view class="form-row flex">
        <text class="f-label">密码</text>
        <input class="f-input flex-1" v-model="password" password placeholder="请设置密码" />
      </view>
      <view class="submit-btn" @click="doRegister" :class="{ disabled: submitting }">{{ submitting ? '注册中...' : '注 册' }}</view>
    </view>

    <!-- 微信登录 -->
    <view class="wx-btn" @click="doWechat">微信一键登录（模拟）</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { authApi, cartApi } from '@/api'
import { setLogin, TAB_PAGES } from '@/store'
import { getGuestCart, clearGuestCart } from '@/utils/guestCart'

const mode = ref('login')
const account = ref('')
const phone = ref('')
const nickname = ref('')
const password = ref('')
const submitting = ref(false)
let redirect = ''

onLoad((options) => {
  if (options.redirect) redirect = decodeURIComponent(options.redirect)
})

async function mergeGuestCart() {
  const guest = getGuestCart()
  if (!guest.length) return
  try {
    await cartApi.merge({ items: guest.map((i) => ({ skuId: i.skuId, quantity: i.quantity })) })
    clearGuestCart()
  } catch (e) {
    console.warn('merge guest cart failed', e.message)
  }
}

function afterLogin(token, user) {
  setLogin(token, user)
  mergeGuestCart().finally(() => {
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(goBack, 600)
  })
}

function goBack() {
  if (redirect) {
    if (TAB_PAGES.includes(redirect.split('?')[0])) {
      uni.switchTab({ url: redirect.split('?')[0] })
    } else {
      uni.redirectTo({ url: redirect })
    }
  } else {
    uni.switchTab({ url: '/pages/mine/mine' })
  }
}

async function doLogin() {
  if (!account.value || !password.value) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const data = await authApi.login({ account: account.value, password: password.value })
    afterLogin(data.token, data.user)
  } catch (e) {
    uni.showToast({ title: e.message || '登录失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function doRegister() {
  if (!phone.value || !password.value) {
    uni.showToast({ title: '请输入手机号和密码', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const data = await authApi.register({ phone: phone.value, password: password.value, nickname: nickname.value })
    afterLogin(data.token, data.user)
  } catch (e) {
    uni.showToast({ title: e.message || '注册失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function doWechat() {
  submitting.value = true
  try {
    const data = await authApi.wechat({ code: 'mock_wechat_code_' + Date.now() })
    afterLogin(data.token, data.user)
  } catch (e) {
    uni.showToast({ title: e.message || '微信登录失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  padding: 60rpx 40rpx;
}
.logo-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48rpx;
}
.logo {
  width: 140rpx;
  height: 140rpx;
  border-radius: 28rpx;
}
.app-name {
  font-size: 36rpx;
  font-weight: 700;
  margin-top: 16rpx;
}
.mode-tabs {
  justify-content: center;
  margin-bottom: 32rpx;
}
.mode-tab {
  padding: 12rpx 60rpx;
  font-size: 30rpx;
  color: #999;
  border-bottom: 4rpx solid transparent;
}
.mode-tab.active {
  color: #ff4d4f;
  font-weight: 700;
  border-bottom-color: #ff4d4f;
}
.form {
  padding: 24rpx 32rpx;
}
.form-row {
  padding: 24rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}
.f-label {
  width: 140rpx;
  font-size: 28rpx;
  color: #333;
}
.f-input {
  font-size: 28rpx;
}
.submit-btn {
  margin-top: 32rpx;
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  color: #fff;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
}
.submit-btn.disabled {
  opacity: 0.6;
}
.demo-tip {
  text-align: center;
  color: #999;
  font-size: 22rpx;
  margin-top: 20rpx;
}
.wx-btn {
  margin-top: 32rpx;
  background: #07c160;
  color: #fff;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 44rpx;
  font-size: 30rpx;
}
</style>
