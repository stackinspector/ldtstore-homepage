use foundations::vec_ext;
use lighthtml::{*, prelude::*};
use crate::ByteString;
type Node = lighthtml::Node<ByteString>;
use crate::{s, util::*, config::*, data::*, Map, Inserts};

macro_rules! classes {
    ($($item:tt)+) => {
        (A_CLASS, s!(vec_ext![$($item)+].join(" ")))
    };
}

macro_rules! class {
    ($s:expr) => {
        attr!{A_CLASS: s!($s)}
    };
    ($($s:expr),+) => {
        attr!{A_CLASS: s!($($s),+)}
    };
}

macro_rules! id {
    ($s:expr) => {
        attr!{A_ID: s!($s)}
    };
    ($($s:expr),+) => {
        attr!{A_ID: s!($($s),+)}
    };
}

macro_rules! empty {
    ($tag:expr) => {
        Element($tag, attr!{}, vec![])
    };
}

macro_rules! clearfix {
    () => {
        Element(E_DIV, class!("clearfix"), vec![])
    };
}

macro_rules! svg_icon {
    ($icon:expr) => {
        Element(E_SVG, class!("icon"), vec![
            Element(E_USE, attr!{A_HREF: s!("#icon-", $icon)}, vec![]),
        ])
    };
    ($icon:expr, $class_name:expr) => {
        Element(E_SVG, class!($class_name), vec![
            Element(E_USE, attr!{A_HREF: s!("#icon-", $icon)}, vec![]),
        ])
    };
}

macro_rules! nbsp {
    () => {
        Text(s!(" "))
    };
}

macro_rules! text {
    ($s:expr) => {
        vec![Text($s)]
    };
}

fn tile_inner(Tile { tile, font, action, icon_type, name, title, icon, path, subdomain }: Tile, is_category: bool) -> Node {
    // TODO lazy eval these `let`s

    let class_name = if is_category { s!("category-item") } else { s!("tile ", tile.as_ref().unwrap()) };

    let icon_type = icon_type.as_ref().map(|s| s!("-", s)).unwrap_or_default();

    let inner = Element(E_IMG, vec_ext![
        (A_SRC, s!("{{ASSERT}}/image/icon", icon_type, "/", icon.as_ref().unwrap_or(&name), ".webp")),
        @if let (Some(title) = title.clone()) { (A_ALT, title) },
    ], if is_category {
        title.map(|title| Element(E_SPAN, attr!{}, text!(title)))
    } else if let (Some(font), Some(title)) = (font, title) {
        Some(Element(font.into_tag(), attr!{}, text!(title)))
    } else {
        None
    }.to_vec());

    macro_rules! link {
        ($location:expr) => {
            Element(E_A, attr!{
                A_TARGET: s!("_blank"),
                A_CLASS: s!("tile-link"),
                A_HREF: $location,
            }, vec![
                Element(E_DIV, attr!{A_CLASS: class_name}, vec![inner])
            ])
        };
    }

    macro_rules! call {
        ($func:expr) => {
            Element(E_DIV, attr!{
                A_CLASS: class_name,
                A_ONCLICK: s!($func, "('", name, "')"),
            }, vec![inner])
        };
    }

    macro_rules! none {
        () => {
            Element(E_DIV, attr!{A_CLASS: class_name}, vec![inner])
        };
    }

    match action {
        TileAction::Side => call!("side"),
        TileAction::Tool => call!("tool"),
        TileAction::Category => call!("category"),
        TileAction::Copy => call!("copy"),
        TileAction::Path => link!(path.clone().unwrap_or_else(|| s!("/", name, "/"))),
        TileAction::Subdomain => link!(s!("//", subdomain.as_ref().unwrap(), ".pc.wiki/")),
        TileAction::R => link!(s!("//r.ldt.pc.wiki/r/", name, "/")),
        TileAction::R2 => link!(s!("//r.ldt.pc.wiki/r2/", name, "/")),
        TileAction::None => none!(),
    }
}

fn tile(input: Tile) -> Node {
    tile_inner(input, false)
}

fn tile_columns(input: TileColumns) -> impl Iterator<Item = Node> {
    input.map(|o| Element(E_DIV, class!("tile-column"), o.map_to(tile)))
}

