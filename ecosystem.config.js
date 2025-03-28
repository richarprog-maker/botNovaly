
module.exports = {
  apps : [
      {
        name: "bot-3006",
        script: "./app.js",
        instances: 1,
        exec_mode: "cluster", 
        watch: false,
        max_memory_restart: "300M", 
        autorestart: true,
        cron_restart: "59 23 * * *"
      }
  ]
}
