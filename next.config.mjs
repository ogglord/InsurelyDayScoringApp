/** @type {import('next').NextConfig} */
const nextConfig = {
  // Runtime is `next start` (npm start) everywhere — systemd on the LXC and the
  // Docker image. No `output: 'standalone'` so the build matches the runtime.
};

export default nextConfig;
