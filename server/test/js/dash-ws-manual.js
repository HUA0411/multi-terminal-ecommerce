(async () => {
  // monkey-patch WebSocket to count instances — too late; instead check ws util module state
  const mod = await import("/src/utils/ws.js");
  const token = localStorage.getItem("ecom_token") || "";
  mod.connectWs();
  mod.subscribe("dashboard");
  await new Promise(r => setTimeout(r, 1500));
  // trigger an order
  const u = await fetch("/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account: "user", password: "user123" }) });
  const ut = (await u.json()).data.token;
  await fetch("/api/v1/cart/items", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + ut }, body: JSON.stringify({ skuId: 23, quantity: 1 }) });
  const ord = await fetch("/api/v1/orders", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + ut }, body: JSON.stringify({ addressId: 1 }) });
  const oid = (await ord.json()).data.orders[0].id;
  const pay = await fetch("/api/v1/orders/" + oid + "/pay", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + ut }, body: JSON.stringify({ method: "wechat" }) });
  const pid = (await pay.json()).data.paymentId;
  await fetch("/api/v1/payments/" + pid + "/mock-success", { method: "POST", headers: { Authorization: "Bearer " + ut } });
  await new Promise(r => setTimeout(r, 3000));
  const cards = [...document.querySelectorAll(".stat-card .value")];
  return JSON.stringify({ gmv: cards[0] ? cards[0].innerText : "?", wsOnline: cards[3] ? cards[3].innerText : "?" });
})()