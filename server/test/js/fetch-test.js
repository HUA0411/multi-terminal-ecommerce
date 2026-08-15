(async () => {
  const out = {};
  try {
    const r = await fetch("/api/v1/cms/pages/home");
    out.cmsStatus = r.status;
    out.cmsBody = (await r.text()).slice(0, 200);
  } catch (e) { out.cmsErr = String(e); }
  try {
    const r2 = await fetch("/api/v1/recommendations?scene=home&limit=3");
    out.recStatus = r2.status;
    out.recBody = (await r2.text()).slice(0, 150);
  } catch (e) { out.recErr = String(e); }
  return JSON.stringify(out);
})()