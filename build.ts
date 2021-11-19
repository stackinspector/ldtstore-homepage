// deno-lint-ignore-file camelcase

// deno run -A --unstable build.ts path\to\wwwroot\

import { minify } from "https://deno.land/x/minifier@v1.1.1/mod.ts"
import { decodeText } from "https://cdn.jsdelivr.net/gh/stackinspector/DenoBase@latest/textcodec.ts"

const target_dir = Deno.args[0] as string

const bundle_options: Deno.EmitOptions = {
  bundle: "classic",
  compilerOptions: {
    lib: ["esnext", "dom"]
  }
}

const robots = `User-agent: *
Allow: /
Allow: /index.html
Disallow: /*`

const git = decodeText(
  await Deno.run({
    cmd: `git log -1 --pretty=format:"%h"`.split(" "),
    stdout: "piped",
  }).output(),
).replaceAll(`"`, "")

const copyright = `
  Copyright 2021 CarrotGeball & stackinspector. MIT Lincese.
  Source code: https://github.com/stackinspector/ldtstore-homepage
  Commit: ${git}
`

const html = async (filename: string) => minify("html", (await Deno.readTextFile(filename)).replaceAll(
  `<script src="/main.js"></script>`,
  `<script src="/main-${git}.js"></script>`
).replaceAll(
  `<link rel="stylesheet" href="/style.css">`,
  `<link rel="stylesheet" href="/style-${git}.css">`
))

const css = async (filename: string) => minify("css", await Deno.readTextFile(filename))

const js = async (filename: string) => minify("js", (await Deno.emit(filename, bundle_options)).files["deno:///bundle.js"])

const emit = async (filename: string, content: string) => {
  await Deno.writeTextFile(
    target_dir + filename,
    (filename.substring(filename.length - 5) === ".html" ? `<!--${copyright}-->\n\n` : `/*${copyright}*/\n\n`) +
    content.replaceAll(
      "/assert/image",
      "https://cdn.jsdelivr.net/gh/stackinspector/ldtstore-assert@latest/image",
    ),
  )
}

await Deno.writeTextFile(target_dir + "robots.txt", robots)
await Deno.mkdir(target_dir + "ldtools")

await emit("index.html", await html("index.html"))
await emit("ldtools/index.html", await html("ldtools/index.html"))
await emit(`style-${git}.css`, await css("style.css"))
await emit(`main-${git}.js`, await js("main.ts"))
