(async () => {
  const body = document.body.innerText;
  const hasTitle = body.includes("商家对账报表");
  const hasGmv = body.includes("总 GMV") || body.includes("商家净结算");
  const hasRows = document.querySelectorAll(".el-table__row").length;
  return JSON.stringify({ hasTitle, hasGmv, rowCount: hasRows, sample: body.slice(body.indexOf("商家对账") - 20, body.indexOf("商家对账") + 300) });
})()