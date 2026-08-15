// 统一 WebSocket 封装：H5 使用原生 WebSocket，小程序使用 uni.connectSocket
// 两者对外暴露一致的 { send, close, readyState } 接口
import { WS_URL } from '@/config'
import { getToken } from '@/utils/request'

export function createSocket({ onOpen, onMessage, onClose, onError }) {
  const token = getToken()
  const url = WS_URL + (token ? '?token=' + encodeURIComponent(token) : '')
  let closed = false

  // #ifdef H5
  const ws = new WebSocket(url)
  ws.onopen = () => {
    if (!closed && onOpen) onOpen()
  }
  ws.onmessage = (e) => {
    try {
      if (onMessage) onMessage(JSON.parse(e.data))
    } catch (err) {
      console.warn('WS message parse error:', e.data)
    }
  }
  ws.onclose = (e) => {
    if (!closed && onClose) onClose(e)
  }
  ws.onerror = (e) => {
    if (onError) onError(e)
  }
  return {
    send(data) {
      if (ws.readyState === 1) ws.send(JSON.stringify(data))
    },
    close() {
      closed = true
      try {
        ws.close()
      } catch (e) {
        /* ignore */
      }
    },
    readyState() {
      return ws.readyState
    },
  }
  // #endif

  // #ifndef H5
  const task = uni.connectSocket({ url, complete: () => {} })
  task.onOpen(() => {
    if (!closed && onOpen) onOpen()
  })
  task.onMessage((e) => {
    try {
      if (onMessage) onMessage(JSON.parse(e.data))
    } catch (err) {
      console.warn('WS message parse error:', e.data)
    }
  })
  task.onClose(() => {
    if (!closed && onClose) onClose()
  })
  task.onError((e) => {
    if (onError) onError(e)
  })
  return {
    send(data) {
      try {
        task.send({ data: JSON.stringify(data), fail: () => {} })
      } catch (e) {
        /* ignore */
      }
    },
    close() {
      closed = true
      try {
        task.close({})
      } catch (e) {
        /* ignore */
      }
    },
    readyState() {
      return 1
    },
  }
  // #endif
}

// 全局实时连接单例：自动重连 + 房间订阅 + 事件分发
class Realtime {
  constructor() {
    this.socket = null
    this.rooms = []
    this.handlers = {}
    this.connected = false
    this.retryTimer = null
    this.manualClose = false
  }

  connect() {
    if (this.socket || this.manualClose) return
    const that = this
    this.socket = createSocket({
      onOpen() {
        that.connected = true
        if (that.rooms.length) that.send({ type: 'subscribe', rooms: that.rooms })
      },
      onMessage(data) {
        that.dispatch(data.type, data.data)
      },
      onClose() {
        that.connected = false
        that.socket = null
        if (!that.manualClose) that.scheduleReconnect()
      },
      onError() {
        /* 错误由 onClose 统一处理重连 */
      },
    })
  }

  send(data) {
    if (this.socket) this.socket.send(data)
  }

  subscribe(room) {
    if (!room) return
    if (this.rooms.indexOf(room) === -1) this.rooms.push(room)
    this.connect()
    if (this.connected) this.send({ type: 'subscribe', rooms: [room] })
  }

  unsubscribe(room) {
    const i = this.rooms.indexOf(room)
    if (i > -1) this.rooms.splice(i, 1)
  }

  on(type, fn) {
    if (!this.handlers[type]) this.handlers[type] = []
    if (this.handlers[type].indexOf(fn) === -1) this.handlers[type].push(fn)
  }

  off(type, fn) {
    const list = this.handlers[type] || []
    const i = list.indexOf(fn)
    if (i > -1) list.splice(i, 1)
  }

  dispatch(type, data) {
    const list = this.handlers[type] || []
    list.forEach((fn) => {
      try {
        fn(data)
      } catch (e) {
        console.warn('ws handler error:', e)
      }
    })
  }

  scheduleReconnect() {
    if (this.retryTimer) return
    const that = this
    this.retryTimer = setTimeout(() => {
      that.retryTimer = null
      if (!that.manualClose) {
        that.socket = null
        that.connect()
      }
    }, 5000)
  }

  close() {
    this.manualClose = true
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    this.connected = false
  }
}

export const realtime = new Realtime()
