<template>
  <div class="store-app">
    <StoreHeader />
    <main class="store-main">
      <router-view />
    </main>
    <StoreFooter />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import StoreHeader from './components/storefront/StoreHeader.vue'
import StoreFooter from './components/storefront/StoreFooter.vue'
import { auth } from './stores/auth'
import { cart, refreshCart } from './stores/cart'
import { settings, loadSettings } from './stores/settings'
import { loadI18n } from './stores/i18n'
import { connectWs, subscribe, onWsMessage, closeWs } from './utils/ws'

// 登录后：刷新购物车 + 建立 WebSocket（订阅 cart/notify）
watch(
  () => auth.token,
  (token) => {
    if (token) {
      refreshCart(settings.currency)
      connectWs()
      subscribe('cart')
      subscribe('notify')
    } else {
      closeWs()
      cart.items = []
      cart.totalQuantity = 0
    }
  }
)

onMounted(async () => {
  await loadSettings()
  if (!settings.language) settings.language = settings.defaultLanguage
  await loadI18n(settings.language)
  if (auth.isLogin) {
    refreshCart(settings.currency)
    connectWs()
    subscribe('cart')
    subscribe('notify')
  }
  // 实时购物车推送
  onWsMessage((msg) => {
    if (msg.type === 'cart:changed') {
      refreshCart(settings.currency)
    } else if (msg.type === 'flashsale:started') {
      // 秒杀开始通知（可选展示）
      const d = msg.data || {}
      ElMessage.info(`秒杀开始：商品 #${d.productId} 已开抢`)
    }
  })
})

</script>

<style>
.store-main {
  min-height: calc(100vh - 190px);
}
</style>
