// deno-lint-ignore-file camelcase

import { minify } from "https://deno.land/x/minifier@v1.1.1/mod.ts"
import { transform } from "https://deno.land/x/esbuild@v0.14.13/mod.js"
import { codegen } from "./codegen.ts"

const target_dir = Deno.args[0]!

const robots = `User-agent: *
Allow: /
Allow: /index.html
Disallow: /*`

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

const emit = async (filename: string) => {
  const splited = filename.split(".")
  const ext = splited.pop()!
  const name = splited.join("")
  if (ext === "html") {
    await Deno.writeTextFile(
      `${target_dir}/${name}.html`,
      `<!--${copyright}-->\n\n${await html(filename)}`,
    )
  } else if (ext === "css") {
    await Deno.writeTextFile(
      `${target_dir}/${name}-${git}.css`,
      `/*${copyright}*/\n\n${await css(filename)}`,
    )
  } else if (ext === "ts") {
    await Deno.writeTextFile(
      `${target_dir}/${name}-${git}.js`,
      `/*${copyright}*/\n\n${await ts(filename)}`,
    )
  } else {
    throw new Error("unknown file type")
  }
}

await Deno.writeTextFile(target_dir + "/robots.txt", robots)
try {
  await Deno.mkdir(target_dir + "/ldtools")
} catch (e) {
  console.log(e)
}

await emit("index.html")
await emit("ldtools/index.html")
await emit("style.css")
await emit("main.ts")

Deno.exit(0)
