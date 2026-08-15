// ============================================================
// 轻量 i18n：GET /i18n/:lang 拉取翻译表并缓存到 localStorage
// ============================================================
import { reactive } from 'vue'
import { settingApi } from '../api'

const cacheKey = (lang) => `ecom_i18n_${lang}`

export const i18n = reactive({
  lang: localStorage.getItem('ecom_lang') || 'zh-CN',
  dict: {},
})

export async function loadI18n(lang) {
  i18n.lang = lang
  localStorage.setItem('ecom_lang', lang)
  const cached = localStorage.getItem(cacheKey(lang))
  if (cached) {
    try {
      i18n.dict = JSON.parse(cached)
      return
    } catch {
      /* 缓存损坏则重新拉取 */
    }
  }
  try {
    const d = await settingApi.i18n(lang)
    i18n.dict = d && typeof d === 'object' ? d : {}
    localStorage.setItem(cacheKey(lang), JSON.stringify(i18n.dict))
  } catch {
    i18n.dict = {}
  }
}

/** 翻译：查不到则返回 key 本身 */
export function t(key) {
  return i18n.dict[key] || key
}
