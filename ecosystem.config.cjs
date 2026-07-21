// PM2 ecosystem configuration for ABHIJÑĀNA production deployment
module.exports = {
  apps: [
    {
      name: 'abhijnana-api',
      script: 'server/src/index.js',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 4317,
        ENGINE_URL: 'http://127.0.0.1:4318',
        // Optional Redis cache: uncomment to enable if Redis is running locally
        // REDIS_URL: 'redis://127.0.0.1:6379'
      }
    },
    {
      name: 'abhijnana-engine',
      // For Linux / macOS servers, use: engine/venv/bin/uvicorn
      // For Windows servers, use: engine/venv/Scripts/uvicorn.exe
      script: 'engine/venv/bin/uvicorn',
      args: 'app:app --host 127.0.0.1 --port 4318 --workers 2',
      cwd: './engine',
      interpreter: 'none', // Runs the virtualenv uvicorn directly
    }
  ]
};
