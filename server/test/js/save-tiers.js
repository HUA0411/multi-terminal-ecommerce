(async () => {
  const addBtn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("添加档位"));
  if (!addBtn) return "add btn not found";
  addBtn.click();
  await new Promise(r => setTimeout(r, 400));
  const nums = [...document.querySelectorAll(".el-dialog .el-input-number input")];
  if (nums.length < 2) return "inputs not found: " + nums.length;
  const setVal = (el, v) => { const proto = HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  setVal(nums[0], "3");
  setVal(nums[1], "39.9");
  await new Promise(r => setTimeout(r, 300));
  const saveBtn = [...document.querySelectorAll(".el-dialog button")].find(b => b.innerText.trim() === "保存");
  if (!saveBtn) return "save btn not found";
  saveBtn.click();
  await new Promise(r => setTimeout(r, 1500));
  return JSON.stringify({ toast: [...document.querySelectorAll(".el-message")].map(m=>m.innerText), dialogClosed: !document.body.innerText.includes("批发阶梯价") });
})()