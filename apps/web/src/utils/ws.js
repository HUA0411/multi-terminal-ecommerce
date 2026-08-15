// ============================================================
// WebSocket 客户端（单例）
// 地址：ws://localhost:4000/ws?token=<JWT>（dev 走 Vite /ws 代理）
// 协议：客户端发送 {type:'subscribe', rooms:[...]}
//       服务端推送 cart:changed / notify / live:chat / live:like /
//                 live:product / flashsale:started
// ============================================================

let ws = null
let reconnectTimer = null
const rooms = new Set()
const handlers = new Set()

function wsUrl() {
  const token = localStorage.getItem('ecom_token') || ''
  let base
  if (import.meta.env.DEV) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    base = `${proto}://${window.location.host}/ws`
  } else {
    base = 'ws://localhost:4000/ws'
  }
  return `${base}?token=${encodeURIComponent(token)}`
}

function sendSubscribe() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'subscribe', rooms: [...rooms] }))
  }
}

function scheduleReconnect() {
  if (!localStorage.getItem('ecom_token')) return
  clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    ws = null
    connectWs()
  }, 3000)
}

/** 建立连接（幂等）；未登录返回 null */
export function connectWs() {
  if (!localStorage.getItem('ecom_token')) return null
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return ws
  try {
    ws = new WebSocket(wsUrl())
  } catch {
    return null
  }
  ws.onopen = () => sendSubscribe()
  ws.onmessage = (e) => {
    let msg = null
    try {
      msg = JSON.parse(e.data)
    } catch {
      return
    }
    handlers.forEach((h) => {
      try {
        h(msg)
      } catch {
        /* handler 自身异常不影响其他监听 */
      }
    })
  }
  ws.onclose = () => scheduleReconnect()
  ws.onerror = () => {
    try {
      ws && ws.close()
    } catch {
      /* noop */
    }
  }
  return ws
}

/** 订阅房间 */
export function subscribe(room) {
  rooms.add(room)
  connectWs()
  sendSubscribe()
}

/** 取消订阅 */
export function unsubscribe(room) {
  rooms.delete(room)
  sendSubscribe()
}

/** 发送原始消息 */
export function sendWs(data) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data))
}

/** 注册消息监听，返回取消函数 */
export function onWsMessage(fn) {
  handlers.add(fn)
  return () => handlers.delete(fn)
}

/** 主动断开（登出时调用） */
export function closeWs() {
  clearTimeout(reconnectTimer)
  rooms.clear()
  try {
    if (ws) ws.close()
  } catch {
    /* noop */
  }
  ws = null
}
