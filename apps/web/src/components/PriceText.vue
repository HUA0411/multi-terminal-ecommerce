<template>
  <span class="price">
    <span class="price-symbol">{{ symbol }}</span>
    <span class="price-amount">{{ amount }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { fenToYuan, currencySymbolOf } from '../utils/format'
import { currencySymbol } from '../stores/settings'

const props = defineProps({
  // 分
  cents: { type: [Number, String], default: 0 },
  currency: { type: String, default: 'CNY' },
  symbol: { type: String, default: '' },
  size: { type: [Number, String], default: 22 },
})

const symbol = computed(() => props.symbol || currencySymbol(props.currency) || currencySymbolOf(props.currency))
const amount = computed(() => fenToYuan(props.cents).toFixed(2))
</script>

<style scoped>
.price {
  color: #e1251b;
  font-weight: 600;
}

.price-symbol {
  font-size: 12px;
}

.price-amount {
  font-size: v-bind(size + 'px');
}
</style>
