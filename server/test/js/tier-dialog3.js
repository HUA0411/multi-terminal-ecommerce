(async () => {
  for (let i = 0; i < 10; i++) {
    const btn = [...document.querySelectorAll("button")].find(b => b.innerText.trim() === "批发价");
    if (btn) {
      btn.click();
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  await new Promise(r => setTimeout(r, 1500));
  return JSON.stringify({ hasTierDialog: document.body.innerText.includes("批发阶梯价"), tail: document.body.innerText.slice(-300) });
})()