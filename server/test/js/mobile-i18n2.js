(async () => {
  const login = await fetch("http://127.0.0.1:4000/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account: "user", password: "user123" }) });
  const j = await login.json();
  localStorage.setItem("token", j.data.token); localStorage.setItem("user", JSON.stringify(j.data.user));
  localStorage.setItem("language", "en-US");
  await fetch("http://127.0.0.1:4000/api/v1/cart/items", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + j.data.token }, body: JSON.stringify({ skuId: 21, quantity: 1 }) });
  location.hash = "#/pages/cart/cart";
  await new Promise(r => setTimeout(r, 3000));
  const cartBody = document.body.innerText;
  location.hash = "#/pages/index/index";
  await new Promise(r => setTimeout(r, 3000));
  const idxBody = document.body.innerText;
  return JSON.stringify({ cartCheckout: cartBody.includes("Checkout"), cartTotal: cartBody.includes("Total"), cartSelectAll: cartBody.includes("Select all"), idxFlash: idxBody.includes("Flash Sale"), idxLive: idxBody.includes("Live") });
})()