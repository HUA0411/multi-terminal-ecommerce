(async () => {
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.replace(/\s/g,"") === "登录" && b.className.includes("el-button--large"));
  if (!btn) {
    const alt = [...document.querySelectorAll("button")].find(b => b.innerText.includes("登") && b.innerText.includes("录") && b.className.includes("large"));
    if (!alt) return JSON.stringify({err: "no large login btn"});
    alt.click();
  } else { btn.click(); }
  await new Promise(r => setTimeout(r, 3500));
  return JSON.stringify({ url: location.href, msgs: [...document.querySelectorAll(".el-message")].map(m=>m.innerText) });
})()