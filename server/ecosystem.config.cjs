// PM2 进程管理配置：pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "ecom-server",
      cwd: "./server",
      script: "src/index.js",
      instances: "max",
      exec_mode: "cluster",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
  ],
};
