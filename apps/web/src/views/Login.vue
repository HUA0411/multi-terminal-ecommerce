<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-title">欢迎登录 {{ settings.storeName }}</div>
      <div class="auth-sub">多端电商演示 · 账号密码登录 / 快速注册</div>
      <el-tabs v-model="tab">
        <el-tab-pane label="登录" name="login">
          <el-form label-position="top">
            <el-form-item label="账号">
              <el-input v-model="account" placeholder="手机号或昵称" size="large">
                <template #prefix><el-icon><User /></el-icon></template>
              </el-input>
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="password" type="password" show-password placeholder="请输入密码" size="large" @keyup.enter="doLogin">
                <template #prefix><el-icon><Lock /></el-icon></template>
              </el-input>
            </el-form-item>
            <el-button type="danger" size="large" style="width:100%" :loading="loading" @click="doLogin">登 录</el-button>
          </el-form>
          <div class="seed-tip">演示账号：</div>
          <div class="seed-row">
            <el-tag size="small" style="cursor:pointer" @click="fill('admin', 'admin123')">admin / admin123</el-tag>
            <el-tag size="small" type="warning" style="cursor:pointer" @click="fill('merchant', 'merchant123')">merchant / merchant123</el-tag>
            <el-tag size="small" type="success" style="cursor:pointer" @click="fill('user', 'user123')">user / user123</el-tag>
          </div>
        </el-tab-pane>
        <el-tab-pane label="注册" name="register">
          <el-form label-position="top">
            <el-form-item label="手机号" required>
              <el-input v-model="regPhone" placeholder="手机号" size="large" maxlength="11" />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="regNick" placeholder="昵称（选填）" size="large" />
            </el-form-item>
            <el-form-item label="密码" required>
              <el-input v-model="regPassword" type="password" show-password placeholder="设置密码（至少6位）" size="large" />
            </el-form-item>
            <el-button type="danger" size="large" style="width:100%" :loading="loading" @click="doRegister">注 册</el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <div style="text-align:center;margin-top:14px">
        <router-link to="/" style="color:#999;font-size:13px">← 返回首页</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login, register } from '../stores/auth'
import { settings } from '../stores/settings'

const route = useRoute()
const router = useRouter()

const tab = ref('login')
const account = ref('')
const password = ref('')
const regPhone = ref('')
const regNick = ref('')
const regPassword = ref('')
const loading = ref(false)

function fill(a, p) {
  account.value = a
  password.value = p
}

async function doLogin() {
  if (!account.value || !password.value) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    const data = await login(account.value, password.value)
    ElMessage.success(`欢迎回来，${data.user?.nickname || data.user?.account || ''}`)
    const redirect = route.query.redirect || '/'
    router.push(String(redirect))
  } catch {
    /* 拦截器已提示 */
  } finally {
    loading.value = false
  }
}

async function doRegister() {
  if (!regPhone.value || !regPassword.value) {
    ElMessage.warning('请填写手机号和密码')
    return
  }
  if (regPassword.value.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }
  loading.value = true
  try {
    await register({
      phone: regPhone.value,
      password: regPassword.value,
      nickname: regNick.value || undefined,
    })
    ElMessage.success('注册成功，已自动登录')
    router.push(route.query.redirect || '/')
  } catch {
    /* 拦截器已提示 */
  } finally {
    loading.value = false
  }
}
</script>
