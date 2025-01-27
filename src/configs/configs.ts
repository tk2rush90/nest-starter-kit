import { join } from 'path';

export const configs = {
  // 다양한 경로 관련 설정
  paths: {
    assets: join(__dirname, '..', 'assets'), // Path to static assets.
    logs: process.env.LOGS_PATH || '', // Path to logs.
    files: process.env.FILES_PATH || '', // Path to uploaded files.
    emailTemplates: join(__dirname, '..', 'email-templates'), // Path to email templates.
  },
  // URL 프리픽스 설정
  urls: {
    // 백엔드 호스트
    host: 'http://localhost:3000',
    assets: 'http://localhost:3000/assets',
  },
  // TypeORM 데이터베이스 연결 설정
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_DATABASE || 'test_db',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  // JSONWebToken 설정
  jwt: {
    secret: process.env.JWT_SECRET || 'HWiPJDWBa4XLq5E9b403RegeMp8Gl5Vk',
    issuer: process.env.JWT_ISSUER || 'nest-starter-kit',
  },
  // 메일 설정
  mail: {
    user: process.env.VELCA_MAIL_USER || `velca.official@gmail.com`,
    pass: process.env.VELCA_MAIL_PASS || 'vmryllwaxqbtwgrj',
    sender: `"벨벳카푸치노" <velca.official@gmail.com>`,
  },
  // 기타 여러가지 설정
  etc: {
    production: process.env.PRODUCTION?.toLowerCase() === 'true',
    appName: 'nest-starter-kit',
    clusterMode: process.env.CLUSTER_MODE?.toLowerCase() === 'true',
  },
  // OAuth 인증 관련 설정
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
