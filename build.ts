// deno-lint-ignore-file camelcase

// deno run -A --unstable build.ts path\to\wwwroot\

import { minify } from "https://deno.land/x/minifier@v1.1.1/mod.ts"
import { decodeText } from "https://cdn.jsdelivr.net/gh/stackinspector/DenoBase@latest/textcodec.ts"
import { insert } from "https://cdn.jsdelivr.net/gh/stackinspector/DenoBase@latest/insert-string.ts"
import { codegen } from "./codegen.ts"

const target_dir = Deno.args[0]!
const release = Boolean(Deno.args[1])

// const LDTSTORE_ASSERT = "cdn.jsdelivr.net/gh/stackinspector/ldtstore-assert@latest"
const LDTSTORE_ASSERT = "ldtstore-assert-1307736292.file.myqcloud.com"
const TOOL_DELIVERY_LDT = "tool-delivery-ldt-1307736292.file.myqcloud.com"

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
  Copyright (c) 2021-2022 CarrotGeball and stackinspector. All rights reserved. MIT license.
  Source code: https://github.com/stackinspector/ldtstore-homepage
  Commit: ${git}
`

const replace_redirect = (content: string) => content.replaceAll(
    `<a target="_blank" class="link" href="/r/`,
    `<a target="_blank" class="link" href="https://ldtstore.com.cn/r/`
  ).replaceAll(
    `<a target="_blank" class="tile-link" href="/r/`,
    `<a target="_blank" class="tile-link" href="https://ldtstore.com.cn/r/`
  ).replaceAll(
    `<a target="_blank" class="link" href="/r2/`,
    `<a target="_blank" class="link" href="https://ldtstore.com.cn/r2/`
  ).replaceAll(
    `<a target="_blank" class="tile-link" href="/r2/`,
    `<a target="_blank" class="tile-link" href="https://ldtstore.com.cn/r2/`
)

const html = async (filename: string) => {
  const inserts: Map<string, string> = new Map()
  for await (const item of Deno.readDir("./fragment")) {
    if (!item.isFile) continue
    inserts.set(`<!--{{${item.name}}}-->`, await Deno.readTextFile("./fragment/" + item.name))
  }
  const { major, sides } = codegen(filename)
  inserts.set(`<!--{{major}}-->`, major)
  inserts.set(`<!--{{sides}}-->`, sides)
  const templated = insert(await Deno.readTextFile(filename), inserts)
  const content = templated.replaceAll(
    `<script src="/main.js"></script>`,
    `<script src="/main-${git}.js"></script>`
  ).replaceAll(
    `<link rel="stylesheet" href="/style.css">`,
    `<link rel="stylesheet" href="/style-${git}.css">`
  ).replaceAll(
    `<a `,
    `<a target="_blank" `
  ).replaceAll(
    "{{TOOL_DELIVERY_LDT}}",
    TOOL_DELIVERY_LDT
  )
  return minify("html", release ? content : replace_redirect(content))
}
const css = async (filename: string) => minify("css", await Deno.readTextFile(filename))

const js_inner = async (filename: string) => (await Deno.emit(filename, bundle_options)).files["deno:///bundle.js"]

const js = async (filename: string) => minify("js", await js_inner(filename))

const emit = async (filename: string, content: string) => {
  await Deno.writeTextFile(
    target_dir + filename,
    (filename.substring(filename.length - 5) === ".html" ? `<!--${copyright}-->\n\n` : `/*${copyright}*/\n\n`) +
    content.replaceAll(
      "/assert/image",
      `//${LDTSTORE_ASSERT}/image`,
    ),
  )
}

await Deno.writeTextFile(target_dir + "robots.txt", robots)
if (release) await Deno.mkdir(target_dir + "ldtools")

await emit("index.html", await html("index.html"))
await emit("ldtools/index.html", await html("ldtools/index.html"))
await emit(`style-${git}.css`, await css("style.css"))
await emit(`main-${git}.js`, await js("main.ts"))
