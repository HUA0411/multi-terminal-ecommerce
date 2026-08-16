// 内容服务：CMS 页面 / 直播（微服务入口）
process.env.SERVICE_NAME = "content";
process.env.OWNED_COLLECTIONS = "cmsPages,cmsTemplates,liveRooms,liveMessages";
const { boot } = await import("./bootstrap.js");
await boot();
