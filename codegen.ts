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
    title: string
    text?: string
    text_small?: boolean
    tiles?: Tile[]
}

type ToolGroup = {
    name?: string
    title?: string
    list: Tool[]
}

type Tool = {
    name: string
    title: string
    icon?: string
    outer_icon?: string
    description?: string
    website?: 1 | 2 | 3 | 4 | 5
    mirror?: "active" | "locked"
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

const tile_columns = (input: TileColumns) => input.map(input => `
    <div class="tile-column">
        ${input.map(tile).join("")}
    </div>
`).join("")

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
            ${first.content.map(tile).join("")}
            <div class="title">${second.title}</div>
            ${second.content.map(tile).join("")}
            <div class="title">${third.title}</div>
        </div>
        ${third.content.map(tile).join("")}
    `
}

const major = (inner: string, pagetype: PageType) => `
    <div id="content">
        <div id="offset">
            <div id="major" class="${pagetype}">
                ${inner}
                <div class="clearfix"></div>
            </div>
        </div>
    </div>
`

const side = (input: Side) => `
    <template id="side-${input.name}">
        <div class="title">${input.title}</div>
        <svg class="icon-back"><use href="#icon-arrow-left"></use></svg>
        <hr>
        <div class="content">
            ${input.tiles === void 0 ? "" : input.tiles?.map(tile).join("") + `<div class="clearfix"></div>`}
            ${input.text === void 0 ? "" : `<div class="${input.text_small ? "text small" : "text"}">${input.text}</div>`}
        </div>
    </template>
`

const tool_side = (input: ToolGroup) => `
    <template id="side-${(input.name === void 0 && input.list.length === 1) ? input.list[0].name : input.name}">
        <div class="title">${input.title === void 0 ? "详情" : input.title}</div>
        <svg class="icon-back"><use href="#icon-arrow-left"></use></svg>
        <hr>
        <div class="content">
            ${input.list?.map(tool).join("")}
        </div>
    </template>
`

const tool_link = (input: ToolLink) => `
    <a class="link" ${input.link === void 0 ? "" : `href="${input.link}"`} ${input.action === void 0 ? "" : `onclick="${input.action}"`}>
        <svg class="icon">
            <use href="#icon-${input.icon}"></use>
        </svg>
        ${input.title}
    </a>
`

const tool = (input: Tool) => `
    <div class="item" onclick="detail(this)">
        <img src="/assert/image/${input.icon === void 0 && input.outer_icon === void 0 ? `icon-tool/${input.name}` : (input.outer_icon === void 0 ? `icon-tool/${input.icon}` : `icon/${input.outer_icon}`)}.webp">
        <div class="item-title">${input.title}</div>
        <svg class="icon-line">
            <use xlink:href="#icon-expand-right"></use>
        </svg>
        <div class="detail-container">
            <div class="detail">
                ${input.description === void 0 ? "" : `<p>${input.description}</p>`}
                <p>
                    ${input.website === void 0 ? "" : tool_link({
                        title: { 1: "官方网站", 2: "首发链接", 3: "网页链接", 4: "<b>非官方</b>页面", 5: "官方网站（国内无法访问）" }[input.website],
                        link: `/r2/${input.name}`,
                        icon: "link",
                    })}
                    ${input.mirror === void 0 ? "" : tool_link({
                        title: "镜像下载",
                        link: `//{{TOOL_DELIVERY_LDT}}/${input.mirror}/${input.name}.zip`,
                        icon: "download",
                    })}
                    ${input.custom === void 0 ? "" : input.custom.map(tool_link).join("")}
                </p>
                ${input.notice === void 0 ? "" : `<p><b>注意事项</b><br>${input.notice}</p>`}
            </div>
        </div>
    </div>
`

type InputTypes = "major" | "sides" | "tools"

export const codegen = (filename: string) => {
    const load = (type: InputTypes) => parseYaml(Deno.readTextFileSync(filename.replaceAll(".html", `.${type}.yml`)))

    if (!filename.includes("ldtools")) {
        return {
            major: major(tile_columns(load("major") as TileColumns), "home"),
            sides: (load("sides") as Side[]).map(side).join(""),
        }
    } else {
        return {
            major: major(tile_grids(load("major") as TileGrids), "tool"),
            sides: [...(load("sides") as Side[]).map(side), ...(load("tools") as ToolGroup[]).map(tool_side)].join(""),
        }
    }
}
