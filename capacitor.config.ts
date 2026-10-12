import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Permanent on Google Play once the first release is uploaded.
  appId: "com.latente.app",
  appName: "Latente",
  webDir: "dist-mobile",
  backgroundColor: "#110e0c",
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SystemBars: {
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
  },
};

export default config;
