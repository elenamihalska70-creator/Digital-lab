# Digital Lab video optimization

`public/videos/` retains the original MP4 sources. Vite publishes the MP4s from `media/web-videos/` at the existing `/videos/` URLs in the normal build and both Cloudflare modes. Keeping an optimized copy in source control avoids an FFmpeg dependency in Vercel and Cloudflare builds. The Vite build fails if a source lacks a derivative or if a derivative is empty or reaches 25 MiB.

All nine sources and derivatives use H.264 and AAC. The derivatives use compatible yuv420p and faststart, with audio, frame composition and full duration preserved. The 16:9 clips were reduced to 1280×720, the 4:3 clips to 1280×960 and the portrait MicroAssist clip to 720×1280. No crop, blur, or removal of visual attribution was applied.

| File | Current page use | Original bytes | Web bytes | Duration (s) | Marks visible in sampled frames |
| --- | --- | ---: | ---: | ---: | --- |
| `AI_Website_Transformation.mp4` | FR/EN home transformation section | 40766617 | 5868085 | 45.093 | CapCut, lower left around 22.5 and 41 s and on end card |
| `microassist.mp4` | FR/EN project cards and `/projects/microassist` | 37518617 | 3438936 | 236.147 | CapCut, lower left and upper right on different frames |
| `microassist-expert.mp4` | FR/EN project cards and `/projects/microassist-expert` | 13044499 | 8411382 | 71.900 | Created with Pictory, lower right |
| `socle-local.mp4` | FR/EN project cards and `/projects/socle-local` | 9890935 | 1136917 | 10.356 | No editor watermark seen in samples |
| `automatisation.mp4` | FR/EN project cards and `/projects/assistant-reservation-ia` | 16840134 | 2415492 | 50.225 | CapCut, lower left and upper right |
| `digitallab-audit-site-web.mp4` | FR/EN home Audit spotlight/showcase and `/audit-site-web` | 6040612 | 2845951 | 19.033 | MiniMax / Hailuo AI, lower right on final scene |
| `automatisation-communications-web.mp4` | FR/EN home automation showcase and its direct video link | 3982517 | 1830431 | 14.602 | MiniMax mark, lower right on phone scene |
| `Digitallab_audit.mp4` | Shipped legacy asset, no active app reference | 14566247 | 3018161 | 14.953 | MiniMax / Hailuo AI, lower right on final scene |
| `automatisation-communications.mp4` | Shipped legacy asset, no active app reference | 5796445 | 1710884 | 13.467 | MiniMax mark, lower right on phone scene |

The original player attached media near the viewport and loaded metadata. Some cards played on hover, project cases autoplayed, and the transformation video played near the viewport. Now posters show before interaction and players use `preload="none"` and inline, user-initiated playback. Project and transformation clips expose native controls. Audit cards use click or keyboard play/pause. The transformation also has a WebP poster from a source frame. Browsers can interpret preload as a hint. The Chromium regression checks for no MP4 requests before interaction, even after scrolling or hovering.

Visual review used original and optimized frames at approximately 9%, 50% and 91% of each clip, plus additional source samples. Editors' marks remain visible. Motion transitions can differ by a frame in the comparison, and small UI text is softer after resizing. Dark intervals in the MicroAssist source, including around 118 and 215 seconds, are present in the source. If that runtime was unintended, request the original timeline and a clean export before shortening the clip.

## Source requests and reuse

For replacement, ask the owner for original CapCut projects or clean exports for the transformation, MicroAssist and reservation clips; the source timeline and licensed stock for Pictory's MicroAssist Expert; and original licensed MiniMax/Hailuo generations or clean exports for the audit and communications clips. Verify the applicable terms and maintain any required credit. Marks change corners and sometimes sit next to subtitles or demo UI. Reframing to remove them risks cutting meaningful content. Use composition-only reframing after rights review if a clean export is unavailable; keep the full frame in the meantime.

Future re-exports can use FFmpeg libx264, CRF 21, fast preset, yuv420p, AAC 80 kb/s, and `-movflags +faststart`. The current derivatives use a 1,600 kb/s video peak cap and a 720 kb/s cap for the long portrait clip, with a matching VBV buffer. Preserve the source aspect ratio and audio. Run the normal and both standby builds, then run `node scripts/check-video-ui.mjs` with Playwright Chromium available.
