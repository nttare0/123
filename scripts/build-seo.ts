import { mkdir, readFile, writeFile } from "node:fs/promises"

// Give crawlers and link previews correct Browse metadata before JavaScript runs.
const html = await readFile("dist/index.html", "utf8")
const browse = html
  .replace(/<title>.*?<\/title>/, "<title>Browse live TV channels | Zepvi</title>")
  .replace(/(<meta property="og:title" content=")[^"]*/, "$1Browse live TV channels | Zepvi")
  .replace(/(<link rel="canonical" href=")[^"]*/, "$1https://droptv.vercel.app/browse")
  .replace(/(<meta property="og:url" content=")[^"]*/, "$1https://droptv.vercel.app/browse")
  .replace(/(<meta name="twitter:title" content=")[^"]*/, "$1Browse live TV channels | Zepvi")
await mkdir("dist/browse", { recursive: true })
await writeFile("dist/browse/index.html", browse)
