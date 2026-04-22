import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "http://dataocd-keycloak.eastus.azurecontainer.io:8080",
  realm: "dataocd",
  clientId: "frontend-app",
});

export default keycloak;
