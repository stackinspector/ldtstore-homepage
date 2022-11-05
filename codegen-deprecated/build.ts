// deno-lint-ignore-file camelcase

import { build } from "https://deno.land/x/esbuild@v0.14.13/mod.js"
import { codegen } from "./codegen.ts"

const throw_fn = (err: unknown): never => { throw err }
const unwrap = <T>(opt: T | undefined): T => opt !== void 0 ? opt : throw_fn(new TypeError("called unwrap() on a None (undefined) value"))
const unwrap_null = <T>(opt: T | null): T => opt !== null ? opt : throw_fn(new TypeError("called unwrap_null() on a null value"))

const ADDR = {
  default: {
    IMAGE: "//s0.ldtstore.com.cn",
    MIRROR: "//d1.ldtstore.com.cn",
  },
  intl: {
    IMAGE: "//fastly.jsdelivr.net/gh/stackinspector/ldtstore-assert@latest/image",
    MIRROR: "//d1.ldtstore.net",
  },
  test: {
    IMAGE: "/image",
    MIRROR: "//d1.ldtstore.net",
  },
}

const target_dir = Deno.args[0]!
const cfg = Deno.args[1] as keyof typeof ADDR
const current_addr = ADDR[cfg]

const global_replace = (input: string) => input.replaceAll(
  "{{IMAGE}}", current_addr.IMAGE
).replaceAll(
  "{{MIRROR}}", current_addr.MIRROR
)

const commit = (await Deno.readTextFile(`.git/${unwrap(unwrap_null(/ref: (.+)\n/gm.exec(await Deno.readTextFile(".git/HEAD")))[1])}`)).slice(0, 7)

const copyright = `
  Copyright (c) 2021-2022 CarrotGeball and stackinspector. All rights reserved. MIT license.
  Source code: https://github.com/stackinspector/ldtstore-homepage
  Commit: ${commit}
`

const css = async (filename: string) => unwrap((await build({ entryPoints: [filename], minify: true, write: false })).outputFiles)[0].text

const static_inserts: Map<string, string> = new Map()
for await (const item of Deno.readDir("./fragment")) {
  if (!item.isFile) continue
  static_inserts.set(`<!--{{${item.name}}}-->`, await Deno.readTextFile("./fragment/" + item.name))
}

static_inserts.set(`<!--{{footer}}-->`, await Deno.readTextFile(cfg === "intl" ? "./fragment/footer-intl.html" : "./fragment/footer.html"))

const insert = (template: string, content: Map<string, string>) => template.replaceAll(
  new RegExp([...content.keys()].join("|"), "gi"),
  (matched) => content.get(matched)!
)

const html = async (filename: string) => {
  const source = await Deno.readTextFile(filename)
  const static_templated = insert(source, static_inserts)
  const dynamic_templated = insert(static_templated, codegen(filename))
  const content = dynamic_templated.replaceAll(
    `<script src="/main.js"></script>`,
    `<script src="/main-${commit}.js"></script>`
  ).replaceAll(
    `<link rel="stylesheet" href="/style.css">`,
    `<link rel="stylesheet" href="/style-${commit}.css">`
  ).replaceAll(
    `<a n `,
    `<a target="_blank" `
  ).replaceAll(
    "/*{{minified:plain.css}}*/",
    await css("fragment/plain.css"),
  )
  return content
}

const ts = async (filename: string) => {
  const esbuild_result = await build({
    entryPoints: [filename],
    minifyWhitespace: true,
    minifySyntax: true,
    target: ["es6"],
    write: false,
  })
  console.log({
    esbuild: esbuild_result,
  })
  return `(function(){${esbuild_result.outputFiles[0].text.slice(0, -1)}})()\n`
}

await Deno.writeTextFile(target_dir + "/robots.txt", await Deno.readTextFile("robots.txt"))
await Deno.writeTextFile(target_dir + "/error.html", await Deno.readTextFile("error.html"))
await Deno.mkdir(target_dir + "/ldtools", { recursive: true })

await Deno.writeTextFile(
  `${target_dir}/index.html`,
  `<!--${copyright}-->\n\n${global_replace(await html("index.html"))}`,
)
await Deno.writeTextFile(
  `${target_dir}/ldtools/index.html`,
  `<!--${copyright}-->\n\n${global_replace(await html("ldtools/index.html"))}`,
)
await Deno.writeTextFile(
  `${target_dir}/ldtools/plain.html`,
  `<!--${copyright}-->\n\n${global_replace(await html("ldtools/plain.html"))}`,
)
await Deno.writeTextFile(
  `${target_dir}/style-${commit}.css`,
  `/*${copyright}*/\n\n${global_replace(await css("style.css"))}`,
)
await Deno.writeTextFile(
  `${target_dir}/main-${commit}.js`,
  `/*${copyright}*/\n\n${global_replace(await ts("main.ts"))}`,
)

Deno.exit(0)
