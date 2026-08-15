(async () => {
  const all = [...document.querySelectorAll("input")];
  const account = all.find(i => i.placeholder === "手机号或昵称");
  const password = all.find(i => i.placeholder === "请输入密码");
  const setVal = (el, v) => { const proto = HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  if (account && password) { setVal(account, "user"); setVal(password, "user123"); }
  await new Promise(r => setTimeout(r, 300));
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.replace(/\s/g,"") === "登录" && b.className.includes("el-button--large"));
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 3000));
  location.href = "/products/103";
  await new Promise(r => setTimeout(r, 3000));
  const gBtn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("拼团"));
  if (gBtn) gBtn.click();
  await new Promise(r => setTimeout(r, 800));
  const submit = [...document.querySelectorAll(".el-dialog button")].find(b => b.innerText.includes("开团"));
  if (submit) submit.click();
  await new Promise(r => setTimeout(r, 2500));
  return JSON.stringify({ toast: [...document.querySelectorAll(".el-message")].map(m=>m.innerText) });
})()