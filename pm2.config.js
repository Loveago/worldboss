module.exports = {
  apps: [
    {
      name: "corelly",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "corelly-worker",
      script: "workers/encart-status.ts",
      interpreter: "npx",
      interpreter_args: "tsx",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
      // Restart worker if it crashes, with backoff
      exp_backoff_restart_delay: 5000,
    },
    {
      name: "corelly-grandtech-worker",
      script: "workers/grandtech-status.ts",
      interpreter: "npx",
      interpreter_args: "tsx",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
      exp_backoff_restart_delay: 5000,
    },
  ],
};
