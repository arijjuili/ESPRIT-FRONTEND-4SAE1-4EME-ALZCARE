export const environment = {
  production: true,
  
  // API Gateway - all backend requests go through here
  apiUrl: '/api',
  
  // Keycloak Configuration - for authentication only
  keycloak: {
    url: '/realms/alzcare/protocol/openid-connect/token',
    realm: 'alzcare',
    clientId: 'alzcare-webapp'
  }
};
