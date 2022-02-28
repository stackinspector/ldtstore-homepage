// deno-lint-ignore-file camelcase
import { parse as parseYaml } from "https://deno.land/std@0.102.0/encoding/yaml.ts"
import type { ToolIndexType, ToolCrossType, ToolAllType, GlobalData } from "./shared.ts";

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
    icon_type?: string
    name: string
    title?: string
    icon?: string
}

type TileTemplate = {
    template: {
        tile: string
        font?: string
        action: string
        icon_type?: string
    }
    tiles: Record<string, string> | string[]
}

type Side = {
    name: string
    title: string
    text?: string
    text_small?: boolean
    tiles?: Tile[]
    templated?: TileTemplate
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
    link: string
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
        <img src="{{IMAGE}}/icon${
            input.icon_type === void 0 ? "" : `-${input.icon_type}`
        }/${
            input.icon === void 0 ? input.name : input.icon
        }.webp" ${
            input.title === void 0 ? "" : `alt="${input.title}"`
        }>
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
        <div class="tile-grid-vertical">
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

const gen_major = (inner: string, page_type: PageType) => `
    <div id="content">
        <div id="offset">
            <div id="major" class="${page_type}">
                ${inner}
                <div class="clearfix"></div>
            </div>
        </div>
    </div>
`

const tile_template = (input: TileTemplate): Tile[] => Array.isArray(input.tiles)
    ? input.tiles.map(name => ({
        ...input.template,
        name,
    }))
    : Object.entries(input.tiles).map(([name, title]) => ({
        ...input.template,
        name,
        title: title === "" ? void 0 : title,
    }))

const gen_side = (input: Side) => `
    <template id="side-${input.name}">
        <div class="title">${input.title}</div>
        <svg class="icon-back"><use href="#icon-arrow-left"></use></svg>
        <hr>
        <div class="content">
            ${
                input.tiles === void 0 && input.templated === void 0
                    ? ""
                    : (input.templated === void 0
                        ? input.tiles!
                        : tile_template(input.templated!)).map(gen_tile).join("") + `<div class="clearfix"></div>`
            }
            ${input.text === void 0 ? "" : `<div class="${input.text_small ? "text small" : "text"}">${input.text}</div>`}
        </div>
    </template>
`

const gen_tool_group = (groups: ToolGroup[]) => {
    const fragments = []
    const index: ToolIndexType = Object.create(null)
    const all: ToolAllType = Object.create(null)
    const cross: ToolCrossType = Object.create(null)
    const cross_notice_title: Record<string, string> = Object.create(null)
    for (const group of groups) {
        if (group.name !== void 0 && group.cross_notice !== void 0) {
            cross_notice_title[group.name] = group.cross_notice
            cross[group.name] = Object.create(null)
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
    return { fragments, tool: { index, all, cross } }
}

const gen_tool_link = (input: ToolLink) => `
    <span><a class="link" href="${input.link}">
        <svg class="icon">
            <use href="#icon-${input.icon}"></use>
        </svg>
        ${(typeof input.title === "string") ? input.title : tool_website_type[input.title]}
    </a></span>
`

const gen_tool = (input: Tool) => {
    const links: ToolLink[] = [] 
    if (input.website !== void 0) {
        links.push({
            title: input.website,
            link: `//r.ldtstore.com.cn/r2/${input.name}`,
            icon: "link",
        })
    }
    if (input.websites !== void 0) {
        links.push(...Object.entries(input.websites).map(([link, title]): ToolLink => ({
            title,
            link: `//r.ldtstore.com.cn/r2/${input.name}-${link}`,
            icon: "link",
        })))
    }
    if (input.downloads !== void 0) {
        links.push(...Object.entries(input.downloads).map(([link, title]): ToolLink => ({
            title,
            link: `//r.ldtstore.com.cn/r2/${input.name}-d-${link}`,
            icon: "download",
        })))
    }
    if (input.mirror !== void 0) {
        links.push({
            title: "镜像下载",
            link: `{{MIRROR}}/${input.mirror}/${input.name}.zip`,
            icon: "download",
        })
    }
    if (input.mirrors !== void 0) {
        links.push(...Object.entries(input.mirrors).map(([link, title]): ToolLink => ({
            title,
            link: `{{MIRROR}}/locked/${input.name}-${link}.zip`,
            icon: "download",
        })))
    }
    if (input.custom !== void 0) {
        links.push(...input.custom)
    }

    return `
    <template id="tool-${input.name}">
    <div class="item" onclick="detail(this)">
        <img src="{{IMAGE}}/icon-tool/${input.icon === void 0 ? input.name : input.icon}.webp" alt="${input.title}">
        <div class="item-title">${input.title}</div>
        <svg class="icon-line">
            <use href="#icon-expand-right"></use>
        </svg>
        <div class="detail-container">
            <div class="detail">
                <p>${input.description}</p>
                <p>${links.map(gen_tool_link).join("")}</p>
                ${input.notice === void 0 ? "" : `<p><b>注意事项</b><br>${input.notice}</p>`}
            </div>
        </div>
    </div>
    </template>
    `
}

export const codegen = (filename: string): Map<string, string> => {
    const load_base = (file: string) => parseYaml(Deno.readTextFileSync(file))
    const load = (type: InputType) => load_base(filename.replaceAll(".html", `.${type}.yml`))
    const dynamic_inserts = new Map()
    const sides = [...(load("sides") as Side[]), ...(load_base("public.sides.yml") as Side[])]

    const page_type: PageType = filename.includes("ldtools") ? "tool" : "home";
    if (page_type === "home") {
        const data: GlobalData = { page_type }
        dynamic_inserts.set(
            "<!--{{major}}-->",
            gen_major(gen_tile_columns(load("major") as TileColumns), page_type),
        )
        dynamic_inserts.set(
            "<!--{{sides}}-->",
            sides.map(gen_side).join(""),
        )
        dynamic_inserts.set(
            "<!--{{include-data}}-->",
            `<script>window.__DATA__=${JSON.stringify(data)}</script>`
        )
    } else if (page_type === "tool") {
        const { fragments, tool } = gen_tool_group(load("tools") as ToolGroup[])
        const data: GlobalData = { page_type, tool }
        dynamic_inserts.set(
            "<!--{{major}}-->",
            gen_major(gen_tile_grids(load("major") as TileGrids), page_type),
        )
        dynamic_inserts.set(
            "<!--{{sides}}-->",
            [...sides.map(gen_side), ...fragments].join(""),
        )
        dynamic_inserts.set(
            "<!--{{include-data}}-->",
            `<script>window.__DATA__=${JSON.stringify(data)}</script>`
        )
    }

    return dynamic_inserts
}
