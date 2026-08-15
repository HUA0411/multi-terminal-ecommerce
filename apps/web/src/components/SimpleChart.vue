<template>
  <div class="simple-chart">
    <svg :viewBox="`0 0 ${W} ${H}`" :style="{ height: height + 'px' }" preserveAspectRatio="xMidYMid meet">
      <template v-if="type === 'line'">
        <polyline :points="linePoints" fill="none" :stroke="colors[0]" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        <path :d="areaPath" :fill="colors[0]" opacity="0.08" />
        <circle v-for="(p, i) in pts" :key="i" :cx="p[0]" :cy="p[1]" r="3.5" :fill="colors[0]" />
      </template>
      <template v-else-if="type === 'bar'">
        <g v-for="(v, i) in data" :key="i">
          <rect
            :x="barX(i)"
            :y="barY(v)"
            :width="barW"
            :height="barH(v)"
            :fill="colors[i % colors.length]"
            rx="2"
          />
          <text v-if="showValue" :x="barX(i) + barW / 2" :y="barY(v) - 6" text-anchor="middle" font-size="11" fill="#666">{{ v }}</text>
        </g>
      </template>
      <template v-else-if="type === 'donut'">
        <circle cx="120" cy="130" r="80" fill="none" stroke="#f0f0f0" stroke-width="34" />
        <circle
          v-for="(seg, i) in donutSegs"
          :key="i"
          cx="120"
          cy="130"
          r="80"
          fill="none"
          :stroke="seg.color"
          stroke-width="34"
          :stroke-dasharray="`${seg.len} ${seg.gap}`"
          :stroke-dashoffset="seg.offset"
          transform="rotate(-90 120 130)"
        />
        <text x="120" y="125" text-anchor="middle" font-size="15" fill="#333" font-weight="600">{{ total }}</text>
        <text x="120" y="145" text-anchor="middle" font-size="11" fill="#999">合计</text>
      </template>
      <line v-if="showAxis" x1="30" :y1="H - 30" :x2="W - 10" :y2="H - 30" stroke="#e5e5e5" />
    </svg>
    <div v-if="type === 'donut'" class="donut-legend">
      <span v-for="(item, i) in labels" :key="i" class="legend-item">
        <i :style="{ background: donutSegs[i].color }"></i>{{ item }} <b>{{ data[i] }}</b>
      </span>
    </div>
    <div v-else class="x-labels">
      <span v-for="(l, i) in labels" :key="i" class="x-label">{{ l }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: { type: String, default: 'line' }, // line | bar | donut
  data: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  height: { type: Number, default: 260 },
  colors: { type: Array, default: () => ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#9B59B6'] },
  showValue: { type: Boolean, default: false },
})

const W = 560
const PAD = 30

const nums = computed(() => props.data.map((v) => Number(v) || 0))
const maxV = computed(() => Math.max(...nums.value, 1))
const total = computed(() => nums.value.reduce((a, b) => a + b, 0))

const pts = computed(() => {
  const n = nums.value.length
  return nums.value.map((v, i) => {
    const x = n <= 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (n - 1)
    const y = 200 - PAD - (v / maxV.value) * (200 - PAD * 2)
    return [x, y]
  })
})

const linePoints = computed(() => pts.value.map((p) => p.join(',')).join(' '))

const areaPath = computed(() => {
  if (!pts.value.length) return ''
  const first = pts.value[0]
  const last = pts.value[pts.value.length - 1]
  return `M ${first[0]} ${200 - PAD} L ${pts.value.map((p) => p.join(' ')).join(' L ')} L ${last[0]} ${200 - PAD} Z`
})

const barW = computed(() => {
  const n = nums.value.length
  return Math.min(40, ((W - PAD * 2) / Math.max(n, 1)) * 0.6)
})

function barX(i) {
  const n = nums.value.length
  const slot = (W - PAD * 2) / Math.max(n, 1)
  return PAD + i * slot + (slot - barW.value) / 2
}

function barH(v) {
  return (v / maxV.value) * (200 - PAD * 2)
}

function barY(v) {
  return 200 - PAD - barH(v)
}

const donutSegs = computed(() => {
  const r = 80
  const circ = 2 * Math.PI * r
  let acc = 0
  return nums.value.map((v, i) => {
    const len = total.value ? (v / total.value) * circ : 0
    const seg = {
      len: Math.max(len - 3, 0),
      gap: circ - Math.max(len - 3, 0),
      offset: -acc,
      color: props.colors[i % props.colors.length],
    }
    acc += len
    return seg
  })
})

const showAxis = computed(() => props.type !== 'donut')
</script>

<style scoped>
.simple-chart {
  width: 100%;
}

.simple-chart svg {
  width: 100%;
  display: block;
}

.x-labels {
  display: flex;
  justify-content: space-between;
  padding: 4px 20px 0 30px;
  font-size: 11px;
  color: #999;
}

.donut-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
  font-size: 12px;
  color: #666;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.legend-item i {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}
</style>
