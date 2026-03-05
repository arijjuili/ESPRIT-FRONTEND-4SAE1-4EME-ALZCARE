export const environment = {
  production: true,
  
  // API Gateway - use relative path so reverse proxy can route requests
  apiUrl: '/api',
  
  // Keycloak Configuration - for authentication only
  keycloak: {
    url: '/realms/alzcare/protocol/openid-connect/token',
    realm: 'alzcare',
    clientId: 'alzcare-webapp'
  },

  // Cloudinary Configuration - for image uploads
  cloudinary: {
    cloudName: 'dpudy4roo',
    uploadPreset: 'lzcare_behavior_logs',
    apiKey: '939852368511999',
    apiSecret: 'wFE1zjHbQKhD3h4bovvN1Zog4v0',
    apiUrl: 'https://api.cloudinary.com/v1_1',
    folder: 'behavior_logs',
    maxFileSizeMB: 5,
    allowedFormats: ['jpg', 'jpeg', 'png', 'heic', 'heif']
  }
};
