(async () => {
  const gBtn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("拼团"));
  if (gBtn) gBtn.click();
  await new Promise(r => setTimeout(r, 800));
  const submit = [...document.querySelectorAll(".el-dialog button")].find(b => b.innerText.includes("开团"));
  if (submit) submit.click();
  await new Promise(r => setTimeout(r, 2500));
  return JSON.stringify({ toast: [...document.querySelectorAll(".el-message")].map(m=>m.innerText) });
})()