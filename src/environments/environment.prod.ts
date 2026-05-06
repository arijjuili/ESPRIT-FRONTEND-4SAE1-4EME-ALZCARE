export const environment = {
  production: true,

  // Kubernetes Gateway NodePort for production
  apiUrl: 'http://192.168.89.128:30080/api',

  // Kubernetes Keycloak NodePort
  keycloak: {
    url: 'http://192.168.89.128:30090/realms/alzcare/protocol/openid-connect/token',
    realm: 'alzcare',
    clientId: 'alzcare-webapp'
  },

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