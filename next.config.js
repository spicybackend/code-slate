/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import removeImports from "next-remove-imports";

const removeImportsConfig = removeImports({
  // Remove imports for modules that should only run on the client
});

/** @type {import("next").NextConfig} */
const config = {
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  },
};

export default removeImportsConfig(config);