fn tile_grids(TileGrids { left, middle }: TileGrids) -> Vec<Node> {
    let [
        TileGridMiddle { title: first_title, content: first },
        TileGridMiddle { title: second_title, content: second },
        TileGridMiddle { title: third_title, content: third },
    ]: [TileGridMiddle; 3] = middle.try_into().unwrap();
    assert_eq!(third.len(), 9);

    vec_ext![
        Element(E_DIV, class!("tile-grid-vertical"), left.map_to(tile)),
        Element(E_DIV, class!("tile-grid-middle"), vec_ext![
            Element(E_DIV, class!("title top"), text!(first_title)),
            @extend(first.map(tile)),
            Element(E_DIV, class!("title"), text!(second_title)),
            @extend(second.map(tile)),
            Element(E_DIV, class!("title"), text!(third_title)),
        ]),
        @extend(third.map(tile)),
    ]
}

fn major_fragment(mut inner: Vec<Node>, template_id: ByteString) -> Node {
    inner.push(clearfix!());
    Element(E_TEMPLATE, id!("major-", template_id), inner)
}

fn tile_template(TileTemplate { template: tile_template, tiles }: TileTemplate) -> Vec<Tile> {
    match tiles {
        TileTemplateTiles::WithoutTitle(tiles) => {
            tiles.map_to(|name| {
                let TileTemplateInner { tile, font, action, icon_type } = tile_template.clone();
                Tile { tile: Some(tile), font, action, icon_type, name, title: None, icon: None, path: None, subdomain: None }
            })
        },
        TileTemplateTiles::WithTitle(tiles) => {
            tiles.map_to(|(name, title)| {
                let TileTemplateInner { tile, font, action, icon_type } = tile_template.clone();
                Tile { tile: Some(tile), font, action, icon_type, name, title: Some(title), icon: None, path: None, subdomain: None }
            })
        }
    }
}

fn side(Side { name, title, text, text_small, tiles, templated }: Side) -> Node {
    let mut content = if let Some(tiles) = tiles.or_else(|| templated.map(tile_template)) {
        vec_ext![
            @extend(tiles.map(tile)),
            clearfix!(),
        ]
    } else {
        Vec::new()
    };

    if let Some(text) = text {
        content.push(Element(E_DIV, class!(if text_small.unwrap_or(false) { "text small" } else { "text" }), text!(text)));
    }
    
    Element(E_TEMPLATE, id!("side-", name), vec![
        Element(E_DIV, class!("title"), text!(title)),
        svg_icon!("#icon-arrow-left", "icon-back"),
        empty!(E_HR),
        Element(E_DIV, class!("content"), content),
    ])
}

fn category_item(input: Tile) -> Node {
    tile_inner(input, true)
}

fn category_group(CategoryGroup { title, content }: CategoryGroup) -> Node {
    Element(E_DIV, class!("category-group"), vec_ext![
        Element(E_DIV, class!("category-group-title"), vec![
            Element(E_DIV, class!("text"), text!(title)),
        ]),
        @extend(content.map(category_item)),
    ])
}

fn category_tab(content: Vec<CategoryGroup>) -> Vec<Node> {
    let mut content = content.map(category_group);
    let mut left = Vec::new();
    let mut right = Vec::new();
    if let Some(l1) = content.next() { left.push(l1); }
    if let Some(l2) = content.next() { left.push(l2); }
    if let Some(r1) = content.next() { right.push(r1); }
    if let Some(r2) = content.next() { right.push(r2); }
    assert!(content.next().is_none());
    vec![
        Element(E_DIV, class!("category-tab-part"), left),
        Element(E_DIV, class!("category-tab-part"), right),
    ]
}

fn category(Category { tool, link }: Category) -> Vec<Node> {
    let CategoryTab { title: tool_title, content: tool } = tool;
    let CategoryTab { title: link_title, content: link } = link;
    vec![
        Element(E_DIV, class!("category-title"), vec![
            Element(E_DIV, attr!{A_ID: s!("tool-button"), A_CLASS: s!("selected")}, text!(tool_title)),
            Element(E_DIV, id!("link-button"), text!(link_title)),
        ]),
        Element(E_DIV, class!("category-content"), vec![
            Element(E_DIV, id!("tool-list"), category_tab(tool)),
            Element(E_DIV, attr!{A_ID: s!("link-list"), A_STYLE: s!("opacity: 0; pointer-events: none")}, category_tab(link)),
        ])
    ]
}

