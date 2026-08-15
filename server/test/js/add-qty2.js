(async () => {
  // click first SKU radio
  const sku = document.querySelector(".sku-group .el-radio-button");
  if (sku) sku.click();
  await new Promise(r => setTimeout(r, 300));
  // set quantity to 2
  const qtyInput = document.querySelector(".qty-row input");
  if (qtyInput) { const proto = HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(qtyInput, "2"); qtyInput.dispatchEvent(new Event("input", { bubbles: true })); qtyInput.dispatchEvent(new Event("change", { bubbles: true })); }
  await new Promise(r => setTimeout(r, 300));
  const addBtn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("加入购物车"));
  if (addBtn) addBtn.click();
  await new Promise(r => setTimeout(r, 1500));
  return "added qty2";
})()