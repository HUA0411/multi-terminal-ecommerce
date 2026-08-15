(async () => {
  await new Promise(r => setTimeout(r, 2000));
  const body = document.body.innerText;
  const status = body.includes("已报价");
  const hasPrice = body.includes("2750.00");
  const acceptBtn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("接受报价"));
  if (acceptBtn) acceptBtn.click();
  await new Promise(r => setTimeout(r, 2000));
  return JSON.stringify({ statusShown: status, hasPrice, toast: [...document.querySelectorAll(".el-message")].map(m=>m.innerText), accepted: document.body.innerText.includes("已接受") });
})()