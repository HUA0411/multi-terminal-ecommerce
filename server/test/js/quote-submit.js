(async () => {
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("询价"));
  if (!btn) return "quote btn not found";
  btn.click();
  await new Promise(r => setTimeout(r, 800));
  const qtyInput = document.querySelector(".el-dialog .el-input-number input");
  if (qtyInput) { const proto = HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(qtyInput, "50"); qtyInput.dispatchEvent(new Event("input", { bubbles: true })); qtyInput.dispatchEvent(new Event("change", { bubbles: true })); }
  const note = document.querySelector(".el-dialog textarea");
  if (note) { const proto = HTMLTextAreaElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(note, "批发 50 台"); note.dispatchEvent(new Event("input", { bubbles: true })); }
  await new Promise(r => setTimeout(r, 300));
  const submit = [...document.querySelectorAll(".el-dialog button")].find(b => b.innerText.includes("提交询价"));
  if (submit) submit.click();
  await new Promise(r => setTimeout(r, 2000));
  return JSON.stringify({ toast: [...document.querySelectorAll(".el-message")].map(m=>m.innerText), dialogClosed: !document.body.innerText.includes("B2B 询价") });
})()