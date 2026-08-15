<template>
  <text class="countdown">{{ text }}</text>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { parseCountdown, pad2 } from '@/utils/format'

const props = defineProps({
  endTime: { type: [String, Number], default: '' },
  showDay: { type: Boolean, default: true },
})

const emit = defineEmits(['finish'])
const now = ref(Date.now())
let timer = null

const cd = computed(() => {
  now.value // 每秒触发重算
  return parseCountdown(props.endTime)
})
const text = computed(() => {
  const c = cd.value
  if (!props.endTime) return ''
  let t = pad2(c.h) + ':' + pad2(c.m) + ':' + pad2(c.s)
  if (props.showDay && c.d > 0) t = c.d + '天 ' + t
  return t
})

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
    if (cd.value.done) {
      clearInterval(timer)
      timer = null
      emit('finish')
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.countdown {
  font-variant-numeric: tabular-nums;
  color: #ff4d4f;
  font-weight: 600;
}
</style>