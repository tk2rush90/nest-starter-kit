import { join } from 'path';

export const configs = {
  // Any path configurations.
  paths: {
    assets: join(__dirname, '..', 'assets'), // Path to static assets.
    logs: process.env.LOGS_PATH || '', // Path to logs.
    files: process.env.FILES_PATH || '', // Path to uploaded files.
    emailTemplates: join(__dirname, '..', 'email-templates'), // Path to email templates.
  },
  // Url prefix configurations.
  urls: {
    assets: 'http://localhost:3000/assets',
  },
  // Database configuration.
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_DATABASE || 'test_db',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  // Jsonwebtoken configurations.
  jwt: {
    secret: process.env.JWT_SECRET || '',
    issuer: process.env.JWT_ISSUER || '',
  },
  // Mail configurations.
  mail: {
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS,
    sender: '',
  },
  // SSL configurations.
  ssl: {
    key: process.env.SSL_KEY || '',
    cert: process.env.SSL_CERT || '',
  },
  // Other configurations.
  etc: {
    production: process.env.PRODUCTION?.toLowerCase() === 'true',
    appName: 'Your-App-Name',
    clusterMode: process.env.CLUSTER_MODE?.toLowerCase() === 'true',
  },
  // Oauth configurations.
  oauth: {
    google: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
      redirectUrl: process.env.GOOGLE_OAUTH_REDIRECT_URL || '',
      userinfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    },
    kakao: {
      clientId: process.env.KAKAO_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.KAKAO_OAUTH_CLIENT_SECRET || '',
      redirectUrl: process.env.KAKAO_OAUTH_REDIRECT_URL || '',
      tokenUrl: 'https://kauth.kakao.com/oauth/token',
    },
  },
};
