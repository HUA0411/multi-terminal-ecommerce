(async () => {
  Object.keys(localStorage).filter(k => k.startsWith("ecom_i18n")).forEach(k => localStorage.removeItem(k));
  const triggers = [...document.querySelectorAll(".el-dropdown")];
  if (!triggers.length) return "dropdown not found";
  triggers[0].dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
  await new Promise(r => setTimeout(r, 500));
  const items = [...document.querySelectorAll(".el-dropdown-menu__item")];
  const en = items.find(i => i.innerText.includes("English"));
  if (en) en.click();
  await new Promise(r => setTimeout(r, 2500));
  const nav = [...document.querySelectorAll(".nav-link")].map(e => e.innerText.trim());
  const body = document.body.innerText;
  return JSON.stringify({ nav, homeTranslated: body.includes("Flash Sale") && body.includes("Coupons"), searchPlaceholder: [...document.querySelectorAll("input")].find(i=>i.placeholder)?.placeholder || "" });
})()