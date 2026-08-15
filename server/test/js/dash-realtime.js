(async () => {
  // login admin in browser
  const all = [...document.querySelectorAll("input")];
  const setVal = (el, v) => { const proto = HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  if (all.length >= 2) { setVal(all[0], "admin"); setVal(all[1], "admin123"); }
  await new Promise(r => setTimeout(r, 300));
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("登") && b.innerText.includes("录") && b.className.includes("large"));
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 3500));
  const gmvBefore = (document.querySelector(".stat-card .value") || {}).innerText || "?";
  // trigger an order via the backend API
  const u = await fetch("/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account: "user", password: "user123" }) });
  const ut = (await u.json()).data.token;
  await fetch("/api/v1/cart/items", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + ut }, body: JSON.stringify({ skuId: 21, quantity: 1 }) });
  const ord = await fetch("/api/v1/orders", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + ut }, body: JSON.stringify({ addressId: 1 }) });
  const oid = (await ord.json()).data.orders[0].id;
  const pay = await fetch("/api/v1/orders/" + oid + "/pay", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + ut }, body: JSON.stringify({ method: "wechat" }) });
  await fetch("/api/v1/payments/" + (await pay.json()).data.paymentId + "/mock-success", { method: "POST", headers: { Authorization: "Bearer " + ut } });
  await new Promise(r => setTimeout(r, 2500));
  const gmvAfter = (document.querySelector(".stat-card .value") || {}).innerText || "?";
  return JSON.stringify({ gmvBefore, gmvAfter, refreshed: gmvBefore !== gmvAfter });
})()