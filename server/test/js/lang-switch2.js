(async () => {
  // trigger el-dropdown via click on the trigger span
  const triggers = [...document.querySelectorAll(".el-dropdown")];
  if (!triggers.length) return "dropdown not found";
  triggers[0].dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
  await new Promise(r => setTimeout(r, 500));
  const items = [...document.querySelectorAll(".el-dropdown-menu__item")];
  const en = items.find(i => i.innerText.includes("English"));
  if (en) en.click();
  await new Promise(r => setTimeout(r, 2000));
  const nav = [...document.querySelectorAll(".nav-link")].map(e => e.innerText.trim());
  return JSON.stringify({ nav, langLabel: (document.querySelector(".topbar-link") || {}).innerText || "" });
})()