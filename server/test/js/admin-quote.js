(async () => {
  const all = [...document.querySelectorAll("input")];
  const setVal = (el, v) => { const proto = HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  if (all.length >= 2) { setVal(all[0], "merchant"); setVal(all[1], "merchant123"); }
  await new Promise(r => setTimeout(r, 300));
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("登") && b.innerText.includes("录") && b.className.includes("large"));
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 3000));
  location.hash = "#/quotes";
  await new Promise(r => setTimeout(r, 2500));
  const body = document.body.innerText;
  const hasRfq = body.includes("RFQAJRKHDWS6U");
  // click 报价 on the pending quote
  const qBtn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("报价"));
  if (qBtn) qBtn.click();
  await new Promise(r => setTimeout(r, 800));
  const priceInput = document.querySelector(".el-dialog .el-input-number input");
  if (priceInput) { const proto = HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(priceInput, "2750"); priceInput.dispatchEvent(new Event("input", { bubbles: true })); priceInput.dispatchEvent(new Event("change", { bubbles: true })); }
  await new Promise(r => setTimeout(r, 300));
  const sub = [...document.querySelectorAll(".el-dialog button")].find(b => b.innerText.includes("提交报价"));
  if (sub) sub.click();
  await new Promise(r => setTimeout(r, 2000));
  return JSON.stringify({ hasRfq, toast: [...document.querySelectorAll(".el-message")].map(m=>m.innerText) });
})()