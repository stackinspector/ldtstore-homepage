// deno-lint-ignore-file camelcase
import { parse as parseYaml } from "https://deno.land/std@0.102.0/encoding/yaml.ts"
import type { ToolIndexType, ToolCrossType, ToolAllType } from "./shared.ts";

type PageType = "home" | "tool"

type InputType = "major" | "sides" | "tools"

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
    cross_notice?: string
    list: Tool[]
}

type ToolLinkTitle = keyof typeof tool_website_type | string

type Tool = {
    name: string
    title: string
    cross?: string[]
    keywords?: string
    icon?: string
    outer_icon?: string
    description: string
    website?: ToolLinkTitle
    websites?: Record<string, ToolLinkTitle>
    downloads?: Record<string, string>
    mirror?: "active" | "locked" | "synced"
    mirrors?: Record<string, string>
    custom?: ToolLink[]
    notice?: string
    cross_notice?: Record<string, string>
}

type ToolLink = {
    title: ToolLinkTitle
    link?: string
    action?: string
    icon: "link" | "download"
}

const tool_website_type = {
    1: "官方网站",
    2: "首发链接",
    3: "网页链接",
    4: "<b>非官方</b>页面",
    5: "官方网站（国内无法访问）",
}

const gen_tile = (input: Tile): string => {
    const isnotext = input.font === void 0 || input.title === void 0

    const inner = `
        <img src="{{IMAGE}}/icon/${input.icon === void 0 ? input.name : input.icon}.webp">
        ${isnotext ? "" : `<${input.font}>${input.title}</${input.font}>`}
    `

    const href = (path: string) => `
        <a class="tile-link" href="${path}${input.name}/">
            <div class="tile ${input.tile}">
                ${inner}
            </div>
        </a>
    `

    const call = (func: string) => `
        <div class="tile ${input.tile}" onclick="${func}('${input.name}')">
            ${inner}
        </div>
    `

    switch (input.action) {
        case "side": return call("side")
        case "tool": return call("tool")
        case "href": return href("/")
        case "r": return href("//r.ldtstore.com.cn/r/")
        case "r2": return href("//r.ldtstore.com.cn/r2/")
        default: throw new Error("unknown action type")
    }
}

const gen_tile_columns = (input: TileColumns) => input.map((input) => `
    <div class="tile-column">
        ${input.map(gen_tile).join("")}
    </div>
`).join("")

const gen_tile_grids = (input: TileGrids) => {
    if (input.middle.length !== 3) throw new Error("unsupported grid middle count")
    const [first, second, third] = input.middle;
    if (third.content.length !== 9) throw new Error("unsupported grid middle count")
    return `
        <div class="tile-grid-left">
            ${input.left.map(gen_tile).join("")}
        </div>
        <div class="tile-grid-middle">
            <div class="title top">${first.title}</div>
            ${first.content.map(gen_tile).join("")}
            <div class="title">${second.title}</div>
            ${second.content.map(gen_tile).join("")}
            <div class="title">${third.title}</div>
        </div>
        ${third.content.map(gen_tile).join("")}
    `
}

const gen_major = (inner: string, pagetype: PageType) => `
    <div id="content">
        <div id="offset">
            <div id="major" class="${pagetype}">
                ${inner}
                <div class="clearfix"></div>
            </div>
        </div>
    </div>
`

const gen_side = (input: Side) => `
    <template id="side-${input.name}">
        <div class="title">${input.title}</div>
        <svg class="icon-back"><use href="#icon-arrow-left"></use></svg>
        <hr>
        <div class="content">
            ${input.tiles === void 0 ? "" : input.tiles?.map(gen_tile).join("") + `<div class="clearfix"></div>`}
            ${input.text === void 0 ? "" : `<div class="${input.text_small ? "text small" : "text"}">${input.text}</div>`}
        </div>
    </template>
`

const gen_tool_group = (groups: ToolGroup[]) => {
    const fragments = []
    const index: ToolIndexType = {}
    const all: ToolAllType = {}
    const cross: ToolCrossType = {}
    const cross_notice_title: Record<string, string> = {}
    for (const group of groups) {
        if (group.name !== void 0 && group.cross_notice !== void 0) {
            cross_notice_title[group.name] = group.cross_notice
            cross[group.name] = {}
        }
    }
    for (const group of groups) {
        const group_name = (group.name === void 0 && group.list.length === 1) ? group.list[0].name : group.name!
        const list = []
        for (const tool of group.list) {
            list.push(tool.name)
            all[tool.keywords === void 0 ? tool.title : tool.title + tool.keywords!] = tool.name
            fragments.push(gen_tool(tool))
            if (tool.cross_notice !== void 0) {
                for (const [group, content] of Object.entries(tool.cross_notice)) {
                    cross[group]![tool.name] = `<b>${cross_notice_title[group]}</b><br>${content}`
                }
            }
        }
        if (group.name !== "non-catalog") {
            index[group_name] = {
                title: ((group.title === void 0 && group.list.length === 1) ? group.list[0].title : group.title!),
                list,
            }
        }
    }
    for (const group of groups) {
        for (const tool of group.list) {
            if (tool.cross !== void 0) {
                for (const cross_group_name of tool.cross) {
                    index[cross_group_name].list.push(tool.name)
                }
            }
        }
    }
    return { fragments, index, all, cross }
}

