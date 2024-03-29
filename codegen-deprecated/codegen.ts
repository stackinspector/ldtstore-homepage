// deno-lint-ignore-file camelcase
import { parse as parseYaml } from "https://deno.land/std@0.102.0/encoding/yaml.ts";
import type { Option } from "https://deno.land/x/option_utils@0.1.0/mod.ts"
import { None, filter_none, from_bool_and_then, from_str, into_bool, into_list, into_str, is_some, map, map2, or, unwrap, unwrap_or, unwrap_or_else } from "https://deno.land/x/option_utils@0.1.0/mod.ts"
import type { Node } from "./jsonhtml.ts";
import { render_nodes, render_node, filter_none_attr } from "./jsonhtml.ts";
import type { GlobalData, ToolData, ToolAllType, ToolCategoryType, ToolCrossType, ToolIndexType } from "./shared.ts";

type PageType = "home" | "tool";

type InputType = "major" | "sides" | "tools" | "category";

type TileColumns = Tile[][];

type TileGrids = {
  left: Tile[];
  middle: {
    title: string;
    content: Tile[];
  }[];
};

// TODO CategoryTab[]
type Category = {
  tool: CategoryTab;
  link: CategoryTab;
};

type CategoryTab = {
  title: string;
  content: CategoryGroup[];
};

