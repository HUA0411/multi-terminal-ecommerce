(async () => {
  const textarea = document.querySelector(".review-form textarea");
  if (!textarea) return "review form not found";
  const proto = HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(textarea, "浏览器实测评价：很好用！");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise(r => setTimeout(r, 300));
  const btn = [...document.querySelectorAll(".review-form button")].find(b => b.innerText.includes("发表评价"));
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 2000));
  return JSON.stringify({ toast: [...document.querySelectorAll(".el-message")].map(m=>m.innerText), reviewCount: (document.querySelector(".review-panel .section-title h3")||{}).innerText || "" });
})()