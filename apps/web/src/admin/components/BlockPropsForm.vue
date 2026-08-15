<template>
  <div class="block-props-form">
    <!-- banner：轮播 -->
    <template v-if="type === 'banner'">
      <el-form-item label="高度(px)">
        <el-input-number v-model="p.height" :min="100" :max="800" style="width:160px" />
      </el-form-item>
      <div class="list-title">图片列表</div>
      <div v-for="(img, i) in p.images" :key="i" class="img-row">
        <el-input v-model="img.image" placeholder="图片 URL" />
        <el-input v-model="img.link" placeholder="跳转链接（/products 等，可空）" style="width:200px" />
        <el-button link type="danger" :disabled="p.images.length <= 1" @click="p.images.splice(i, 1)">删</el-button>
      </div>
      <el-button size="small" @click="p.images.push({ image: '', link: '' })">+ 添加图片</el-button>
    </template>

    <!-- nav：导航宫格 -->
    <template v-else-if="type === 'nav'">
      <div class="list-title">入口列表</div>
      <div v-for="(item, i) in p.items" :key="i" class="img-row">
        <el-select v-model="item.icon" style="width:130px" filterable placeholder="图标">
          <el-option v-for="ic in ICONS" :key="ic" :label="ic" :value="ic">
            <span style="display:inline-flex;align-items:center;gap:6px"><el-icon><component :is="ic" /></el-icon>{{ ic }}</span>
          </el-option>
        </el-select>
        <el-input v-model="item.name" placeholder="名称" style="width:120px" />
        <el-input v-model="item.link" placeholder="链接（/products 等）" style="width:200px" />
        <el-button link type="danger" :disabled="p.items.length <= 1" @click="p.items.splice(i, 1)">删</el-button>
      </div>
      <el-button size="small" @click="p.items.push({ name: '入口', link: '/products', icon: 'Grid' })">+ 添加入口</el-button>
    </template>

    <!-- goods：商品列表 -->
    <template v-else-if="type === 'goods'">
      <el-form-item label="区块标题">
        <el-input v-model="p.title" placeholder="如：精选好物" />
      </el-form-item>
      <el-form-item label="分类">
        <el-tree-select
          v-model="p.categoryId"
          :data="categories"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          node-key="id"
          check-strictly
          clearable
          placeholder="按分类推荐（可空）"
          style="width:100%"
        />
      </el-form-item>
      <el-form-item label="商品ID">
        <el-input v-model="p.goodsIds" placeholder="指定商品ID，逗号分隔（优先于分类）" />
      </el-form-item>
      <el-form-item label="展示数量">
        <el-input-number v-model="p.count" :min="1" :max="20" style="width:160px" />
      </el-form-item>
    </template>

    <!-- flashsale：限时秒杀（服务端渲染进行中活动） -->
    <template v-else-if="type === 'flashsale'">
      <el-form-item label="区块标题">
        <el-input v-model="p.title" placeholder="如：限时秒杀" />
      </el-form-item>
      <el-form-item label="展示数量">
        <el-input-number v-model="p.count" :min="1" :max="12" style="width:160px" />
      </el-form-item>
      <el-alert type="info" :closable="false" title="自动展示进行中的秒杀活动（剩余数量/倒计时由门店端渲染）" />
    </template>

    <!-- groupon：拼团专区（服务端渲染拼团中活动） -->
    <template v-else-if="type === 'groupon'">
      <el-form-item label="区块标题">
        <el-input v-model="p.title" placeholder="如：拼团专区" />
      </el-form-item>
      <el-form-item label="展示数量">
        <el-input-number v-model="p.count" :min="1" :max="12" style="width:160px" />
      </el-form-item>
      <el-alert type="info" :closable="false" title="自动展示拼团中的活动（已成团/已失败自动隐藏）" />
    </template>

    <!-- image：图片 -->
    <template v-else-if="type === 'image'">
      <el-form-item label="图片 URL" required>
        <el-input v-model="p.image" placeholder="https://..." />
      </el-form-item>
      <el-form-item label="跳转链接">
        <el-input v-model="p.link" placeholder="/products 等（可空）" />
      </el-form-item>
      <el-form-item label="宽度">
        <el-input v-model="p.width" placeholder="如 100% / 800px" />
      </el-form-item>
      <el-form-item label="高度">
        <el-input v-model="p.height" placeholder="如 200px（可空）" />
      </el-form-item>
    </template>

    <!-- rich：富文本 -->
    <template v-else-if="type === 'rich'">
      <el-form-item label="HTML 内容">
        <el-input v-model="p.content" type="textarea" :rows="6" placeholder="支持 <p>/<img>/<a> 等 HTML" />
      </el-form-item>
    </template>

    <!-- video：视频 -->
    <template v-else-if="type === 'video'">
      <el-form-item label="视频 URL" required>
        <el-input v-model="p.url" placeholder="https://...mp4" />
      </el-form-item>
      <el-form-item label="封面图">
        <el-input v-model="p.poster" placeholder="封面 URL（可空）" />
      </el-form-item>
      <el-form-item label="标题">
        <el-input v-model="p.title" placeholder="视频标题（可空）" />
      </el-form-item>
    </template>

    <!-- notice：公告 -->
    <template v-else-if="type === 'notice'">
      <el-form-item label="公告内容" required>
        <el-input v-model="p.text" placeholder="公告文字" />
      </el-form-item>
      <el-form-item label="跳转链接">
        <el-input v-model="p.link" placeholder="点击公告跳转（可空）" />
      </el-form-item>
      <el-form-item label="背景色">
        <el-color-picker v-model="p.bgColor" />
        <span style="margin-left:10px;color:#999;font-size:12px">{{ p.bgColor }}</span>
      </el-form-item>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: { type: String, required: true },
  // 直接传入父级的 props 对象（reactive），本组件原地编辑
  props: { type: Object, default: () => ({}) },
  categories: { type: Array, default: () => [] },
})

const p = computed(() => props.props)

const ICONS = [
  'HomeFilled', 'Grid', 'ShoppingCart', 'Goods', 'User', 'Star', 'Trophy',
  'Present', 'Headset', 'Tickets', 'Collection', 'Discount', 'Promotion',
  'Shop', 'Location', 'Search', 'Camera', 'VideoCamera', 'ChatDotRound',
]
</script>

<style scoped>
.list-title {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.img-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
</style>
