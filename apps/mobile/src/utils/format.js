// 金额(分) -> 元字符串
export function fenToYuan(fen) {
  if (fen === null || fen === undefined || isNaN(fen)) return '0.00'
  const n = Number(fen)
  const neg = n < 0
  const abs = Math.abs(n)
  const yuan = Math.floor(abs / 100)
  const rem = abs % 100
  return (neg ? '-' : '') + yuan + '.' + String(rem).padStart(2, '0')
}

// 带货币符号的展示文本
export function priceText(fen, currency) {
  const cur = currency || uni.getStorageSync('currency') || 'CNY'
  const symbols = { CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥' }
  const s = symbols[cur] || cur + ' '
  return s + fenToYuan(fen)
}

export function formatTime(input) {
  if (!input) return ''
  const d = new Date(input)
  if (isNaN(d.getTime())) return String(input)
  const p = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
  )
}

// 解析倒计时，返回 {d,h,m,s}
export function parseCountdown(endTime) {
  const target = new Date(endTime).getTime()
  let diff = target - Date.now()
  if (diff < 0) diff = 0
  const s = Math.floor(diff / 1000)
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    done: diff === 0,
  }
}

export function pad2(n) {
  return String(n).padStart(2, '0')
}
