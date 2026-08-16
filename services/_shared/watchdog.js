// 父进程看门狗：编排器以 stdin 管道拉起本服务；父进程退出（含被强杀）时
// 管道 EOF，服务自动退出 —— 避免 Windows 下孤儿进程占端口
export function armWatchdog() {
  try {
    if (process.stdin && !process.stdin.isTTY) {
      process.stdin.resume();
      const exit = (why) => {
        console.error("[watchdog] stdin closed (" + why + ")，服务退出");
        try { process.exit(0); } catch {}
      };
      process.stdin.on("data", () => {});
      process.stdin.on("end", () => exit("end"));
      process.stdin.on("close", () => exit("close"));
    }
  } catch {}
}