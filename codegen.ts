// deno-lint-ignore-file camelcase
import { parse as parseYaml } from "https://deno.land/std@0.102.0/encoding/yaml.ts";
import type { NonVoidNode, Node } from "./jsonhtml.ts";
import { render_nodes, render_nonvoid_node } from "./jsonhtml.ts";
import type { GlobalData, ToolAllType, ToolCrossType, ToolIndexType } from "./shared.ts";

type PageType = "home" | "tool";

type InputType = "major" | "sides" | "tools";

type TileColumns = Tile[][];

type TileGrids = {
  left: Tile[];
  middle: {
    title: string;
    content: Tile[];
  }[];
};

type Tile = {
  tile: string;
  font?: string;
  action: string;
  icon_type?: string;
  name: string;
  title?: string;
  icon?: string;
};

type TileTemplate = {
  template: {
    tile: string;
    font?: string;
    action: string;
    icon_type?: string;
  };
  tiles: Record<string, string> | string[];
};

type Side = {
  name: string;
  title: string;
  text?: string;
  text_small?: boolean;
  tiles?: Tile[];
  templated?: TileTemplate;
};

type ToolGroup = {
  name?: string;
  title?: string;
  cross_notice?: string;
  list: Tool[];
};

type ToolLinkTitle = keyof typeof tool_website_type | string;

type Tool = {
  name: string;
  title: string;
  cross?: string[];
  keywords?: string;
  icon?: string;
  description: string;
  website?: ToolLinkTitle;
  websites?: Record<string, ToolLinkTitle>;
  downloads?: Record<string, string>;
  mirror?: "active" | "locked" | "synced";
  mirrors?: Record<string, string>;
  columns?: boolean;
  notice?: string;
  cross_notice?: Record<string, string>;
};

type ToolLink = {
  title: ToolLinkTitle;
  link_type: "r2" | "mirror";
  link: string;
  icon: "link" | "download";
};

type ProcessedToolGroups = {
  tools: Record<string, Tool>;
  tool_data: {
    index: ToolIndexType;
    all: ToolAllType;
    cross: ToolCrossType;
  };
};

const tool_website_type = {
  1: "官方网站",
  2: "首发链接",
  3: "网页链接",
  4: "<b>非官方</b>页面",
  5: "官方网站（国内无法访问）",
};

const tool_link_prefix = {
  "r2": "//r.ldtstore.com.cn/r2/",
  "mirror": "{{MIRROR}}",
};

const tool_icon_emoji = {
  "link": "🔗",
  "download": "💾",
};

const clearfix: Node = ["div", { class: "clearfix" }, []];

const svg_icon = (icon: string, class_name = "icon"): Node =>
  ["svg", { class: class_name }, [
    ["use", { href: `#icon-${icon}` }, []],
  ]];

const gen_tile = (input: Tile): Node => {
  const inner: Node =
    ["img", {
      src: `{{IMAGE}}/icon${
        input.icon_type === void 0 ? "" : `-${input.icon_type}`}/${input.icon === void 0 ? input.name : input.icon
      }.webp`,
      alt: input.title,
    }, input.font === void 0 || input.title === void 0 ? [] : [
      [input.font, {}, [input.title]],
    ]];

  const href = (path: string): Node =>
    ["a", {
      target: "_blank",
      class: "tile-link",
      href: `${path}${input.name}/`,
    }, [
      ["div", { class: `tile ${input.tile}` }, [inner]],
    ]];

  const call = (func: string): Node =>
    ["div", {
      class: `tile ${input.tile}`,
      onclick: `${func}('${input.name}')`,
    }, [inner]];

  switch (input.action) {
    case "side": return call("side");
    case "tool": return call("tool");
    case "copy": return call("copy");
    case "href": return href("/");
    case "r":    return href("//r.ldtstore.com.cn/r/");
    case "r2":   return href("//r.ldtstore.com.cn/r2/");
    default:     throw new Error("unknown action type");
  }
};

const gen_tile_columns = (input: TileColumns): Node[] =>
  input.map((input) => ["div", { class: "tile-column" }, input.map(gen_tile)]);

const gen_tile_grids = (input: TileGrids): Node[] => {
  if (input.middle.length !== 3) throw new Error("unsupported grid middle count");
  const [first, second, third] = input.middle;
  if (third.content.length !== 9) throw new Error("unsupported grid middle count");
  return [
    ["div", { class: "tile-grid-vertical" }, input.left.map(gen_tile)],
    ["div", { class: "tile-grid-middle" }, [
      ["div", { class: "title top" }, [first.title]],
      ...first.content.map(gen_tile),
      ["div", { class: "title" }, [second.title]],
      ...second.content.map(gen_tile),
      ["div", { class: "title" }, [third.title]],
    ]],
    ...third.content.map(gen_tile),
  ];
};

const gen_major = (inner: Node[], page_type: PageType): NonVoidNode =>
  ["div", { id: "content" }, [
    ["div", { id: "offset" }, [
      ["div", { id: "major", class: page_type }, [...inner, clearfix]],
    ]],
  ]];