type CategoryGroup = {
  title: string;
  content: Tile[];
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
  category?: string[];
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
  tool_data: ToolData;
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

const gen_tile_inner = (input: Tile, category: boolean): Node => {
  const class_name = category ? "category-item" : `tile ${input.tile}`;

  const inner: Node =
    ["img", filter_none_attr({
      src: `{{IMAGE}}/icon${into_str(map(input.icon_type, s => `-${s}`))}/${unwrap_or(input.icon, input.name)}.webp`,
      alt: input.title,
    }), category
      ? into_list(map(input.title, title => ["span", {}, [title]]))
      : into_list(map2(input.font, input.title, (font, title) => [font, {}, [title]]))
    ];

  const href_base = (location: string): Node =>
    ["a", {
      target: "_blank",
      class: "tile-link",
      href: location,
    }, [
      ["div", { class: class_name }, [inner]],
    ]];

  const href = (path: string) => href_base(`${path}${input.name}/`);

  const home = () => href_base("/");

  const call = (func: string): Node =>
    ["div", {
      class: class_name,
      onclick: `${func}('${input.name}')`,
    }, [inner]];

  const none = (): Node =>
    ["div", { class: class_name }, [inner]];

  switch (input.action) {
    case "side":     return call("side");
    case "tool":     return call("tool");
    case "category": return call("category");
    case "copy":     return call("copy");
    case "href":     return href("/");
    case "r":        return href("//r.ldtstore.com.cn/r/");
    case "r2":       return href("//r.ldtstore.com.cn/r2/");
    case "home":     return home();
    case "none":     return none();
    default:         throw new Error("unknown action type");
  }
};

const gen_tile = (input: Tile) => gen_tile_inner(input, false);

const gen_tile_columns = (input: TileColumns): Node[] =>
  input.map((input) => ["div", { class: "tile-column" }, input.map(gen_tile)]);

const gen_tile_grids = (input: TileGrids): Node[] => {
  if (input.middle.length !== 3) throw new Error("unexpected grid middle count");
  const [first, second, third] = input.middle;
  if (third.content.length !== 9) throw new Error("unexpected grid middle count");
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

const gen_major_wrapper = (inner: Node[], page_type: PageType): Node =>
  ["div", { id: "content" }, [
    ["div", { id: "offset" }, [
      ["div", { id: "major", class: page_type === "home" ? "normal" : "wide" }, [...inner, clearfix]],
    ]],
  ]];

const gen_major_fragment = (inner: Node[], id: string): Node =>
  ["template", { id: `major-${id}` }, [...inner, clearfix]];

const tile_template = (input: TileTemplate): Tile[] =>
  Array.isArray(input.tiles)
    ? input.tiles.map((name) => ({
      ...input.template,
      name,
    }))
    : Object.entries(input.tiles).map(([name, title]) => ({
      ...input.template,
      name,
      title: from_str(title),
    }));

const gen_side = (input: Side): Node =>
  ["template", { id: `side-${input.name}` }, [
    ["div", { class: "title" }, [input.title]],
    svg_icon("#icon-arrow-left", "icon-back"),
    ["hr", {}, []],
    ["div", { class: "content" }, filter_none([
      ...unwrap_or(map(or(input.tiles, map(input.templated, tile_template)), tiles => [...tiles.map(gen_tile), clearfix]), []),
      map(input.text, text => ["div", { class: input.text_small ? "text small" : "text" }, [text]]),
    ])],
  ]];

const gen_category_item = (input: Tile) => gen_tile_inner(input, true);

const gen_category_group = (input: CategoryGroup): Node =>
  ["div", { class: "category-group" }, [
    ["div", { class: "category-group-title" }, [
      ["div", { class: "text" }, [input.title]],
    ]],
    ...input.content.map(gen_category_item),
  ]];

const gen_category_tab = (input: CategoryTab): Node[] => {
  if (input.content.length > 4) throw new Error("unexpected category group count");
  const [l1, l2, r1, r2] = input.content.map(gen_category_group);
  return [
    ["div", { class: "category-tab-part" }, filter_none([l1, l2])],
    ["div", { class: "category-tab-part" }, filter_none([r1, r2])],
  ]
};

const gen_category = (input: Category): Node[] => [
  ["div", { class: "category-title" }, [
    ["div", { id: "tool-button", class: "selected" }, [input.tool.title]],
    ["div", { id: "link-button" }, [input.link.title]],
  ]],
  ["div", { class: "category-content" }, [
    ["div", { id: "tool-list" }, gen_category_tab(input.tool)],
    ["div", { id: "link-list", style: "opacity: 0; pointer-events: none" }, gen_category_tab(input.link)],
  ]]
];

const proc_tool_groups = (groups: ToolGroup[], major_category: Category): ProcessedToolGroups => {
  const tools: Record<string, Tool> = Object.create(null);
  const index: ToolIndexType = Object.create(null);
  const all: ToolAllType = Object.create(null);
  const cross: ToolCrossType = Object.create(null);
  const cross_notice_title: Record<string, string> = Object.create(null);
  const category: ToolCategoryType = Object.create(null);

  // TODO fit CategoryTab[]
  for (const tab of Object.values(major_category)) {
    for (const group of tab.content) {
      for (const item of group.content) {
        if (item.action === "category") {
          category[item.name] = {
            title: unwrap(item.title),
            list: [],
          };
        }
      }
    }
  }

  for (const group of groups) {
    if (is_some(group.name) && is_some(group.cross_notice)) {
      cross_notice_title[group.name] = group.cross_notice;
      cross[group.name] = Object.create(null);
    }
  }

  for (const group of groups) {
    const group_name = unwrap(or(group.name, from_bool_and_then(group.list.length === 1, () => group.list[0].name)));
    const list = [];
    for (const tool of group.list) {
      list.push(tool.name);
      all[tool.title + into_str(tool.keywords)] = tool.name;
      tools[tool.name] = tool;
      if (is_some(tool.cross_notice)) {
        for (const [group, content] of Object.entries(tool.cross_notice)) {
          unwrap(cross[group])[tool.name] = `<b>${unwrap(cross_notice_title[group])}</b><br>${content}`;
        }
      }
      if (is_some(tool.category)) {
        for (const category_kind of tool.category) {
          unwrap(category[category_kind]).list.push(tool.name);
        }
      }
    }
    if (group.name !== "non-index") {
      index[group_name] = {
        title: unwrap(or(group.title, from_bool_and_then(group.list.length === 1, () => group.list[0].title))),
        list,
        cross_list: [],
      };
    }
  }

  for (const group of groups) {
    for (const tool of group.list) {
      if (is_some(tool.cross)) {
        for (const cross_group_name of tool.cross) {
          unwrap(index[cross_group_name]).cross_list.push(tool.name);
        }
      }
    }
  }

  return { tools, tool_data: { index, category, all, cross } };
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

const gen_tool_links = (input: Tool, plain: boolean): Option<Node>[] => {
  const links: ToolLink[] = [];
  const downloads: ToolLink[] = [];
  if (is_some(input.website)) {
    links.push({
      title: input.website,
      link_type: "r2",
      link: input.name,
      icon: "link",
    });
  }
  if (is_some(input.websites)) {
    links.push(...Object.entries(input.websites).map(([link, title]): ToolLink => ({
      title,
      link_type: "r2",
      link: `${input.name}-${link}`,
      icon: "link",
    })));
  }
  if (is_some(input.downloads)) {
    downloads.push(...Object.entries(input.downloads).map(([link, title]): ToolLink => ({
      title,
      link_type: "r2",
      link: `${input.name}-d-${link}`,
      icon: "download",
    })));
  }
  if (is_some(input.mirror)) {
    downloads.push({
      title: "镜像下载",
      link_type: "mirror",
      link: `/${input.mirror}/${input.name}.zip`,
      icon: "download",
    });
  }
  if (is_some(input.mirrors)) {
    downloads.push(...Object.entries(input.mirrors).map(([link, title]): ToolLink => ({
      title,
      link_type: "mirror",
      link: `/locked/${input.name}-${link}.zip`,
      icon: "download",
    })));
  }
  const proc = (o: ToolLink[]): Option<Node> => o.length === 0
    ? None
    : ["div", filter_none_attr({
        class: (!plain && into_bool(input.columns)) ? "tool-links-columns" : None
      }), o.map(plain ? gen_tool_link_plain : gen_tool_link)]
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
        src: `{{IMAGE}}/icon-tool/${unwrap_or(input.icon, input.name)}.webp`,
        alt: input.title,
      }, []],
      ["div", { class: "item-title" }, [input.title]],
      svg_icon("expand-right", "icon-line"),
      ["div", { class: "detail-container" }, [
        ["div", { class: "detail" }, filter_none([
          ["p", {}, [input.description]],
          ...gen_tool_links(input, false),
          map(input.notice, tool_notice),
        ])],
      ]],
    ]],
  ]];

