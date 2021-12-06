// deno-lint-ignore-file camelcase
import { parse as parseYaml } from "https://deno.land/std@0.102.0/encoding/yaml.ts"

type PageType = "home" | "tool"

type TileColumns = Tile[][]

type TileGrids = {
    left: Tile[]
    middle: {
        title: string
        content: Tile[]
    }[]
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
    title?: string
    text?: string
    text_small?: boolean
    tiles?: Tile[]
    list?: Tool[]
}

type Tool = {
    name: string
    title: string
    icon?: string
    outer_icon?: string
    description?: string
    website?: number
    mirror?: boolean
    custom?: ToolLink[]
    notice?: string
}

type ToolLink = {
    title: string
    link?: string
    action?: string
    icon: "link" | "download"
}

const tile = (input: Tile): string => {
    const isnotext = input.font === void 0 || input.title === void 0

    const inner = `
        <img src="/assert/image/icon/${input.icon === void 0 ? input.name : input.icon}.webp">
        ${isnotext ? "" :`<${input.font}>${input.title}</${input.font}>`}
    `

    const href = (path: string) => `
        <a class="tile-link" href="${path}${input.name}/">
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

const tile_grids = (input: TileGrids) => {
    if (input.middle.length !== 3) throw new Error("unsupported grid middle count")
    const [first, second, third] = input.middle;
    if (third.content.length !== 9) throw new Error("unsupported grid middle count")
    return `
        <div class="tile-grid-left">
            ${input.left.map(tile).join("")}
        </div>
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

const major_tool = (input: TileGrids) => major_base(tile_grids(input), "tool")

const side = (input: Side) => {
    const istool = input.list !== void 0 && input.text === void 0 && input.tiles === void 0

    const tool_expand = input.list?.length !== 1

    const tool_side = () => input.list?.map(x => tool(x, tool_expand)).join("")

    const common_side = () => `
        ${input.tiles === void 0 ? "" : input.tiles?.map(tile).join("") + `<div class="clearfix"></div>`}
        ${input.text === void 0 ? "" : `<div class="${input.text_small ? "text small" : "text"}">${input.text}</div>`}
    `

    return `
        <template id="side-${input.name}">
            <div class="title">${(istool && !tool_expand && input.title === void 0) ? "详情" : input.title}</div>
            <svg class="icon-back"><use href="#icon-arrow-left"></use></svg>
            <hr>
            <div class="content">
                ${istool ? tool_side() : common_side()}
            </div>
        </template>
    `
}

const sides = (input: Side[]) => input.map(side).join("")

const tool_link = (input: ToolLink) => `
    <a class="link" ${input.link === void 0 ? "" : `href="${input.link}"`} ${input.action === void 0 ? "" : `onclick="${input.action}"`}>
        <svg class="icon">
            <use href="#icon-${input.icon}"></use>
        </svg>
        ${input.title}
    </a>
`

const tool = (input: Tool, expand: boolean) => `
    <div class="item"${expand ? ` onclick="detail(this)"` : ""}>
        <img src="/assert/image/${input.icon === void 0 && input.outer_icon === void 0 ? `icon-tool/${input.name}` : (input.outer_icon === void 0 ? `icon-tool/${input.icon}` : `icon/${input.outer_icon}`)}.webp">
        <div class="item-title">${input.title}</div>
        ${expand ? ` 
        <svg class="icon-line">
            <use xlink:href="#icon-expand-right"></use>
        </svg>
        ` : ""}
        ${expand ? `<div class="detail-container">` : ""}
            <div class="detail">
                ${input.description === void 0 ? "" : `<p>${input.description}</p>`}
                <p>
                    ${input.website === void 0 ? "" : tool_link({
                        title: { 1: "官方网站", 2: "首发链接", 3: "网页链接", 4: "<b>非官方</b>页面", 5: "官方网站（国内无法访问）" }[input.website]!,
                        link: `/r2/${input.name}`, icon: "link"
                    })}
                    ${input.mirror === void 0 ? "" : tool_link({ title: "镜像下载", link: "#", icon: "download" })}
                    ${input.custom === void 0 ? "" : input.custom.map(tool_link).join("")}
                </p>
                ${input.notice === void 0 ? "" : `<p><b>注意事项</b><br>${input.notice}</p>`}
            </div>
        ${expand ? `</div>` : ""}
    </div>
`

export const codegen = (filename: string) => {
    const major = parseYaml(Deno.readTextFileSync(filename.replaceAll(".html", ".major.yml")))
    return {
        major: filename.includes("ldtools") ? major_tool(major as TileGrids) : major_home(major as TileColumns),
        sides: sides(parseYaml(Deno.readTextFileSync(filename.replaceAll(".html", ".sides.yml"))) as Side[])
    }
}
