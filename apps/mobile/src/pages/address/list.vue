<template>
  <view class="address-list">
    <view v-if="list.length" class="addr-list">
      <view class="card addr" v-for="a in list" :key="a.id" @click="onSelect(a)">
        <view class="flex">
          <view class="flex-1">
            <view class="a-line">
              {{ a.name }} <text class="a-phone">{{ a.phone }}</text>
              <text v-if="a.isDefault" class="default-tag">默认</text>
            </view>
            <view class="a-detail">{{ a.detail }}</view>
          </view>
          <view class="a-ops flex">
            <text class="a-op" @click.stop="edit(a)">编辑</text>
            <text class="a-op del" @click.stop="remove(a)">删除</text>
          </view>
        </view>
      </view>
    </view>
    <EmptyState v-else :icon="'📍'" :text="'还没有收货地址'" />
    <view class="add-btn" @click="edit(null)">＋ 新增收货地址</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import EmptyState from '@/components/EmptyState.vue'
import { getAddresses, removeAddress } from '@/utils/address'

const list = ref([])

onLoad((options) => {
  selectMode.value = !!(options && options.select === '1')
})

onShow(() => {
  list.value = getAddresses()
})

function onRefresh() {
  list.value = getAddresses()
}

uni.$on('address:refresh', onRefresh)
onUnload(() => uni.$off('address:refresh', onRefresh))

function edit(a) {
  uni.navigateTo({ url: '/pages/address/edit' + (a ? '?id=' + a.id : '') })
}

function remove(a) {
  uni.showModal({
    title: '提示',
    content: '确定删除该地址吗？',
    success: (r) => {
      if (!r.confirm) return
      removeAddress(a.id)
      list.value = getAddresses()
    },
  })
}

function onSelect(a) {
  if (selectMode.value) {
    uni.$emit('address-selected', a)
    uni.navigateBack()
  }
}
</script>

<style lang="scss" scoped>
.address-list {
  padding: 20rpx;
  padding-bottom: 140rpx;
}
.a-line {
  font-size: 30rpx;
  font-weight: 600;
}
.a-phone {
  font-size: 26rpx;
  color: #666;
  font-weight: 400;
  margin-left: 12rpx;
}
.default-tag {
  background: #fff0f0;
  color: #ff4d4f;
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  margin-left: 12rpx;
}
.a-detail {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}
.a-ops {
  margin-top: 12rpx;
}
.a-op {
  font-size: 24rpx;
  color: #666;
  margin-left: 24rpx;
  padding: 8rpx;
}
.a-op.del {
  color: #ff4d4f;
}
.add-btn {
  position: fixed;
  left: 20rpx;
  right: 20rpx;
  bottom: 40rpx;
  background: linear-gradient(135deg, #ff6b35, #ff3b3b);
  color: #fff;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
}
</style>