const gen_tool_plain = (input: Tool, cross: boolean, title = true): Option<Node>[] => [
  title
    ? ["h3", { id: input.name }, [
      `${input.title} `,
      ["i", {}, [`${input.name}${cross ? " [cross]" : ""}`]],
    ]]
    : None,
  ["p", {}, [input.description]],
  ...gen_tool_links(input, true),
  map(input.notice, tool_notice),
];

const gen_tools_plain = ({ tools, tool_data: { index, cross } }: ProcessedToolGroups): Option<Node>[] =>
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
      if (is_some(cross_notice)) {
        text.push(cross_notice);
      }
      return text;
    }).flat(),
  ]).flat();

const gen_tools_plain_toc = (groups: ToolGroup[]): Node[] => [
  ["h2", { id: "toc" }, ["目录"]],
  ...groups.map((group): Node => {
    const name = unwrap_or_else(group.name, () => group.list[0].name);
    const title = unwrap_or_else(group.title, () => group.list[0].title);
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
    const major_tiles = gen_tile_columns(load("major") as TileColumns);
    dynamic_inserts.set(
      "<!--{{major}}-->",
      render_node(gen_major_wrapper(major_tiles, page_type)),
    );
    dynamic_inserts.set(
      "<!--{{sides}}-->",
      render_nodes(sides.map(gen_side)),
    );
    dynamic_inserts.set(
      "<!--{{include-data}}-->",
      `<script>window.__DATA__=${JSON.stringify(data)}</script>`,
    );
  } else if (filename === "ldtools/index.html") {
    const page_type = "tool";
    const sides = [...(load("sides") as Side[]), ...public_sides];
    const category = load("category") as Category;
    const { tools, tool_data } = proc_tool_groups(load("tools") as ToolGroup[], category);
    const data: GlobalData = { page_type, tool: tool_data };
    const major_tiles = gen_tile_grids(load("major") as TileGrids);
    const major_category = gen_category(category);
    dynamic_inserts.set(
      "<!--{{major}}-->",
      render_node(gen_major_wrapper(major_tiles, page_type)),
    );
    dynamic_inserts.set(
      "<!--{{sides}}-->",
      render_nodes([
        ...sides.map(gen_side),
        ...Object.values(tools).map(gen_tool),
        gen_major_fragment(major_tiles, "tiles"),
        gen_major_fragment(major_category, "category"),
      ]),
    );
    dynamic_inserts.set(
      "<!--{{include-data}}-->",
      `<script>window.__DATA__=${JSON.stringify(data)}</script>`,
    );
  } else if (filename === "ldtools/plain.html") {
    const tool_groups = load_base("ldtools/index.tools.yml") as ToolGroup[];
    const category = load_base("ldtools/index.category.yml") as Category;
    dynamic_inserts.set(
      "<!--{{toc}}-->",
      render_nodes(gen_tools_plain_toc(tool_groups)),
    );
    dynamic_inserts.set(
      "<!--{{main}}-->",
      render_nodes(filter_none(gen_tools_plain(proc_tool_groups(tool_groups, category)))),
    );
  }

  return dynamic_inserts
};
