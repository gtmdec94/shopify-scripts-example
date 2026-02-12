export default () => ({
  port: parseInt(process.env.API_PORT || '3001', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh',
    expiration: process.env.JWT_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
    scopes: process.env.SHOPIFY_SCOPES || '',
    appUrl: process.env.SHOPIFY_APP_URL || '',
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || '',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    bucket: process.env.S3_BUCKET || 'b2b-uploads',
    region: process.env.S3_REGION || 'us-east-1',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  mail: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'noreply@b2b-platform.com',
  },
  shipping: {
    provider: process.env.SHIPPING_PROVIDER || 'mock',
    apiKey: process.env.SHIPPING_API_KEY || '',
    apiUrl: process.env.SHIPPING_API_URL || '',
  },
});
