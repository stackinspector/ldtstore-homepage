// deno-lint-ignore-file camelcase
import { parse as parseYaml } from "https://deno.land/std@0.102.0/encoding/yaml.ts"

const dev = !Deno.args[0]

type PageType = "home" | "tool"

type TileColumns = Tile[][]

type TileGrid = {
    left: Tile[]
    middle: TileGridMiddle[]
}

type TileGridMiddle = {
    title: string
    content: Tile[]
}

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

const tile_column = (input: Tile[]) => `
    <div class="tile-column">
        ${input.map(tile).join("")}
    </div>
`

const tile_columns = (input: TileColumns) => input.map(tile_column).join("")

const tile_grid_middle = (input: TileGridMiddle[]) => {
    if (input.length !== 3) throw new Error("unsupported grid middle count")
    const [first, second, third] = input;
    if (third.content.length !== 9) throw new Error("unsupported grid middle count")
    return `
        <div class="tile-grid-middle">
            <div class="title top">${first.title}</div>
            <hr>
            ${first.content.map(tile).join("")}
            <div class="title">${second.title}</div>
            <hr>
            ${second.content.map(tile).join("")}
            <div class="title">${third.title}</div>
        </div>
        ${third.content.map(tile).join("")}
    `
}

const tile_grid = (input: TileGrid) => `
    <div class="tile-grid-left">
        ${input.left.map(tile).join("")}
    </div>
    ${tile_grid_middle(input.middle)}
`

const major_base = (inner: string, pagetype: PageType) => `
    <div id="content">
        <div id="offset">
            <div id="major" class="${pagetype}">
                ${inner}
                <div class="clearfix"></div>
            </div>
        </div>
    </div>
`

const major_home = (input: TileColumns) => major_base(tile_columns(input), "home")

const major_tool = (input: TileGrid) => major_base(tile_grid(input), "tool")

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
    major_home(parseYaml(Deno.readTextFileSync("index.major.yml")) as TileColumns)
)

Deno.writeTextFileSync(
    "index.sides.html",
    sides(parseYaml(Deno.readTextFileSync("index.sides.yml")) as Side[])
)

Deno.writeTextFileSync(
    "ldtools/index.major.html",
    major_tool(parseYaml(Deno.readTextFileSync("ldtools/index.major.yml")) as TileGrid)
)
