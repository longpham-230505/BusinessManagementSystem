// Bindings/biến của Cloudflare Worker mà code app dùng (khớp với wrangler.jsonc).
declare global {
  interface CloudflareEnv {
    /** Hyperdrive tới database Neon. */
    HYPERDRIVE?: { connectionString: string };
  }
}

export {};
