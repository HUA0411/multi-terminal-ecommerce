<template>
  <footer class="store-footer">
    <div class="page-container">
      <div class="cols">
        <div>
          <h4>{{ settings.storeName }}</h4>
          <p>多端电商演示系统（MVP）</p>
          <p>Vue 3 + Vite + Element Plus</p>
        </div>
        <div>
          <h4>购物指南</h4>
          <p @click="router.push('/flashsales')">限时秒杀</p>
          <p @click="router.push('/coupons')">领券中心</p>
          <p @click="router.push('/live')">直播带货</p>
        </div>
        <div>
          <h4>我的服务</h4>
          <p @click="router.push('/orders')">我的订单</p>
          <p @click="router.push('/my/coupons')">我的优惠券</p>
          <p @click="router.push('/points')">我的积分</p>
        </div>
        <div>
          <h4>合作伙伴</h4>
          <p><a href="/admin.html" target="_blank">管理后台入口</a></p>
          <p><a href="https://github.com" target="_blank">开源项目</a></p>
        </div>
      </div>
      <div class="copyright">
        © 2024 {{ settings.storeName }} · 本页面为前后端分离演示，接口文档见 docs/api.md
      </div>
    </div>
  </footer>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { settings } from '../../stores/settings'

const router = useRouter()
</script>
