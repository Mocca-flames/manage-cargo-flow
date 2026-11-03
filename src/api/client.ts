import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import type { paths } from "./schema";
import { getToken } from "../auth/token";

export const client = createFetchClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? "/api",
});

client.use({
  onRequest({ request }) {
    const token = getToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  onResponse({ response }) {
    // Only treat 401 as "session expired" if we actually sent a token.
    // (A wrong password on the login screen also returns 401 and must not log out.)
    if (response.status === 401 && getToken()) {
      window.dispatchEvent(new Event("auth:expired"));
    }
    return response;
  },
});

// Use $api in React components. Use `client` for one-off calls outside React.
export const $api = createClient(client);
