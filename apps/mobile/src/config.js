/**
 * 全局环境配置 —— 单点修改即可切换 H5 / 小程序 / App 的后端地址。
 * H5 开发环境直连本地后端；小程序 / APP 请将下面占位域名替换为生产域名（https / wss）。
 */
// #ifdef H5
export const API_BASE_URL = 'http://localhost:4000/api/v1'
export const WS_URL = 'ws://localhost:4000/ws'
// #endif

// #ifndef H5
export const API_BASE_URL = 'https://api.example.com/api/v1'
export const WS_URL = 'wss://api.example.com/ws'
// #endif
