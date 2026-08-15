(async () => {
  const closeBtn = [...document.querySelectorAll("button")].find(b => b.innerText.trim() === "关闭");
  if (closeBtn) closeBtn.click();
  await new Promise(r => setTimeout(r, 500));
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.trim() === "批发价");
  if (!btn) return "btn not found";
  btn.click();
  await new Promise(r => setTimeout(r, 1500));
  return JSON.stringify({ hasDialog: document.body.innerText.includes("批发阶梯价") });
})()