const tile_template = (input: TileTemplate): Tile[] =>
  Array.isArray(input.tiles)
    ? input.tiles.map((name) => ({
      ...input.template,
      name,
    }))
    : Object.entries(input.tiles).map(([name, title]) => ({
      ...input.template,
      name,
      title: title === "" ? void 0 : title,
    }));

const gen_side = (input: Side): Node =>
  ["template", { id: `side-${input.name}` }, [
    ["div", { class: "title" }, [input.title]],
    svg_icon("#icon-arrow-left", "icon-back"),
    ["hr", {}, []],
    ["div", { class: "content" }, [
      ...(
        input.tiles === void 0 && input.templated === void 0 ? [] : [
          ...(input.templated === void 0 ? input.tiles! : tile_template(input.templated!)).map(gen_tile),
          clearfix,
        ]
      ),
      input.text === void 0 ? void 0 : ["div", { class: input.text_small ? "text small" : "text" }, [input.text]],
    ]],
  ]];

const proc_tool_groups = (groups: ToolGroup[]): ProcessedToolGroups => {
  const tools: Record<string, Tool> = Object.create(null);
  const index: ToolIndexType = Object.create(null);
  const all: ToolAllType = Object.create(null);
  const cross: ToolCrossType = Object.create(null);
  const cross_notice_title: Record<string, string> = Object.create(null);
  for (const group of groups) {
    if (group.name !== void 0 && group.cross_notice !== void 0) {
      cross_notice_title[group.name] = group.cross_notice;
      cross[group.name] = Object.create(null);
    }
  }
  for (const group of groups) {
    const group_name = (group.name === void 0 && group.list.length === 1) ? group.list[0].name : group.name!;
    const list = [];
    for (const tool of group.list) {
      list.push(tool.name);
      all[tool.keywords === void 0 ? tool.title : tool.title + tool.keywords!] = tool.name;
      tools[tool.name] = tool;
      if (tool.cross_notice !== void 0) {
        for (const [group, content] of Object.entries(tool.cross_notice)) {
          cross[group]![tool.name] = `<b>${cross_notice_title[group]}</b><br>${content}`;
        }
      }
    }
    if (group.name !== "non-catalog") {
      index[group_name] = {
        title: ((group.title === void 0 && group.list.length === 1) ? group.list[0].title : group.title!),
        list,
        cross_list: [],
      };
    }
  }
  for (const group of groups) {
    for (const tool of group.list) {
      if (tool.cross !== void 0) {
        for (const cross_group_name of tool.cross) {
          index[cross_group_name].cross_list.push(tool.name);
        }
      }
    }
  }
  return { tools, tool_data: { index, all, cross } };
};

const proc_tool_title = (input: ToolLink) => (typeof input.title === "string") ? input.title : tool_website_type[input.title];

const gen_tool_link = (input: ToolLink): Node =>
  ["span", {}, [
    ["a", {
      target: "_blank",
      class: "link",
      href: `${tool_link_prefix[input.link_type]}${input.link}`,
    }, [
      svg_icon(input.icon),
      " ",
      proc_tool_title(input),
    ]],
  ]];

const gen_tool_link_plain = (input: ToolLink): Node =>
  ["span", {}, [
    ["a", {
      href: `${tool_link_prefix[input.link_type]}${input.link}`,
    }, [
      `${tool_icon_emoji[input.icon]}${proc_tool_title(input)}`,
    ]],
    "&nbsp;",
    ["i", {}, [`[${input.link_type}] ${input.link}`]],
    ["br", {}, []],
  ]];

const gen_tool_links = (input: Tool, plain: boolean): Node[] => {
  const links: ToolLink[] = [];
  const downloads: ToolLink[] = [];
  if (input.website !== void 0) {
    links.push({
      title: input.website,
      link_type: "r2",
      link: input.name,
      icon: "link",
    });
  }
  if (input.websites !== void 0) {
    links.push(...Object.entries(input.websites).map(([link, title]): ToolLink => ({
      title,
      link_type: "r2",
      link: `${input.name}-${link}`,
      icon: "link",
    })));
  }
  if (input.downloads !== void 0) {
    downloads.push(...Object.entries(input.downloads).map(([link, title]): ToolLink => ({
      title,
      link_type: "r2",
      link: `${input.name}-d-${link}`,
      icon: "download",
    })));
  }
  if (input.mirror !== void 0) {
    downloads.push({
      title: "镜像下载",
      link_type: "mirror",
      link: `/${input.mirror}/${input.name}.zip`,
      icon: "download",
    });
  }
  if (input.mirrors !== void 0) {
    downloads.push(...Object.entries(input.mirrors).map(([link, title]): ToolLink => ({
      title,
      link_type: "mirror",
      link: `/locked/${input.name}-${link}.zip`,
      icon: "download",
    })));
  }
  const proc = (o: ToolLink[]): Node => o.length === 0
    ? void 0
    : ["div", {
        class: !plain && input.columns ? "tool-links-columns" : void 0
      }, o.map(plain ? gen_tool_link_plain : gen_tool_link)]
  return [
    proc(links),
    proc(downloads),
  ];
};

