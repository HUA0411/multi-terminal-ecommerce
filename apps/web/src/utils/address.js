// ============================================================
// 收货地址：契约中没有地址 API，前端本地存储（localStorage）
// 结构：{ id, name, phone, detail, isDefault }
// ============================================================
const KEY = 'ecom_addresses'

export function getAddresses() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function addAddress(addr) {
  const list = getAddresses()
  const item = { ...addr }
  item.id = item.id || Date.now()
  if (item.isDefault) list.forEach((a) => (a.isDefault = false))
  list.push(item)
  save(list)
  return item
}

export function updateAddress(addr) {
  const list = getAddresses()
  if (addr.isDefault) list.forEach((a) => (a.isDefault = false))
  const i = list.findIndex((a) => a.id === addr.id)
  if (i >= 0) list[i] = { ...addr }
  save(list)
  return addr
}

export function removeAddress(id) {
  save(getAddresses().filter((a) => a.id !== id))
}

export function defaultAddress() {
  const list = getAddresses()
  return list.find((a) => a.isDefault) || list[0] || null
}
