(async () => {
  const inputs = [...document.querySelectorAll("input")];
  if (inputs.length < 2) return JSON.stringify({err: "inputs not found: " + inputs.length});
  const setVal = (el, v) => { const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  setVal(inputs[0], "user");
  setVal(inputs[1], "user123");
  await new Promise(r => setTimeout(r, 300));
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("登 录") || b.innerText.trim() === "登录" || b.innerText.includes("登录"));
  if (!btn) return JSON.stringify({err: "login button not found"});
  btn.click();
  await new Promise(r => setTimeout(r, 2500));
  return JSON.stringify({ url: location.href, user: (document.querySelector(".store-user, .user-name, .el-dropdown")||{}).innerText || "" });
})()