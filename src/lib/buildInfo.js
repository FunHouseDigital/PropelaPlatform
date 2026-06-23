/**
 * Build metadata module.
 * Values are injected at build time via Vite's define config.
 * In development, fallback values are used.
 */

export const buildInfo = {
  version: __APP_VERSION__,
  buildTimestamp: __BUILD_TIMESTAMP__,
  gitCommit: __GIT_COMMIT_HASH__,
};

export default buildInfo;
