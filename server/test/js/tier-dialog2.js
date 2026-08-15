(async () => {
  await new Promise(r => setTimeout(r, 2000));
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.trim() === "批发价");
  if (!btn) return JSON.stringify({err: "btn not found"});
  btn.click();
  await new Promise(r => setTimeout(r, 1500));
  return JSON.stringify({ hasDialog: document.body.innerText.includes("批发阶梯价"), tail: document.body.innerText.slice(-350) });
})()