fn tool_groups(mut groups: Vec<ToolGroup>, major_category: Category) -> (Map<Tool>, ToolData) {
    let mut tools = Map::new();
    let mut index = Map::new();
    let mut all = Map::new();
    let mut cross = Map::new();
    let mut cross_notice_title: Map<ByteString> = Map::new();
    let mut category = Map::new();

    for tab in {
        let Category { tool, link } = major_category;
        [tool, link]
    } {
        for group in tab.content {
            for item in group.content {
                if matches!(item.action, TileAction::Category) {
                    category.first_insert(
                        item.name.clone(),
                        ToolCategoryItem {
                            title: item.title.clone().unwrap().clone(),
                            list: Vec::new()
                        }
                    );
                }
            }
        }
    }

    for ToolGroup { name, cross_notice, .. } in &groups {
        if let (Some(name), Some(cross_notice)) = (name, cross_notice) {
            cross_notice_title.first_insert(
                name.clone(),
                cross_notice.clone(),
            );
            cross.first_insert(
                name.clone(),
                Map::new(),
            );
        }
    }

    for group in &mut groups {
        let single = (group.list.len() == 1) && group.name.is_none();
        let group_name = group.name.clone().or_else(|| single.then(|| group.list[0].name.clone())).unwrap();
        let mut list = Vec::new();
        for tool in &mut group.list {
            tool.no_icon.or_self(group.no_icon);
            list.push(tool.name.clone());
            all.first_insert(s!(tool.title, tool.keywords.clone().unwrap_or_default()), tool.name.clone());
            tools.first_insert(tool.name.clone(), tool.clone());
            if let Some(cross_notice) = &tool.cross_notice {
                for (notice_group, notice) in cross_notice {
                    cross.get_mut(notice_group).unwrap().first_insert(
                        tool.name.clone(),
                        s!("<b>", cross_notice_title.get(notice_group).unwrap(), "</b><br>", notice),
                    )
                }
            }
            if let Some(tool_category) = &tool.category {
                for category_kind in tool_category {
                    category.get_mut(category_kind).unwrap().list.push(tool.name.clone());
                }
            }
        }
        if group.name.as_ref().map(|s| s != "non-index").unwrap_or(true) {
            index.first_insert(
                group_name,
                ToolIndexItem {
                    single,
                    title: group.title.clone().or_else(|| single.then(|| group.list[0].title.clone())).unwrap(),
                    list,
                    cross_list: Vec::new(),
                    cross_top_list: Vec::new(),
                }
            )
        }
    }

    for group in &groups {
        for tool in &group.list {
            if let Some(cross) = &tool.cross {
                for cross_group_name in cross {
                    index.get_mut(cross_group_name).unwrap().cross_list.push(tool.name.clone())
                }
            }
            if let Some(cross) = &tool.cross_top {
                for cross_group_name in cross {
                    index.get_mut(cross_group_name).unwrap().cross_top_list.push(tool.name.clone())
                }
            }
        }
    }

    (tools, ToolData { index, all, cross, category })
}

fn tool_link_title(title: ToolLinkTitle) -> ByteString {
    match title {
        ToolLinkTitle::Text(title) => title,
        ToolLinkTitle::Type(t) => s!(tool_website_type(t)),
    }
}

fn tool_link(ToolLink { title, link_type, link, icon }: ToolLink) -> Node {
    Element(E_SPAN, vec![], vec![
        Element(E_A, attr!{
            A_TARGET: s!("_blank"),
            A_CLASS: s!("link"),
            A_HREF: s!(tool_link_prefix(link_type), link),
        }, vec![
            svg_icon!(icon.as_str()),
            nbsp!(),
            Text(tool_link_title(title)),
        ])
    ])
}

fn tool_link_plain(ToolLink { title, link_type, link, icon }: ToolLink) -> Node {
    Element(E_SPAN, attr!{}, vec![
        Element(E_A, attr!{
            A_TARGET: s!("_blank"),
            A_HREF: s!(tool_link_prefix(link_type), link),
        }, vec![
            Text(s!(tool_icon_emoji(icon), tool_link_title(title.clone())))
        ]),
        nbsp!(),
        Element(E_I, attr!{}, text!(s!("[", link_type.as_str(), "] ", link))),
        empty!(E_BR),
    ])
}

