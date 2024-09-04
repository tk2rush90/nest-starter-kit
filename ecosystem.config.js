module.exports = {
  apps: [
    {
      name: 'Your-App-Name',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        POLL_CLUSTER_MODE: 'true',
      },
    },
  ],
};
