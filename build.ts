// deno-lint-ignore-file camelcase
import { decodeText } from "https://cdn.jsdelivr.net/gh/stackinspector/DenoBase@latest/textcodec.ts"

const list = ["index.html", "style.css", "main.js", "ldtools/index.html"]
const target_dir = Deno.args[0] as string

const copyright = `
  Copyright 2021 CarrotGeball & stackinspector. MIT Lincese.
  Source code: https://github.com/stackinspector/ldtstore-homepage
  Commit: ${
  decodeText(
    await Deno.run({
      cmd: `git log -1 --pretty=format:"%h"`.split(" "),
      stdout: "piped",
    }).output(),
  ).replaceAll(`"`, "")
}
`

for (const filename of list) {
  Deno.writeTextFileSync(
    target_dir + filename,
    (filename.substring(filename.length - 5) === ".html" ? `<!--${copyright}-->\n\n` : `/*${copyright}*/\n\n`) +
      Deno.readTextFileSync("./" + filename).replaceAll(
        "/assert/image",
        "https://cdn.jsdelivr.net/gh/stackinspector/ldtstore-assert@latest/image",
      ),
  )
}
