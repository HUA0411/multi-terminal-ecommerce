(async () => {
  // find the language dropdown in header (简体中文)
  const lang = [...document.querySelectorAll("span, .el-dropdown, button, div")].find(e => (e.innerText || "").trim() === "简体中文");
  if (!lang) return "lang selector not found";
  lang.click();
  await new Promise(r => setTimeout(r, 800));
  // click English option
  const en = [...document.querySelectorAll(".el-dropdown-menu__item, .el-select-dropdown__item, li, div")].find(e => (e.innerText || "").trim().includes("English"));
  if (en) en.click();
  await new Promise(r => setTimeout(r, 1500));
  const nav = [...document.querySelectorAll(".nav-link")].map(e => e.innerText.trim());
  return JSON.stringify({ nav, header: document.querySelector(".store-header")?.innerText.slice(0, 80) || "" });
})()