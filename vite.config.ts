import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const iotProxyTarget = env.VITE_IOT_PROXY_TARGET;

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: iotProxyTarget
        ? {
            "/api/iot-soil": {
              target: iotProxyTarget,
              changeOrigin: true,
              rewrite: (pathValue) => pathValue.replace(/^\/api\/iot-soil/, "/latest"),
              secure: true,
            },
          }
        : undefined,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
