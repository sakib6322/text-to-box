/** PM2: API only. Frontend is served by nginx from dist/ */
module.exports = {
  apps: [
    {
      name: "pgdiary-api",
      cwd: __dirname,
      script: "server/index.mjs",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 8787,
      },
    },
  ],
};
