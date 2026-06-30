module.exports = {
  apps: [
    {
      name: "riversoft-api",
      script: "index.js",
      cwd: "/var/www/riversoft-api",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        DATABASE_PATH: "/home/deploy/riversoft-data/database.sqlite"
      }
    }
  ]
};
