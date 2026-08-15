(async () => {
  const body = document.body.innerText;
  const hasGrouponBtn = body.includes("拼团");
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("拼团"));
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 800));
  const dialog = document.body.innerText.includes("开团（拼团价）");
  const submit = [...document.querySelectorAll(".el-dialog button")].find(b => b.innerText.includes("开团"));
  if (submit) submit.click();
  await new Promise(r => setTimeout(r, 2500));
  return JSON.stringify({ hasGrouponBtn, dialog, toast: [...document.querySelectorAll(".el-message")].map(m=>m.innerText) });
})()