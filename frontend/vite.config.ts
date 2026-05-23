import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
    vite: {
        server: {
            host: "0.0.0.0",
            strictPort: false
        },
        preview: {
            host: "0.0.0.0",
            allowedHosts: [
                "prathappicturepalace-production.up.railway.app"
            ]
        }
    }
});