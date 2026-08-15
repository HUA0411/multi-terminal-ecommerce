// 生成静态 PNG：tabBar 图标 / logo / 占位图（纯 Node，无第三方依赖）
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'src', 'static')

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4)
    raw[rowStart] = 0 // filter none
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- 形状判断 ----------
function inCircle(x, y, cx, cy, r) {
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}
function inRect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1
}
function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (!inRect(x, y, x0, y0, x1, y1)) return false
  const cx0 = x0 + r
  const cy0 = y0 + r
  const cx1 = x1 - r
  const cy1 = y1 - r
  if (x < cx0 && y < cy0) return inCircle(x, y, cx0, cy0, r)
  if (x > cx1 && y < cy0) return inCircle(x, y, cx1, cy0, r)
  if (x < cx0 && y > cy1) return inCircle(x, y, cx0, cy1, r)
  if (x > cx1 && y > cy1) return inCircle(x, y, cx1, cy1, r)
  return true
}
function inTriangle(x, y, ax, ay, bx, by, cx, cy) {
  const sign = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
  const d1 = sign([x, y], [ax, ay], [bx, by])
  const d2 = sign([x, y], [bx, by], [cx, cy])
  const d3 = sign([x, y], [cx, cy], [ax, ay])
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

const painters = {
  // 首页：房子
  home(x, y) {
    if (inTriangle(x, y, 9, 40, 40, 12, 71, 40)) return true
    if (inRect(x, y, 19, 40, 62, 70) && !inRect(x, y, 36, 50, 45, 70)) return true
    return false
  },
  // 分类：2x2 网格
  category(x, y) {
    for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      if (inRoundRect(x, y, 8 + cx * 33, 8 + cy * 33, 32 + cx * 33, 32 + cy * 33, 6)) return true
    }
    return false
  },
  // 购物车：梯形车身 + 双轮
  cart(x, y) {
    if (y >= 24 && y <= 50) {
      const half = 24 + ((y - 24) / 26) * 6
      if (Math.abs(x - 40) <= half) return true
    }
    if (inCircle(x, y, 25, 62, 8) || inCircle(x, y, 55, 62, 8)) return true
    return false
  },
  // 我的：人头 + 肩
  mine(x, y) {
    if (inCircle(x, y, 40, 26, 14)) return true
    const dx = (x - 40) / 26
    const dy = (y - 72) / 28
    return dx * dx + dy * dy <= 1 && y >= 44 && y <= 72
  },
}

function renderIcon(name, color) {
  const size = 81
  const rgba = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      if (painters[name](x + 0.5, y + 0.5)) {
        rgba[i] = color[0]
        rgba[i + 1] = color[1]
        rgba[i + 2] = color[2]
        rgba[i + 3] = 255
      } else {
        rgba[i + 3] = 0
      }
    }
  }
  return encodePng(size, size, rgba)
}

// ---------- 生成 ----------
const GRAY = [153, 153, 153]
const ORANGE = [255, 77, 79]

mkdirSync(join(OUT, 'tabbar'), { recursive: true })
for (const name of Object.keys(painters)) {
  writeFileSync(join(OUT, 'tabbar', name + '.png'), renderIcon(name, GRAY))
  writeFileSync(join(OUT, 'tabbar', name + '-active.png'), renderIcon(name, ORANGE))
  console.log('icon generated:', name)
}

// logo：160x160 橙色圆角方块 + 白色圆点
{
  const size = 160
  const rgba = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      if (inRoundRect(x + 0.5, y + 0.5, 8, 8, 151, 151, 36)) {
        if (inCircle(x + 0.5, y + 0.5, 80, 80, 40)) {
          rgba[i] = 255; rgba[i + 1] = 255; rgba[i + 2] = 255; rgba[i + 3] = 255
        } else {
          rgba[i] = 255; rgba[i + 1] = 77; rgba[i + 2] = 79; rgba[i + 3] = 255
        }
      } else {
        rgba[i + 3] = 0
      }
    }
  }
  writeFileSync(join(OUT, 'logo.png'), encodePng(size, size, rgba))
  console.log('logo generated')
}

// placeholder：300x200 浅灰底 + 边框
{
  const w = 300
  const h = 200
  const rgba = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      rgba[i] = 242; rgba[i + 1] = 243; rgba[i + 2] = 245; rgba[i + 3] = 255
      if (x < 3 || y < 3 || x > w - 4 || y > h - 4) {
        rgba[i] = 221; rgba[i + 1] = 221; rgba[i + 2] = 221
      }
    }
  }
  writeFileSync(join(OUT, 'placeholder.png'), encodePng(w, h, rgba))
  console.log('placeholder generated')
}
console.log('ALL STATIC ASSETS GENERATED')
