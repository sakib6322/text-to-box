<<<<<<< HEAD
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
=======
module.exports = {
  apps: [{
    name: "pgdiary-api",
    cwd: __dirname,
    script: "server/index.mjs",
    interpreter: "node",
    env: { NODE_ENV: "production", PORT: 8787 },
  }],
>>>>>>> 543fcc3c36c719fadcb6f59df4127fb11c1915d4
};
