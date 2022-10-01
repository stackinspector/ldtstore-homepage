import { codegen } from "./codegen.ts"

let buf = ""

buf += "home\n"
for (const [k, v] of codegen("index.html")) {
    buf += k
    buf += "\n"
    buf += v
    buf += "\n"
}

buf += "tools\n"
for (const [k, v] of codegen("ldtools/index.html")) {
    buf += k
    buf += "\n"
    buf += v
    buf += "\n"
}

buf += "tools_plain\n"
for (const [k, v] of codegen("ldtools/plain.html")) {
    buf += k
    buf += "\n"
    buf += v
    buf += "\n"
}

Deno.writeTextFileSync("C:/swap/codegen-now-test", buf)
