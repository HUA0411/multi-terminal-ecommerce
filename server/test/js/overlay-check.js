(async () => {
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.trim() === "批发价");
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 1500));
  const overlays = [...document.querySelectorAll(".el-overlay, .el-dialog, .el-message-box")];
  return JSON.stringify({ overlayCount: overlays.length, overlayTexts: overlays.map(o => o.innerText.slice(0, 200)), bodyHasTier: document.body.innerText.includes("阶梯价") });
})()