<template>
  <div class="not-found page-container">
    <div class="page-panel" style="text-align:center;padding:80px 0">
      <div style="font-size:80px;font-weight:700;color:#eee">404</div>
      <p style="color:#999">抱歉，您访问的页面不存在</p>
      <el-button type="danger" @click="router.push('/')">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>
