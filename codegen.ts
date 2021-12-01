// deno-lint-ignore-file camelcase
import { parse as parseYaml } from "https://deno.land/std@0.102.0/encoding/yaml.ts"

const dev = !Deno.args[0]

type Tile = {
    tile: string
    font?: string
    action: string
    name: string
    icon?: string
    title?: string
}

type Side = {
    name: string
    title: string
    text?: string
    tiles?: Tile[]
}

const tile = (input: Tile): string => {
    const notext = input.font === void 0 || input.title === void 0

    const inner = `
        <img src="/assert/image/icon/${input.icon === void 0 ? input.name : input.icon}.webp">
        ${notext ? "" :`<${input.font}>${input.title}</${input.font}>`}
    `

    const href = (path: string) => `
        <a class="tile-link" href="${dev ? "https://ldtstore.com.cn" : ""}${path}${input.name}" target="_blank">
            <div class="tile ${input.tile}">
                ${inner}
            </div>
        </a>
    `

    const side = () => `
        <div class="tile ${input.tile}" onclick="side('${input.name}')">
            ${inner}
        </div>
    `

    switch (input.action) {
        case "side": return side()
        case "href": return href("/")
        case "r": return href("/r/")
        case "r2": return href("/r2/")
        default: throw new Error("unknown action type")
    }
}

const tile_column =  (input: Tile[]) => `
    <div class="tile-column">
        ${input.map(tile).join("")}
    </div>
`

const major = (input: Tile[][]) => `
    <div id="content">
        <div id="offset">
            <div id="major" class="home">
                ${input.map(tile_column).join("")}
                <div class="clearfix"></div>
            </div>
        </div>
    </div>
`

const side = (input: Side) => `
    <template id="side-${input.name}">
        <div class="title">${input.title}</div>
        <hr>
        ${input.tiles === void 0 ? "" : input.tiles?.map(tile).join("") + `<div class="clearfix"></div>`}
        ${input.text === void 0 ? "" : `<div class="text">${input.text}</div>`}
    </template>
`

const sides = (input: Side[]) => input.map(side).join("")

Deno.writeTextFileSync(
    "index.major.html",
    major(parseYaml(Deno.readTextFileSync("index.major.yml")) as Tile[][])
)

Deno.writeTextFileSync(
    "index.sides.html",
    sides(parseYaml(Deno.readTextFileSync("index.sides.yml")) as Side[])
)
