(async () => {
  const login = await fetch("http://127.0.0.1:4000/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account: "user", password: "user123" }) });
  const j = await login.json();
  localStorage.setItem("token", j.data.token); localStorage.setItem("user", JSON.stringify(j.data.user));
  localStorage.setItem("language", "en-US");
  location.hash = "#/pages/mine/mine";
  await new Promise(r => setTimeout(r, 3000));
  const body = document.body.innerText;
  return JSON.stringify({ hasOrders: body.includes("My Orders"), hasFavorites: body.includes("Favorites"), hasGroupon: body.includes("Group Buy"), hasQuotes: body.includes("Quotes"), sample: body.slice(0, 250) });
})()