fn tool_links(name: ByteString, ToolLinks { website, websites, websites_tile, websites_tile_template, downloads, downloads_groups, mirror, mirrors, columns }: ToolLinks, plain: bool) -> Vec<Node> {
    let attrs = (!plain && columns.unwrap_or(false)).then(|| (A_CLASS, s!("tool-links-columns"))).to_vec();
    let tool_link_selected: fn(ToolLink) -> lighthtml::Node<String> = if plain { tool_link_plain } else { tool_link };
    let mut res = Vec::new();

    {
        let mut res_links = Vec::new();
        if let Some(website) = website {
            res_links.push(ToolLink {
                title: website,
                link_type: ToolLinkType::R2,
                link: name.clone(),
                icon: ToolLinkIcon::Link,
            });
        }
        if let Some(websites) = websites {
            for (link, title) in websites {
                res_links.push(ToolLink {
                    title,
                    link_type: ToolLinkType::R2,
                    link: s!(name, "-", link),
                    icon: ToolLinkIcon::Link,
                });
            }
        }
        if !res_links.is_empty() {
            res.push(Element(if plain { E_P } else { E_DIV }, attrs.clone(), res_links.map_to(tool_link_selected)));
        }
    }

    {
        let mut res_downloads = Vec::new();
        if let Some(downloads) = downloads {
            for (link, title) in downloads {
                res_downloads.push(ToolLink {
                    title: ToolLinkTitle::Text(title),
                    link_type: ToolLinkType::R2,
                    link: s!(name, "-d-", link),
                    icon: ToolLinkIcon::Download,
                });
            }
        }
        if let Some(_mirror) = mirror {
            res_downloads.push(ToolLink {
                title: ToolLinkTitle::Text(s!("镜像下载")),
                link_type: ToolLinkType::Mirror,
                link: name.clone(),
                icon: ToolLinkIcon::Download,
            })
        }
        if let Some(mirrors) = mirrors {
            for (link, title) in mirrors {
                res_downloads.push(ToolLink {
                    title: ToolLinkTitle::Text(title),
                    link_type: ToolLinkType::Mirror,
                    link: s!(name, "-", link),
                    icon: ToolLinkIcon::Download,
                });
            }
        }
        if !res_downloads.is_empty() {
            res.push(Element(if plain { E_P } else { E_DIV }, attrs.clone(), res_downloads.map_to(tool_link_selected)));
        }
    }

    if let Some(downloads_groups) = downloads_groups {
        for (group_title, downloads_group) in downloads_groups {
            let mut res_group = Vec::new();
            res_group.push(Element(E_P, attr!{}, vec![Element(E_B, attr!{}, text!(s!(group_title)))]));
            for (link, title) in downloads_group {
                res_group.push(tool_link_selected(ToolLink {
                    title: ToolLinkTitle::Text(title),
                    link_type: ToolLinkType::R2,
                    link: s!(name, "-d-", link),
                    icon: ToolLinkIcon::Download,
                }));
            }
            res.push(Element(if plain { E_P } else { E_DIV }, attr!{}, res_group));
        }
    }

    {
        let mut tile_links = Vec::new();
        if let Some(websites_tile) = websites_tile {
            for (link, title) in websites_tile {
                tile_links.push(ToolLink {
                    title,
                    link_type: ToolLinkType::R2,
                    link: s!(name, "-", link),
                    icon: ToolLinkIcon::Link,
                });
            }
        }
        if !tile_links.is_empty() {
            if plain {
                res.push(Element(E_P, attrs, tile_links.map_to(tool_link_plain)));
            } else {
                res.extend(tile_template(TileTemplate {
                    template: websites_tile_template.unwrap(),
                    tiles: TileTemplateTiles::WithoutTitle(tile_links.map_to(|ToolLink { link, .. }| link))
                }).map(tile));
                res.push(clearfix!())
            }
        }
    }

    res
}

fn tool_notice(notice: ByteString) -> Node {
    Element(E_P, attr!{}, vec![
        Element(E_B, attr!{}, text!(s!("注意事项"))),
        empty!(E_BR),
        Text(notice),
    ])
}

fn tool(Tool { name, title, icon, description, notice, links, no_icon, .. }: Tool) -> Node {
    Element(E_TEMPLATE, id!("tool-", name), vec![
        Element(E_DIV, attr!{
            A_CLASS: s!("item"),
            A_ONCLICK: s!("detail(this)"),
        }, vec![
            Element(E_DIV, class!("item-title"), vec_ext![
                @if (!(no_icon.unwrap_or(false))) {
                    Element(E_IMG, attr![
                        A_SRC: s!("{{ASSERT}}/image/icon-tool/", icon.as_ref().unwrap_or(&name), ".webp"),
                        A_ALT: title.clone(),
                    ], vec![])
                },
                Text(title)
            ]),
            svg_icon!("expand-right", "icon-line"),
            Element(E_DIV, class!("detail-container"), vec![
                Element(E_DIV, class!("detail"), vec_ext![
                    Element(E_P, attr!{}, description.map(Text).to_vec()),
                    @append(&mut tool_links(name.clone(), links, false)),
                    @if let (Some(notice) = notice) {
                        tool_notice(notice)
                    }
                ])
            ])
        ])
    ])
}

