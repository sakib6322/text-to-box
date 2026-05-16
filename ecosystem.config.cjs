/** Production PM2 config for pgdiary.cloud (Vite + Express API — not Next.js). */
module.exports = {
  apps: [
    {
      name: "text-to-box-api",
      cwd: __dirname,
      script: "server/index.mjs",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 8787,
      },
    },
    {
      name: "text-to-box-web",
      cwd: __dirname,
      script: "node_modules/vite/bin/vite.js",
      args: "preview --host 0.0.0.0 --port 8080",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
