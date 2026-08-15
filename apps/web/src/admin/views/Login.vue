<template>
  <div class="admin-login-wrap">
    <div class="admin-login-card">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:22px;font-weight:700">云商城 · 管理后台</div>
        <div style="color:#999;font-size:13px;margin-top:6px">管理员 / 商家登录</div>
      </div>
      <el-form label-position="top">
        <el-form-item label="账号">
          <el-input v-model="account" size="large" placeholder="管理员或商家账号">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="password" type="password" size="large" show-password placeholder="请输入密码" @keyup.enter="doLogin">
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-button type="primary" size="large" style="width:100%" :loading="loading" @click="doLogin">登 录</el-button>
      </el-form>
      <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <el-tag size="small" style="cursor:pointer" @click="fill('admin', 'admin123')">admin</el-tag>
        <el-tag size="small" type="warning" style="cursor:pointer" @click="fill('merchant', 'merchant123')">merchant</el-tag>
      </div>
      <div style="text-align:center;margin-top:12px">
        <a href="/" style="color:#999;font-size:13px">← 返回门店端</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '../../stores/auth'

const router = useRouter()
const account = ref('')
const password = ref('')
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
    await login(account.value, password.value)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch {
    /* 拦截器已提示 */
  } finally {
    loading.value = false
  }
}
</script>
