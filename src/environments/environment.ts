export const environment = {
  production: false,
  
  // API Gateway - all backend requests go through here
  apiUrl: '/api',
  
  // Keycloak Configuration - for authentication only
  keycloak: {
    url: '/realms/alzcare/protocol/openid-connect/token',
    realm: 'alzcare',
    clientId: 'alzcare-webapp'
  },

  // Cloudinary Configuration - for image uploads
  cloudinary: {
    cloudName: 'dfbzqlgws',
    uploadPreset: 'lzcare_behavior_logs',
    apiKey: '838495449154258',
    apiUrl: 'https://api.cloudinary.com/v1_1',
    folder: 'alzcare/patient_profiles',
    maxFileSizeMB: 5,
    allowedFormats: ['jpg', 'jpeg', 'png', 'heic', 'heif']
  }
};
