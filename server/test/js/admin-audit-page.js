(async () => {
  const all = [...document.querySelectorAll("input")];
  const setVal = (el, v) => { const proto = HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  if (all.length >= 2) { setVal(all[0], "admin"); setVal(all[1], "admin123"); }
  await new Promise(r => setTimeout(r, 300));
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.includes("登") && b.innerText.includes("录") && b.className.includes("large"));
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 3000));
  location.hash = "#/audit";
  await new Promise(r => setTimeout(r, 2500));
  const body = document.body.innerText;
  return JSON.stringify({ hasTitle: body.includes("操作审计日志"), hasRows: body.includes("product.tiers") || body.includes("quote.respond") || body.includes("merchant.review"), sample: body.slice(body.indexOf("操作审计日志"), body.indexOf("操作审计日志") + 400) });
})()