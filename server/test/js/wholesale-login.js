(async () => {
  const all = [...document.querySelectorAll("input")];
  const account = all.find(i => i.placeholder === "手机号或昵称");
  const password = all.find(i => i.placeholder === "请输入密码");
  if (!account || !password) return "fields missing";
  const setVal = (el, v) => { const proto = HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  setVal(account, "13800000004"); setVal(password, "user123");
  await new Promise(r => setTimeout(r, 300));
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.replace(/\s/g,"") === "登录" && b.className.includes("el-button--large"));
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 3000));
  return JSON.stringify({ url: location.href });
})()