enum CrossType {
    None,
    Cross,
    CrossTop,
}

impl CrossType {
    fn is_cross(&self) -> bool {
        match self {
            CrossType::None => false,
            _ => true,
        }
    }

    fn cross_sign(&self) -> &'static str {
        match self {
            CrossType::None => panic!(),
            CrossType::Cross => "[cross]",
            CrossType::CrossTop => "[cross-top]",
        }
    }
}

fn tool_plain(Tool { name, title, description, notice, links, .. }: Tool, cross: CrossType, has_title: bool) -> Vec<Node> {
    let is_cross = cross.is_cross();
    vec_ext![
        @if (has_title) {
            Element(E_H3, id!(name.clone()), vec_ext![
                Text(s!(title)),
                nbsp!(),
                Element(E_I, attr!{}, text!(s!(name.clone()))),
                @if (is_cross) {
                    nbsp!()
                },
                @if (is_cross) {
                    Element(E_I, class!("hint"), text!(s!(cross.cross_sign())))
                },
            ])
        },
        Element(E_P, attr!{}, description.map(Text).to_vec()),
        @append(&mut tool_links(name, links, true)),
        @if let (Some(notice) = notice) {
            tool_notice(notice)
        },
    ]
}

fn tools_plain(tools: Map<Tool>, index: ToolIndex, cross: ToolCross) -> Vec<Node> {
    let mut res = Vec::new();
    for (name, ToolIndexItem { single, title, list, cross_list, cross_top_list }) in index {
        res.push(Element(E_H2, id!(name.clone()), vec_ext![
            Text(s!(title, " ")),
            Element(E_I, attr!{}, text!(name.clone())),
            nbsp!(),
            // TODO(foundations)
            @if (single) {
                Element(E_I, class!("hint"), text!(s!("[single]")))
            },
            @if (single) {
                nbsp!()
            },
            Element(E_A, attr!{A_CLASS: s!("toc"), A_HREF: s!("#toc")}, text!(s!("[目录]"))),
        ]));
        if single {
            res.append(&mut tool_plain(tools.get(&list[0]).unwrap().clone(), CrossType::None, false));
        } else {
            for tool_name in cross_top_list {
                res.append(&mut tool_plain(tools.get(&tool_name).unwrap().clone(), CrossType::CrossTop, true));
            }
            for tool_name in list {
                res.append(&mut tool_plain(tools.get(&tool_name).unwrap().clone(), CrossType::None, true));
            }
        }
        for tool_name in cross_list {
            res.append(&mut tool_plain(tools.get(&tool_name).unwrap().clone(), CrossType::Cross, true));
            if let Some(cross_notice) = cross.get(&name).and_then(|m| m.get(&tool_name)) {
                res.push(Text(cross_notice.clone()));
            }
        }
    }
    res
}

fn tools_plain_toc(groups: Vec<ToolGroup>) -> Vec<Node> {
    let mut res = Vec::new();
    res.push(Element(E_H2, id!("toc"), text!(s!("目录"))));
    for ToolGroup { name, title, list, .. } in groups {
        let name = name.unwrap_or_else(|| list[0].name.clone());
        let title = title.unwrap_or_else(|| list[0].title.clone());
        res.push(Element(E_P, attr!{}, vec![
            Element(E_A, attr!{A_HREF: s!("#", name.clone())}, text!(s!(title))),
            nbsp!(),
            Element(E_I, attr!{}, text!(s!(name)))
        ]));
    }
    res
}

fn classic_button(ClassicButton { target, text }: ClassicButton, top: bool) -> Node {
    Element(E_P, attr!{}, vec![Element(E_A, vec_ext![
        classes!(
            "button",
            @if (!top) {
                "button-detail"
            },
            @if (target.is_none()) {
                "button-nolink"
            },
        ),
        @if (target.is_some()) {
            (A_HREF, s!("//r.ldt.pc.wiki/r/", target.as_ref().unwrap()))
        },
    ], text!(text))])
}

fn classic_text(ClassicText { footer, text }: ClassicText) -> Node {
    Element(E_SPAN, class!(if footer { s!("text-detail-footer") } else { s!("text") }), text!(text))
}

