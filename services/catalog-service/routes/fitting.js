import { Router } from "express";
import store from "../../_shared/store.js";
import { auth } from "../../_shared/middleware.js";
import { asyncHandler, ok, fail, now } from "../../_shared/util.js";

const router = Router();

// 试衣商品数据（尺码表 + 3D 模型占位）
router.get("/products/:productId", asyncHandler(async (req, res) => {
  const product = store.get("products", req.params.productId);
  if (!product) return fail(404, 404, "商品不存在");
  const garment = store.findOne("fittingGarments", (g) => g.productId === product.id);
  if (!garment) return fail(404, 404, "该商品暂不支持虚拟试衣");
  res.json(ok({ productId: product.id, productName: product.name, modelUrl: garment.modelUrl, sizeChart: garment.sizeChart, tech: "3D_GLB / AR 预留，接入腾讯云或 MetaHuman 等渲染服务" }));
}));

// 尺码推荐算法（身高体重 -> 推荐尺码）
function recommendSize(sizeChart, height, weight, gender) {
  // 简易规则：按胸围预估 = 身高(cm) * 0.5 + (gender === "male" ? 10 : 4)；再映射到最接近的档位
  const estBust = height * 0.5 + (gender === "male" ? 12 : 6);
  const estWaist = weight * 0.8;
  let best = sizeChart[0];
  let bestDist = Infinity;
  sizeChart.forEach((s) => {
    const dist = Math.abs(s.bust - estBust) + Math.abs(s.waist - estWaist) * 0.5;
    if (dist < bestDist) { bestDist = dist; best = s; }
  });
  return best.size;
}

// 创建试衣会话（mock：延迟 2 秒后变为 ready）
router.post("/sessions", auth(), asyncHandler(async (req, res) => {
  const { productId, height, weight, gender } = req.body || {};
  if (!productId || !height || !weight) return fail(400, 400, "请填写身高体重");
  const garment = store.findOne("fittingGarments", (g) => g.productId === Number(productId));
  if (!garment) return fail(404, 404, "该商品暂不支持虚拟试衣");
  const size = recommendSize(garment.sizeChart, Number(height), Number(weight), gender);
  const session = store.insert("fittingSessions", {
    userId: req.user.id,
    productId: Number(productId),
    bodyProfile: { height: Number(height), weight: Number(weight), gender: gender || "female" },
    recommendedSize: size,
    status: "processing",
    resultUrl: null,
    createdAt: now(),
  });
  res.json(ok({ sessionId: session.id, status: "processing", recommendedSize: size, estimatedSeconds: 2 }));
}));

// 轮询试衣会话
router.get("/sessions/:id", auth(), asyncHandler(async (req, res) => {
  const s = store.get("fittingSessions", req.params.id);
  if (!s || s.userId !== req.user.id) return fail(404, 404, "试衣会话不存在");
  // 懒就绪：创建超过 2 秒即 ready
  const elapsed = Date.now() - new Date(s.createdAt).getTime();
  if (s.status === "processing" && elapsed > 2000) {
    store.update("fittingSessions", s.id, { status: "ready", resultUrl: `https://mock-tryon.example/render/${s.id}.jpg` });
  }
  const cur = store.get("fittingSessions", s.id);
  res.json(ok({ sessionId: cur.id, productId: cur.productId, status: cur.status, recommendedSize: cur.recommendedSize, resultUrl: cur.resultUrl }));
}));

export default router;
