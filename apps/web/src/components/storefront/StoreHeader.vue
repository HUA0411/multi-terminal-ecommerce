<template>
  <header class="store-header">
    <div class="topbar">
      <div class="page-container">
        <span>{{ settings.storeName }} · 多端电商演示环境</span>
        <span class="topbar-right">
          <el-dropdown @command="onLangCommand">
            <span class="topbar-link"><el-icon><Connection /></el-icon> {{ currentLangName }} <el-icon><ArrowDown /></el-icon></span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="l in settings.languages" :key="l.code" :command="l.code">{{ l.name }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown @command="onCurrencyCommand">
            <span class="topbar-link"><el-icon><Coin /></el-icon> {{ settings.currency || settings.defaultCurrency }} <el-icon><ArrowDown /></el-icon></span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="c in settings.currencies" :key="c.code" :command="c.code">
                  {{ c.symbol }} {{ c.code }} - {{ c.name }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </span>
      </div>
    </div>
    <div class="mainbar page-container">
      <div class="logo" @click="router.push('/')">
        <el-image v-if="settings.logo" :src="settings.logo" fit="cover" style="width:44px;height:44px;border-radius:8px" />
        <div class="logo-name">{{ settings.storeName }}</div>
      </div>
      <div class="search">
        <el-input
          v-model="keyword"
          placeholder="搜索商品 / 品牌 / 关键词"
          size="large"
          clearable
          @keyup.enter="doSearch"
        >
          <template #append>
            <el-button size="large" type="danger" @click="doSearch">搜索</el-button>
          </template>
        </el-input>
      </div>
      <nav class="nav">
        <router-link class="nav-link" to="/">首页</router-link>
        <router-link class="nav-link" to="/products">全部商品</router-link>
        <router-link class="nav-link" to="/flashsales">限时秒杀</router-link>
        <router-link class="nav-link" to="/live">直播带货</router-link>
        <router-link class="nav-link" to="/coupons">领券中心</router-link>
        <router-link class="nav-link" to="/points">积分</router-link>
        <router-link class="cart-link" to="/cart">
          <el-badge :value="cart.totalQuantity" :max="99" :hidden="!cart.totalQuantity">
            <el-icon :size="22"><ShoppingCart /></el-icon>
          </el-badge>
          <span style="margin-left:4px">购物车</span>
        </router-link>
      </nav>
      <div class="user-area">
        <template v-if="auth.isLogin">
          <el-dropdown @command="onUserCommand">
            <span class="topbar-link user-entry">
              <el-avatar :size="28" :src="auth.user?.avatar" style="background:#e1251b">
                {{ (auth.user?.nickname || 'U').slice(0, 1) }}
              </el-avatar>
              <span style="margin-left:6px">{{ auth.user?.nickname }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="orders">我的订单</el-dropdown-item>
                <el-dropdown-item command="coupons">我的优惠券</el-dropdown-item>
                <el-dropdown-item command="points">我的积分</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <el-button v-else type="danger" round size="small" @click="router.push('/login')">登录</el-button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { auth, logout } from '../../stores/auth'
import { cart, refreshCart } from '../../stores/cart'
import { settings, setCurrency } from '../../stores/settings'
import { loadI18n } from '../../stores/i18n'
import { closeWs } from '../../utils/ws'

const router = useRouter()
const keyword = ref('')

const currentLangName = computed(() => {
  const l = settings.languages.find((x) => x.code === (settings.language || settings.defaultLanguage))
  return l ? l.name : '简体中文'
})

function doSearch() {
  router.push({ path: '/products', query: keyword.value ? { keyword: keyword.value } : {} })
}

async function onLangCommand(code) {
  await loadI18n(code)
  ElMessage.success('语言已切换')
}

async function onCurrencyCommand(code) {
  setCurrency(code)
  ElMessage.success('币种已切换，数据将按新币种换算')
  if (auth.isLogin) refreshCart(code)
}

function onUserCommand(cmd) {
  if (cmd === 'logout') {
    logout()
    ElMessage.success('已退出登录')
    router.push('/')
    return
  }
  router.push({ orders: '/orders', coupons: '/my/coupons', points: '/points' }[cmd])
}
</script>

<style scoped>
.topbar-right {
  display: flex;
  gap: 18px;
  align-items: center;
}

.topbar-link {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: inherit;
  outline: none;
}

.user-area {
  flex-shrink: 0;
}

.user-entry {
  color: #333;
}
</style>
