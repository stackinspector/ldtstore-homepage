// deno-lint-ignore-file camelcase

import { minify } from "https://deno.land/x/minifier@v1.1.1/mod.ts"
import { transform } from "https://deno.land/x/esbuild@v0.14.13/mod.js"
import { codegen } from "./codegen.ts"

const ADDR = {
  default: {
    IMAGE: "//s0.ldtstore.com.cn",
    MIRROR: "//d1.ldtstore.com.cn",
  },
  intl: {
    IMAGE: "//cdn.jsdelivr.net/gh/stackinspector/ldtstore-assert@latest/image",
    MIRROR: "//d1.ldtstore.net",
  },
}

const global_replace = (input: string) => input.replaceAll(
  "{{IMAGE}}", current_addr.IMAGE
).replaceAll(
  "{{MIRROR}}", current_addr.MIRROR
)

const target_dir = Deno.args[0]!
const cfg = Deno.args[1] as keyof typeof ADDR
const current_addr = ADDR[cfg]

const git = new TextDecoder().decode(
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

const static_inserts: Map<string, string> = new Map()
for await (const item of Deno.readDir("./fragment")) {
  if (!item.isFile) continue
  static_inserts.set(`<!--{{${item.name}}}-->`, await Deno.readTextFile("./fragment/" + item.name))
}

static_inserts.set(`<!--{{footer}}-->`, await Deno.readTextFile(cfg === "intl" ? "./fragment/footer-intl.html" : "./fragment/footer.html"))

const insert = (template: string, content: Map<string, string>) => template.replaceAll(
  new RegExp([...content.keys()].join("|"),"gi"),
  (matched) => content.get(matched)!
)

const html = async (filename: string) => {
  const source = await Deno.readTextFile(filename)
  const static_templated = insert(source, static_inserts)
  const dynamic_templated = insert(static_templated, codegen(filename))
  const content = dynamic_templated.replaceAll(
    `<script src="/main.js"></script>`,
    `<script src="/main-${git}.js"></script>`
  ).replaceAll(
    `<link rel="stylesheet" href="/style.css">`,
    `<link rel="stylesheet" href="/style-${git}.css">`
  ).replaceAll(
    `<a `,
    `<a target="_blank" `
  )
  return minify("html", content)
}

const css = async (filename: string) => minify("css", await Deno.readTextFile(filename))

const ts = async (filename: string) => {
  const bundle_result = await Deno.emit(filename, {
    bundle: "classic",
    compilerOptions: {
      lib: ["esnext", "dom"],
    }
  })
  const transform_result = await transform(bundle_result.files["deno:///bundle.js"], {
    minifyWhitespace: true,
    minifySyntax: true,
    target: ["es6"],
  })
  console.log({
    bundle: bundle_result,
    transform: transform_result,
  })
  return transform_result.code
}

await Deno.writeTextFile(target_dir + "/robots.txt", await Deno.readTextFile("robots.txt"))
await Deno.writeTextFile(target_dir + "/error.html", await Deno.readTextFile("error.html"))
await Deno.mkdir(target_dir + "/ldtools", { recursive: true })

await Deno.writeTextFile(
  `${target_dir}/index.html`,
  `<!--${copyright}-->\n\n${global_replace(await html(`index.html`))}`,
)
await Deno.writeTextFile(
  `${target_dir}/ldtools/index.html`,
  `<!--${copyright}-->\n\n${global_replace(await html(`ldtools/index.html`))}`,
)
await Deno.writeTextFile(
  `${target_dir}/style-${git}.css`,
  `/*${copyright}*/\n\n${global_replace(await css("style.css"))}`,
)
await Deno.writeTextFile(
  `${target_dir}/main-${git}.js`,
  `/*${copyright}*/\n\n${global_replace(await ts("main.ts"))}`,
)

Deno.exit(0)