fn classic_list(ClassicList { id, text, content }: ClassicList, list: &mut Vec<Node>) {
    list.push(Element(E_P, attr!{}, vec![
        Element(E_A, attr!{A_CLASS: s!("button"), A_ONCLICK: s!("detail('", id, "')")}, text!(text)),
    ]));
    list.push(Element(E_DIV, attr!{A_CLASS: s!("detail-container"), A_ID: s!(id, "-detail")}, content.map_to(|node| {
        match node {
            ClassicSubNode::Button(node) => classic_button(node, false),
            ClassicSubNode::Text(node) => classic_text(node),
        }
    })));
}

fn classic(nodes: Vec<ClassicRootNode>) -> Vec<Node> {
    let mut res = Vec::new();
    for node in nodes {
        match node {
            ClassicRootNode::Button(node) => res.push(classic_button(node, true)),
            ClassicRootNode::Text(node) => res.push(classic_text(node)),
            ClassicRootNode::List(node) => classic_list(node, &mut res),
        }
    }
    res
}

pub fn codegen<P: AsRef<std::path::Path>>(inserts: &mut Inserts, includes: &mut Map<GlobalData>, page_path: P) {
    let page_path = page_path.as_ref();
    macro_rules! load {
        ($s:literal -> $t:ty) => {{
            let v: $t = serde_yaml::from_reader(std::fs::File::open(page_path.join($s)).unwrap()).unwrap(); v
        }};
    }

    let public_sides = load!("public/sides.yml" -> Vec<Side>);
    let home_major = load!("home/major.yml" -> TileColumns);
    let home_sides = load!("home/sides.yml" -> Vec<Side>);
    let tools_major = load!("tool/major.yml" -> TileGrids);
    let tools_sides = load!("tool/sides.yml" -> Vec<Side>);
    let tools_tools = load!("tool/tools.yml" -> Vec<ToolGroup>);
    let tools_category = load!("tool/category.yml" -> Category);
    let legacy_buttons = load!("legacy/buttons.yml" -> Vec<ClassicRootNode>);

    let public_sides = public_sides.map(side);

    let home_major = tile_columns(home_major);

    let mut home_sides = home_sides.map_to(side);
    home_sides.extend(public_sides.clone());

    let (tools_ext, tool_data) = tool_groups(tools_tools.clone(), tools_category.clone());

    let mut tools_fragments = tools_sides.map_to(side);
    tools_fragments.extend(public_sides);
    tools_fragments.extend(tools_ext.values().cloned().map(tool));
    tools_fragments.push(major_fragment(tile_grids(tools_major), s!("tiles")));
    tools_fragments.push(major_fragment(category(tools_category), s!("category")));

    let mut tools_plains = tools_plain_toc(tools_tools);
    tools_plains.extend(tools_plain(tools_ext, tool_data.index.clone(), tool_data.cross.clone()));

    let legacy_buttons = classic(legacy_buttons);

    /*

    let mut jsonhtml_inserts = Inserts::new();

    macro_rules! collect {
        ($($s:ident)+) => {$(
            let $s = $s.into_iter().collect::<Vec<_>>();
        )+};
    }

    collect! {
        home_major
        home_sides
        tools_fragments
        tools_plains
        legacy_buttons
    }

    fn to_json<T: serde::Serialize>(d: &T) -> String {
        serde_json::to_string(d).unwrap()
    }

    add_insert! {
        jsonhtml_inserts:
        "<!--{{codegen-home-major}}-->" => to_json(&home_major)
        "<!--{{codegen-home-fragments}}-->" => to_json(&home_sides)
        "<!--{{codegen-tool-fragments}}-->" => to_json(&tools_fragments)
        "<!--{{codegen-tool-plain}}-->" => to_json(&tools_plains)
        "<!--{{codegen-legacy-buttons}}-->" => to_json(&legacy_buttons)
    }

    */

    add_insert! {
        inserts:
        "<!--{{codegen-home-major}}-->" => render_nodes(home_major)
        "<!--{{codegen-home-fragments}}-->" => render_nodes(home_sides)
        "<!--{{codegen-tool-fragments}}-->" => render_nodes(tools_fragments)
        "<!--{{codegen-tool-plain}}-->" => render_nodes(tools_plains)
        "<!--{{codegen-legacy-buttons}}-->" => render_nodes(legacy_buttons)
    }

    includes.first_insert(s!("ldt"), GlobalData::Home);
    includes.first_insert(s!("tool"), GlobalData::Tool { tool: tool_data });
}