const tool_notice = (notice: string): Node =>
  ["p", {}, [
    ["b", {}, ["注意事项"]],
    ["br", {}, []],
    notice,
  ]];

const gen_tool = (input: Tool): Node =>
  ["template", { id: `tool-${input.name}` }, [
    ["div", { class: "item", onclick: "detail(this)" }, [
      ["img", {
        src: `{{IMAGE}}/icon-tool/${input.icon === void 0 ? input.name : input.icon}.webp`,
        alt: input.title,
      }, []],
      ["div", { class: "item-title" }, [input.title]],
      svg_icon("expand-right", "icon-line"),
      ["div", { class: "detail-container" }, [
        ["div", { class: "detail" }, [
          ["p", {}, [input.description]],
          ...gen_tool_links(input, false),
          input.notice === void 0 ? void 0 : tool_notice(input.notice),
        ]],
      ]],
    ]],
  ]];

const gen_tool_plain = (input: Tool, cross: boolean, title = true): Node[] => [
  title
    ? ["h3", { id: input.name }, [
      `${input.title} `,
      ["i", {}, [`${input.name}${cross ? " [cross]" : ""}`]],
    ]]
    : void 0,
  ["p", {}, [input.description]],
  ...gen_tool_links(input, true),
  input.notice === void 0 ? void 0 : tool_notice(input.notice),
];

const gen_tools_plain = ({ tools, tool_data: { index, cross } }: ProcessedToolGroups): Node[] =>
  Object.entries(index).map(([name, { title, list, cross_list }]) => [
    ["h2", { id: name }, [
      `${title} `,
      ["i", {}, [name]],
      " ",
      ["a", { class: "toc", href: "#toc" }, ["[目录]"]],
    ]] as Node,
    ...(list.length !== 1
      ? list.map((tool) => gen_tool_plain(tools[tool], false)).flat()
      : gen_tool_plain(tools[list[0]], false, false)),
    ...cross_list.map((tool) => {
      const text = gen_tool_plain(tools[tool], true);
      const cross_notice = cross[name]?.[tool];
      if (cross_notice !== void 0) {
        text.push(cross_notice);
      }
      return text;
    }).flat(),
  ]).flat();

const gen_tools_plain_toc = (groups: ToolGroup[]): Node[] => [
  ["h2", { id: "toc" }, ["目录"]],
  ...groups.map((group): Node => {
    const name = group.name !== void 0 ? group.name : group.list[0].name;
    const title = group.title !== void 0 ? group.title : group.list[0].title;
    return ["p", {}, [
      ["a", { href: `#${name}` }, [title]],
      "&nbsp;",
      ["i", {}, [name]],
    ]];
  }),
];

export const codegen = (filename: string) => {
  const load_base = (file: string) => parseYaml(Deno.readTextFileSync(file));
  const load = (type: InputType) => load_base(filename.replaceAll(".html", `.${type}.yml`));
  const dynamic_inserts: Map<string, string> = new Map();
  const public_sides = load_base("public.sides.yml") as Side[];

  if (filename === "index.html") {
    const page_type = "home";
    const sides = [...(load("sides") as Side[]), ...public_sides];
    const data: GlobalData = { page_type };
    dynamic_inserts.set(
      "<!--{{major}}-->",
      render_nonvoid_node(
        gen_major(gen_tile_columns(load("major") as TileColumns), page_type)
      ),
    );
    dynamic_inserts.set(
      "<!--{{sides}}-->",
      render_nodes(
        sides.map(gen_side)
      ),
    );
    dynamic_inserts.set(
      "<!--{{include-data}}-->",
      `<script>window.__DATA__=${JSON.stringify(data)}</script>`,
    );
  } else if (filename === "ldtools/index.html") {
    const page_type = "tool";
    const sides = [...(load("sides") as Side[]), ...public_sides];
    const { tools, tool_data } = proc_tool_groups(load("tools") as ToolGroup[]);
    const data: GlobalData = { page_type, tool: tool_data };
    dynamic_inserts.set(
      "<!--{{major}}-->",
      render_nonvoid_node(
        gen_major(gen_tile_grids(load("major") as TileGrids), page_type)
      ),
    );
    dynamic_inserts.set(
      "<!--{{sides}}-->",
      render_nodes(
        [...sides.map(gen_side), ...Object.values(tools).map(gen_tool)]
      ),
    );
    dynamic_inserts.set(
      "<!--{{include-data}}-->",
      `<script>window.__DATA__=${JSON.stringify(data)}</script>`,
    );
  } else if (filename === "ldtools/plain.html") {
    const tool_groups = load_base("ldtools/index.tools.yml") as ToolGroup[];
    dynamic_inserts.set(
      "<!--{{toc}}-->",
      render_nodes(
        gen_tools_plain_toc(tool_groups)
      ),
    );
    dynamic_inserts.set(
      "<!--{{main}}-->",
      render_nodes(
        gen_tools_plain(proc_tool_groups(tool_groups))
      ),
    );
  }

  return dynamic_inserts
};
