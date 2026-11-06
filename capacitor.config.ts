import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "za.co.cargoflowafrica.manage",
  appName: "Cargo Flow",
  webDir: "dist",
  server: {
    url: "https://manage.cargoflowafrica.co.za/",
  },
};

export default config;
