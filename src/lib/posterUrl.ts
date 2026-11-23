// API responses may name the VM or an internal Compose hostname. Fetch event posters
// through this frontend's /api proxy, including authenticated draft posters.
export function posterUrlThroughProxy(value: string): string {
  try {
    const url = new URL(value, "https://frontend.invalid");
    return /^\/api\/events\/\d+\/poster$/.test(url.pathname) ? `${url.pathname}${url.search}` : value;
  } catch { return value; }
}
