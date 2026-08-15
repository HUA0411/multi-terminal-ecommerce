(async () => {
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.trim() === "SKU");
  if (!btn) return JSON.stringify({err: "sku btn not found"});
  btn.click();
  await new Promise(r => setTimeout(r, 1200));
  return JSON.stringify({ hasSkuDialog: document.body.innerText.includes("SKU 管理"), tail: document.body.innerText.slice(-250) });
})()