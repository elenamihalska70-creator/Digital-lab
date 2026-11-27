export function cloudflareBuild(mode) {
  const artifact = process.env.DL_CLOUDFLARE_ARTIFACT;
  if (!artifact && !mode?.startsWith("cloudflare-")) return null;
  if (!["TEST", "FAILOVER"].includes(artifact) || mode !== `cloudflare-${artifact.toLowerCase()}`) {
    throw new Error("Run npm run build:cloudflare -- TEST or FAILOVER.");
  }
  return { artifact, outDir: `cloudflare-${artifact}.local` };
}
