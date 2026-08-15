(async () => {
  const all = [...document.querySelectorAll("input")];
  const setVal = (el, v) => { const proto = HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  if (all.length >= 2) { setVal(all[0], "user"); setVal(all[1], "user123"); }
  await new Promise(r => setTimeout(r, 300));
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.replace(/\s/g,"") === "登录" && b.className.includes("el-button--large"));
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 3000));
  return location.href;
})()