const gen_tool_link = (input: ToolLink) => `
    <span><a class="link" ${input.link === void 0 ? "" : `href="${input.link}"`} ${input.action === void 0 ? "" : `onclick="${input.action}"`}>
        <svg class="icon">
            <use href="#icon-${input.icon}"></use>
        </svg>
        ${(typeof input.title === "string") ? input.title : tool_website_type[input.title]}
    </a></span>
`

const gen_tool = (input: Tool) => `
    <template id="tool-${input.name}">
    <div class="item" onclick="detail(this)">
        <img src="{{IMAGE}}/${input.icon === void 0 && input.outer_icon === void 0 ? `icon-tool/${input.name}` : (input.outer_icon === void 0 ? `icon-tool/${input.icon}` : `icon/${input.outer_icon}`)}.webp">
        <div class="item-title">${input.title}</div>
        <svg class="icon-line">
            <use href="#icon-expand-right"></use>
        </svg>
        <div class="detail-container">
            <div class="detail">
                <p>${input.description}</p>
                <p>
                    ${input.website === void 0 ? "" : gen_tool_link({
                        title: input.website,
                        link: `//r.ldtstore.com.cn/r2/${input.name}`,
                        icon: "link",
                    })}
                    ${input.websites === void 0 ? "" : Object.entries(input.websites).map(o => gen_tool_link({
                        title: o[1],
                        link: `//r.ldtstore.com.cn/r2/${input.name}-${o[0]}`,
                        icon: "link",
                    })).join("")}
                    ${input.downloads === void 0 ? "" : Object.entries(input.downloads).map(o => gen_tool_link({
                        title: o[1],
                        link: `//r.ldtstore.com.cn/r2/${input.name}-d-${o[0]}`,
                        icon: "download",
                    })).join("")}
                    ${input.mirror === void 0 ? "" : gen_tool_link({
                        title: "镜像下载",
                        link: `{{MIRROR}}/${input.mirror}/${input.name}.zip`,
                        icon: "download",
                    })}
                    ${input.mirrors === void 0 ? "" : Object.entries(input.mirrors).map(o => gen_tool_link({
                        title: o[1],
                        link: `{{MIRROR}}/locked/${input.name}-${o[0]}.zip`,
                        icon: "download",
                    })).join("")}
                    ${input.custom === void 0 ? "" : input.custom.map(gen_tool_link).join("")}
                </p>
                ${input.notice === void 0 ? "" : `<p><b>注意事项</b><br>${input.notice}</p>`}
            </div>
        </div>
    </div>
    </template>
`

export const codegen = (filename: string): Map<string, string> => {
    const load = (type: InputType) => parseYaml(Deno.readTextFileSync(filename.replaceAll(".html", `.${type}.yml`)))
    const dynamic_inserts = new Map()

    if (!filename.includes("ldtools")) {
        dynamic_inserts.set(
            "<!--{{major}}-->",
            gen_major(gen_tile_columns(load("major") as TileColumns), "home"),
        )
        dynamic_inserts.set(
            "<!--{{sides}}-->",
            (load("sides") as Side[]).map(gen_side).join(""),
        )
    } else {
        const { fragments, index, all, cross } = gen_tool_group(load("tools") as ToolGroup[])
        dynamic_inserts.set(
            "<!--{{major}}-->",
            gen_major(gen_tile_grids(load("major") as TileGrids), "tool"),
        )
        dynamic_inserts.set(
            "<!--{{sides}}-->",
            [...(load("sides") as Side[]).map(gen_side), ...fragments].join(""),
        )
        dynamic_inserts.set(
            "<!--{{tools_index}}-->",
            `<script type="application/json" id="tools_index">${JSON.stringify(index)}</script>
            <script type="application/json" id="tools_all">${JSON.stringify(all)}</script>
            <script type="application/json" id="tools_cross">${JSON.stringify(cross)}</script>`
        )
    }

    return dynamic_inserts
}
