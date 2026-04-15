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
    cloudName: 'dofap5wt0',
    uploadPreset: 'lzcare_behavior_logs',
    apiKey: '975119429958434',
    apiUrl: 'https://api.cloudinary.com/v1_1',
    folder: 'alzcare/patient_profiles',
    maxFileSizeMB: 5,
    allowedFormats: ['jpg', 'jpeg', 'png', 'heic', 'heif']
  }
};
