import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    dangerouslyAllowSVG: true,
  },
  experimental: {
    // Raise Server Action body limit — needed for the clearance-letter .docx
    // upload at /settings (`uploadClearanceTemplate`). The action itself caps
    // payloads at 5 MB (MAX_BYTES in src/actions/templates.ts), so keep these
    // in sync.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
