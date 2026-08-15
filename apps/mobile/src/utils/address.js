// 地址无后端接口，使用本地存储（uni.setStorage / localStorage）
const KEY = 'addresses'

export function getAddresses() {
  return uni.getStorageSync(KEY) || []
}

export function saveAddresses(list) {
  uni.setStorageSync(KEY, list)
}

export function addAddress(addr) {
  const list = getAddresses()
  const item = {
    ...addr,
    id: addr.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  }
  if (item.isDefault) list.forEach((a) => (a.isDefault = false))
  if (!item.isDefault && list.length === 0) item.isDefault = true
  list.push(item)
  saveAddresses(list)
  return item
}

export function updateAddress(addr) {
  const list = getAddresses()
  if (addr.isDefault) list.forEach((a) => (a.isDefault = false))
  const idx = list.findIndex((a) => a.id === addr.id)
  if (idx > -1) list[idx] = addr
  else list.push(addr)
  saveAddresses(list)
}

export function removeAddress(id) {
  saveAddresses(getAddresses().filter((a) => a.id !== id))
}

export function defaultAddress() {
  const list = getAddresses()
  return list.find((a) => a.isDefault) || list[0] || null
}

export function findAddress(id) {
  return getAddresses().find((a) => String(a.id) === String(id)) || null
}
