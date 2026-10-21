module.exports = {
  apps: [
    {
      name: 'music-house',
      script: 'server.js',
      cwd: __dirname,
      env: {
        PORT: 3100,
        NODE_ENV: 'production'
      },
      autorestart: true,
      max_memory_restart: '300M',
      out_file: './logs/out.log',
      error_file: './logs/err.log',
      merge_logs: true,
      time: true
    }
  ]
}