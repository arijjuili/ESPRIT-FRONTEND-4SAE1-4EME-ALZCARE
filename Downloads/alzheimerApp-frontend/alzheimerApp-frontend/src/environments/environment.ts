export const environment = {
  production: false,
  
  // API Gateway - all backend requests go through here
  apiUrl: '/api/v1',
  
  // Keycloak Configuration - for authentication only
  keycloak: {
    url: '/realms/alzcare/protocol/openid-connect/token',
    realm: 'alzcare',
    clientId: 'alzcare-webapp'
  }
};
