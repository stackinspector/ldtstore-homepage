// deno-lint-ignore-file camelcase

const list = ["index.html", "style.css", "main.js"]
const target_dir = Deno.args[0] as string

for (const filename of list) {
    Deno.writeTextFileSync(
        target_dir + filename,
        Deno.readTextFileSync("./" + filename).replaceAll(
            "/assert/image",
            "https://cdn.jsdelivr.net/gh/stackinspector/ldtstore-assert/image"
        )
    )
}
