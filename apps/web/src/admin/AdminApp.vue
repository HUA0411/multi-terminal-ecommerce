<template>
  <div class="admin-shell">
    <!-- 登录页独立布局 -->
    <router-view v-if="route.name === 'admin-login'" />

    <el-container v-else>
      <el-aside width="210px" class="aside">
        <div class="admin-logo">
          云商城<span class="sub">管理后台</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#001529"
          text-color="rgba(255,255,255,0.7)"
          active-text-color="#fff"
          style="border-right:none"
        >
          <el-menu-item index="/dashboard">
            <el-icon><Odometer /></el-icon><span>数据看板</span>
          </el-menu-item>
          <el-menu-item index="/products">
            <el-icon><Goods /></el-icon><span>商品管理</span>
          </el-menu-item>
          <el-menu-item index="/orders">
            <el-icon><List /></el-icon><span>订单管理</span>
          </el-menu-item>
          <el-menu-item index="/aftersales">
            <el-icon><RefreshLeft /></el-icon><span>售后管理</span>
          </el-menu-item>
          <el-menu-item index="/marketing">
            <el-icon><Promotion /></el-icon><span>营销中心</span>
          </el-menu-item>
          <el-menu-item index="/cms">
            <el-icon><EditPen /></el-icon><span>CMS 页面</span>
          </el-menu-item>
          <el-menu-item v-if="auth.isAdmin" index="/merchants">
            <el-icon><OfficeBuilding /></el-icon><span>商家审核</span>
          </el-menu-item>
          <el-menu-item v-if="auth.isAdmin" index="/users">
            <el-icon><User /></el-icon><span>用户管理</span>
          </el-menu-item>
          <el-menu-item v-if="auth.isAdmin" index="/risk">
            <el-icon><Warning /></el-icon><span>风控中心</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon><span>语言与货币</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header class="header" height="56px">
          <div class="breadcrumb">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item>云商城管理后台</el-breadcrumb-item>
              <el-breadcrumb-item>{{ route.meta.title || '' }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <el-tag v-if="auth.isAdmin" type="danger" size="small">管理员</el-tag>
            <el-tag v-else-if="auth.isMerchant" type="warning" size="small">商家</el-tag>
            <el-tag v-else type="info" size="small">{{ auth.role || '用户' }}</el-tag>
            <el-dropdown @command="onCommand">
              <span class="user-entry">
                <el-avatar :size="30" :src="auth.user?.avatar" style="background:#409EFF">
                  {{ (auth.user?.nickname || 'A').slice(0, 1) }}
                </el-avatar>
                <span style="margin:0 6px">{{ auth.user?.nickname }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="storefront">访问门店端</el-dropdown-item>
                  <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        <el-main class="admin-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { auth, logout } from '../stores/auth'

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => {
  const p = route.path
  if (p.startsWith('/cms/editor')) return '/cms'
  return p
})

function onCommand(cmd) {
  if (cmd === 'logout') {
    logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } else if (cmd === 'storefront') {
    window.open('/', '_blank')
  }
}
</script>

<style scoped>
.aside {
  background: #001529;
  overflow-x: hidden;
}

.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  z-index: 5;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-entry {
  display: flex;
  align-items: center;
  cursor: pointer;
  outline: none;
  color: #333;
}
</style>