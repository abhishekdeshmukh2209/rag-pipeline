export const environment = {
  production: true,
  /**
   * Production keeps the backend behind the public UI domain.
   * Nginx forwards /api/* to the private Spring service.
   */
  apiUrl: "/api"
};
