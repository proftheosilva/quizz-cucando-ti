module.exports = {
  apps: [{
    name: 'quiz-cucando-ti',
    cwd: __dirname,
    script: './server/index.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    restart_delay: 3000,
    max_memory_restart: '600M',
    kill_timeout: 10000,
    time: true,
    env: {
      NODE_ENV: 'production',
      HOST: '172.18.0.1',
      PORT: '3101',
      APP_ORIGIN: 'https://quizz.cucandoti.com.br'
    }
  }]
};
