import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        allowedHosts: [
            "localhost",
            "127.0.0.1",
            "beads-guilty-bargains-ever.trycloudflare.com",
        ],
        proxy: {
            // any request starting with `/api` will be forwarded to FastAPI
            "/api": {
                target: "http://localhost:8000",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
});