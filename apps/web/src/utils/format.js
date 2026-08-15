// ============================================================
// 格式化工具
// 契约约定：价格字段单位为「分」（整数），另附 currency 字段
// ============================================================

/** 分 -> 元（数字） */
export function fenToYuan(fen) {
  const n = Number(fen || 0)
  return Math.round(n) / 100
}

/** 根据币种返回符号（缺省：CNY ¥ / USD $） */
export function currencySymbolOf(code) {
  if (!code) return ''
  const map = { CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥', HKD: 'HK$' }
  return map[code] || (code + ' ')
}

/** 格式化价格：分 -> 带符号字符串 */
export function formatPrice(cents, currency = 'CNY', symbol) {
  return `${symbol || currencySymbolOf(currency)}${fenToYuan(cents).toFixed(2)}`
}

/** ISO8601 -> 'YYYY-MM-DD HH:mm' */
export function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** ISO8601 -> 'YYYY-MM-DD' */
export function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 截断字符串 */
export function truncate(str, len = 20) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '…' : str
}

/** 剩余毫秒 -> 'HH:MM:SS' 倒计时文本 */
export function countdownText(ms) {
  if (ms <= 0) return '00:00:00'
  const s = Math.floor(ms / 1000)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
}
