import { copyFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// Keep the original sources and public URLs. Publish only the optimized copies.
export function webVideos() {
  let config;
  return {
    name: "digital-lab-web-videos",
    apply: "build",
    configResolved(resolved) {
      config = resolved;
    },
    writeBundle() {
      const originals = join(config.root, "public", "videos");
      const optimized = join(config.root, "media", "web-videos");
      const destination = resolve(config.root, config.build.outDir, "videos");
      for (const file of readdirSync(originals).filter(name => name.endsWith(".mp4"))) {
        const source = join(optimized, file);
        const size = statSync(source).size;
        if (!size || size >= 25 * 1024 ** 2) {
          throw new Error(`Invalid web video size: ${file} (${size} bytes)`);
        }
        copyFileSync(source, join(destination, file));
      }
    },
  };
}
