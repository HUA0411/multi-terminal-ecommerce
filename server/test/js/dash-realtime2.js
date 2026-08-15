(async () => {
  const cards = [...document.querySelectorAll(".stat-card .value")];
  const gmvBefore = cards[0] ? cards[0].innerText : "?";
  await new Promise(r => setTimeout(r, 1500));
  const u = await fetch("/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account: "user", password: "user123" }) });
  const ut = (await u.json()).data.token;
  await fetch("/api/v1/cart/items", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + ut }, body: JSON.stringify({ skuId: 22, quantity: 1 }) });
  const ord = await fetch("/api/v1/orders", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + ut }, body: JSON.stringify({ addressId: 1 }) });
  const oid = (await ord.json()).data.orders[0].id;
  const pay = await fetch("/api/v1/orders/" + oid + "/pay", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + ut }, body: JSON.stringify({ method: "wechat" }) });
  const pid = (await pay.json()).data.paymentId;
  await fetch("/api/v1/payments/" + pid + "/mock-success", { method: "POST", headers: { Authorization: "Bearer " + ut } });
  await new Promise(r => setTimeout(r, 3500));
  const gmvAfter = (document.querySelectorAll(".stat-card .value")[0] || {}).innerText || "?";
  return JSON.stringify({ gmvBefore, gmvAfter, refreshed: gmvBefore !== gmvAfter });
})()