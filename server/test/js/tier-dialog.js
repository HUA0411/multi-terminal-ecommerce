(async () => {
  const btn = [...document.querySelectorAll("button")].find(b => b.innerText.trim() === "批发价");
  if (!btn) return JSON.stringify({err: "btn not found"});
  btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await new Promise(r => setTimeout(r, 1500));
  const bodyText = document.body.innerText;
  return JSON.stringify({ hasDialog: bodyText.includes("批发阶梯价"), tail: bodyText.slice(-400) });
})()