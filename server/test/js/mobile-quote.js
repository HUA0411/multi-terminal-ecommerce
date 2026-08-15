(async () => {
  const login = await fetch("http://127.0.0.1:4000/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account: "user", password: "user123" }) });
  const j = await login.json();
  localStorage.setItem("token", j.data.token); localStorage.setItem("user", JSON.stringify(j.data.user));
  location.hash = "#/pages/product/detail?id=101";
  await new Promise(r => setTimeout(r, 3000));
  const qBtns = [...document.querySelectorAll("uni-view")].filter(v => (v.innerText || "").includes("询价") && (v.innerText || "").length < 20);
  if (!qBtns.length) return "quote btn not found";
  qBtns[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await new Promise(r => setTimeout(r, 800));
  const panel = [...document.querySelectorAll("uni-view")].find(v => (v.innerText || "").includes("B2B 询价"));
  if (!panel) return "quote panel not found";
  const submit = [...document.querySelectorAll("uni-view")].find(v => v.innerText === "提交询价");
  if (submit) submit.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await new Promise(r => setTimeout(r, 2000));
  return JSON.stringify({ panelFound: !!panel, body: document.body.innerText.slice(0, 200) });
})()