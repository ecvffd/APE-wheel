module.exports = {
  apps: [{
    name: "ape-wheel",
    script: "npm",
    args: "run start",
    cwd: "/root/APE-wheel/",
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: "production"
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "/var/log/ape-wheel/error.log",
    out_file: "/var/log/ape-wheel/out.log"
  }]
}