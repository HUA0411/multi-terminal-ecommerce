// ============================================================
// 门店设置（店名/语言/币种），来源 GET /settings/public
// ============================================================
import { reactive } from 'vue'
import { settingApi } from '../api'

export const settings = reactive({
  loaded: false,
  storeName: '云商城',
  logo: '',
  languages: [{ code: 'zh-CN', name: '简体中文' }],
  defaultLanguage: 'zh-CN',
  currencies: [{ code: 'CNY', name: '人民币', symbol: '¥', rate: 1 }],
  defaultCurrency: 'CNY',
  paymentMethods: [],
  seckillEnabled: true,
  // 用户选择（持久化）
  currency: localStorage.getItem('ecom_currency') || '',
  language: localStorage.getItem('ecom_lang') || '',
})

export async function loadSettings() {
  try {
    const s = await settingApi.public()
    Object.assign(settings, s)
    if (!settings.currency) settings.currency = s.defaultCurrency || 'CNY'
    if (!settings.language) settings.language = s.defaultLanguage || 'zh-CN'
  } catch {
    /* 后端不可用时使用默认值 */
  }
  settings.loaded = true
}

export function setCurrency(code) {
  settings.currency = code
  localStorage.setItem('ecom_currency', code)
}

export function setLanguage(code) {
  settings.language = code
  localStorage.setItem('ecom_lang', code)
}

export function currencySymbol(code) {
  const c = settings.currencies.find((x) => x.code === code)
  if (c?.symbol) return c.symbol
  const map = { CNY: '¥', USD: '$', EUR: '€', GBP: '£' }
  return map[code] || ''
}
