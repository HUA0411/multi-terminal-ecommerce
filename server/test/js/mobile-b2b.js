(async () => {
  location.hash = "#/pages/login/login";
  await new Promise(r => setTimeout(r, 2000));
  const all = [...document.querySelectorAll("input")];
  const setVal = (el, v) => { const proto = HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  if (all.length >= 2) { setVal(all[0], "13800000004"); setVal(all[1], "user123"); }
  await new Promise(r => setTimeout(r, 300));
  const btn = [...document.querySelectorAll("button, .login-btn, uni-view")].find(b => (b.innerText || "").includes("登") && (b.innerText || "").includes("录") && (b.tagName !== "UNI-VIEW" || (b.innerText || "").length < 10));
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 2500));
  location.hash = "#/pages/product/detail?id=101";
  await new Promise(r => setTimeout(r, 3000));
  return JSON.stringify({ url: location.hash, hasTier: document.body.innerText.includes("批发阶梯价"), body: document.body.innerText.slice(0, 400) });
})()