use foundations::vec_ext;
use lighthtml::{*, prelude::*};
use crate::{s, config::*, data::*, Map, Inserts};

trait VecMap<T>: IntoIterator<Item = T> + Sized {
    #[inline]
    fn map<U, F: FnMut(T) -> U>(self, f: F) -> core::iter::Map<Self::IntoIter, F> {
        self.into_iter().map(f)
    }

    #[inline]
    fn map_to<U, F: FnMut(T) -> U>(self, f: F) -> Vec<U> {
        self.into_iter().map(f).collect()
    }
}

impl<T> VecMap<T> for Vec<T> {}

trait MapMap<K, V>: IntoIterator<Item = (K, V)> + Sized {
    #[inline]
    fn map<U, F: FnMut((K, V)) -> U>(self, f: F) -> core::iter::Map<Self::IntoIter, F> {
        self.into_iter().map(f)
    }

    #[inline]
    fn map_to<U, F: FnMut((K, V)) -> U>(self, f: F) -> Vec<U> {
        self.into_iter().map(f).collect()
    }
}

impl<K, V> MapMap<K, V> for indexmap::IndexMap<K, V> {}

trait OptionToVec<T>: IntoIterator<Item = T> + Sized {
    #[inline]
    fn to_vec(self) -> Vec<T> {
        self.into_iter().collect()
    }
}

impl<T> OptionToVec<T> for Option<T> {}

trait UnwrapNone {
    fn unwrap_none(self);
}

impl<T> UnwrapNone for Option<T> {
    fn unwrap_none(self) {
        assert!(matches!(self, None))
    }
}

trait OrSelf<T> {
    fn or_self(&mut self, optb: Option<T>);
}

impl<T> OrSelf<T> for Option<T> {
    fn or_self(&mut self, optb: Option<T>) {
        *self = self.take().or(optb);
    }
}

trait IndexMapFirstInsert<K: core::hash::Hash + core::cmp::Eq, V> {
    fn first_insert(&mut self, k: K, v: V);
}

impl<K: core::hash::Hash + core::cmp::Eq, V> IndexMapFirstInsert<K, V> for indexmap::IndexMap<K, V> {
    fn first_insert(&mut self, k: K, v: V) {
        self.insert(k, v).unwrap_none()
    }
}

macro_rules! classes {
    ($($item:tt)+) => {
        (class, s!(vec_ext![$($item)+].join(" ")))
    };
}

macro_rules! class {
    ($s:expr) => {
        vec![(class, s!($s))]
    };
    ($($s:expr),+) => {
        vec![(class, s!($($s),+))]
    };
}

macro_rules! id {
    ($s:expr) => {
        vec![(id, s!($s))]
    };
    ($($s:expr),+) => {
        vec![(id, s!($($s),+))]
    };
}

macro_rules! empty {
    ($tag:expr) => {
        Element($tag, vec![], vec![])
    };
}

macro_rules! clearfix {
    () => {
        Element(div, class!("clearfix"), vec![])
    };
}

macro_rules! svg_icon {
    ($icon:expr) => {
        Element(svg, class!("icon"), vec![
            Element(r#use, vec![(href, s!("#icon-", $icon))], vec![]),
        ])
    };
    ($icon:expr, $class_name:expr) => {
        Element(svg, class!($class_name), vec![
            Element(r#use, vec![(href, s!("#icon-", $icon))], vec![]),
        ])
    };
}

macro_rules! nbsp {
    () => {
        Text(s!(" "))
    };
}

fn tile_inner(Tile { tile, font, action, icon_type, name, title, icon, path, subdomain }: Tile, is_category: bool) -> Node {
    // TODO lazy eval these `let`s

    let class_name = if is_category { s!("category-item") } else { s!("tile ", tile.as_ref().unwrap()) };

    let icon_type = icon_type.as_ref().map(|s| s!("-", s)).unwrap_or_default();

    let inner = Element(img, vec_ext![
        (src, s!("{{ASSERT}}/image/icon", icon_type, "/", icon.as_ref().unwrap_or(&name), ".webp")),
        @if let (Some(title) = title.clone()) { (alt, title) },
    ], if is_category {
        title.map(|title| Element(span, vec![], vec![Text(title)]))
    } else if let (Some(font), Some(title)) = (font, title) {
        Some(Element(font.into_tag(), vec![], vec![Text(title)]))
    } else {
        None
    }.to_vec());

    macro_rules! link {
        ($location:expr) => {
            Element(a, vec![
                (target, s!("_blank")),
                (class, s!("tile-link")),
                (href, $location),
            ], vec![
                Element(div, vec![(class, class_name)], vec![inner])
            ])
        };
    }

    macro_rules! call {
        ($func:expr) => {
            Element(div, vec![
                (class, class_name),
                (onclick, s!($func, "('", name, "')")),
            ], vec![inner])
        };
    }

    macro_rules! none {
        () => {
            Element(div, vec![(class, class_name)], vec![inner])
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
    input.map(|o| Element(div, class!("tile-column"), o.map_to(tile)))
}

fn tile_grids(TileGrids { left, middle }: TileGrids) -> Vec<Node> {
    let [
        TileGridMiddle { title: first_title, content: first },
        TileGridMiddle { title: second_title, content: second },
        TileGridMiddle { title: third_title, content: third },
    ]: [TileGridMiddle; 3] = middle.try_into().unwrap();
    assert_eq!(third.len(), 9);

    vec_ext![
        Element(div, class!("tile-grid-vertical"), left.map_to(tile)),
        Element(div, class!("tile-grid-middle"), vec_ext![
            Element(div, class!("title top"), vec![Text(first_title)]),
            @extend(first.map(tile)),
            Element(div, class!("title"), vec![Text(second_title)]),
            @extend(second.map(tile)),
            Element(div, class!("title"), vec![Text(third_title)]),
        ]),
        @extend(third.map(tile)),
    ]
}

fn major_fragment(mut inner: Vec<Node>, template_id: ByteString) -> Node {
    inner.push(clearfix!());
    Element(template, id!("major-", template_id), inner)
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
        content.push(Element(div, class!(if text_small.unwrap_or(false) { "text small" } else { "text" }), vec![Text(text)]));
    }
    
    Element(template, id!("side-", name), vec![
        Element(div, class!("title"), vec![Text(title)]),
        svg_icon!("#icon-arrow-left", "icon-back"),
        empty!(hr),
        Element(div, class!("content"), content),
    ])
}

fn category_item(input: Tile) -> Node {
    tile_inner(input, true)
}

fn category_group(CategoryGroup { title, content }: CategoryGroup) -> Node {
    Element(div, class!("category-group"), vec_ext![
        Element(div, class!("category-group-title"), vec![
            Element(div, class!("text"), vec![Text(title)]),
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
    assert!(matches!(content.next(), None));
    vec![
        Element(div, class!("category-tab-part"), left),
        Element(div, class!("category-tab-part"), right),
    ]
}

fn category(Category { tool, link }: Category) -> Vec<Node> {
    let CategoryTab { title: tool_title, content: tool } = tool;
    let CategoryTab { title: link_title, content: link } = link;
    vec![
        Element(div, class!("category-title"), vec![
            Element(div, vec![(id, s!("tool-button")), (class, s!("selected"))], vec![Text(tool_title)]),
            Element(div, id!("link-button"), vec![Text(link_title)]),
        ]),
        Element(div, class!("category-content"), vec![
            Element(div, id!("tool-list"), category_tab(tool)),
            Element(div, vec![(id, s!("link-list")), (style, s!("opacity: 0; pointer-events: none"))], category_tab(link)),
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
    Element(span, vec![], vec![
        Element(a, vec![
            (target, s!("_blank")),
            (class, s!("link")),
            (href, s!(tool_link_prefix(link_type), link)),
        ], vec![
            svg_icon!(icon.as_str()),
            nbsp!(),
            Text(tool_link_title(title)),
        ])
    ])
}

fn tool_link_plain(ToolLink { title, link_type, link, icon }: ToolLink) -> Node {
    Element(span, vec![], vec![
        Element(a, vec![
            (target, s!("_blank")),
            (href, s!(tool_link_prefix(link_type), link)),
        ], vec![
            Text(s!(tool_icon_emoji(icon), tool_link_title(title.clone())))
        ]),
        nbsp!(),
        Element(i, vec![], vec![Text(s!("[", link_type.as_str(), "] ", link))]),
        empty!(br),
    ])
}

fn tool_links(name: ByteString, ToolLinks { website, websites, websites_tile, websites_tile_template, downloads: tool_downloads, mirror, mirrors, columns }: ToolLinks, plain: bool) -> Vec<Node> {
    let mut links = Vec::new();
    let mut downloads = Vec::new();
    let mut tile_links = Vec::new();
    if let Some(website) = website {
        links.push(ToolLink {
            title: website,
            link_type: ToolLinkType::R2,
            link: name.clone(),
            icon: ToolLinkIcon::Link,
        });
    }
    if let Some(websites) = websites {
        for (link, title) in websites {
            links.push(ToolLink {
                title,
                link_type: ToolLinkType::R2,
                link: s!(name, "-", link),
                icon: ToolLinkIcon::Link,
            });
        }
    }
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
    if let Some(tool_downloads) = tool_downloads {
        for (link, title) in tool_downloads {
            downloads.push(ToolLink {
                title: ToolLinkTitle::Text(title),
                link_type: ToolLinkType::R2,
                link: s!(name, "-d-", link),
                icon: ToolLinkIcon::Download,
            });
        }
    }
    if let Some(_mirror) = mirror {
        downloads.push(ToolLink {
            title: ToolLinkTitle::Text(s!("镜像下载")),
            link_type: ToolLinkType::Mirror,
            link: name.clone(),
            icon: ToolLinkIcon::Download,
        })
    }
    if let Some(mirrors) = mirrors {
        for (link, title) in mirrors {
            downloads.push(ToolLink {
                title: ToolLinkTitle::Text(title),
                link_type: ToolLinkType::Mirror,
                link: s!(name, "-", link),
                icon: ToolLinkIcon::Download,
            });
        }
    }

    let attrs = (!plain && columns.unwrap_or(false)).then(|| (class, s!("tool-links-columns"))).to_vec();
    let map_fn = if plain { tool_link_plain } else { tool_link };
    let mut res = Vec::new();
    if !links.is_empty() {
        res.push(Element(div, attrs.clone(), links.map_to(map_fn)));
    }
    if !downloads.is_empty() {
        res.push(Element(div, attrs.clone(), downloads.map_to(map_fn)));
    }
    if !tile_links.is_empty() {
        if plain {
            res.push(Element(div, attrs, tile_links.map_to(tool_link_plain)));
        } else {
            res.extend(tile_template(TileTemplate {
                template: websites_tile_template.unwrap(),
                tiles: TileTemplateTiles::WithoutTitle(tile_links.map_to(|ToolLink { link, .. }| link))
            }).map(tile));
            res.push(clearfix!())
        }
    }
    res
}

fn tool_notice(notice: ByteString) -> Node {
    Element(p, vec![], vec![
        Element(b, vec![], vec![Text(s!("注意事项"))]),
        empty!(br),
        Text(notice),
    ])
}

fn tool(Tool { name, title, icon, description, notice, links, no_icon, .. }: Tool) -> Node {
    Element(template, id!("tool-", name), vec![
        Element(div, vec![
            (class, s!("item")),
            (onclick, s!("detail(this)")),
        ], vec![
            Element(div, class!("item-title"), vec_ext![
                @if (!(no_icon.unwrap_or(false))) {
                    Element(img, vec![
                        (src, s!("{{ASSERT}}/image/icon-tool/", icon.as_ref().unwrap_or(&name), ".webp")),
                        (alt, title.clone()),
                    ], vec![])
                },
                Text(title)
            ]),
            svg_icon!("expand-right", "icon-line"),
            Element(div, class!("detail-container"), vec![
                Element(div, class!("detail"), vec_ext![
                    Element(p, vec![], description.map(Text).to_vec()),
                    @append(&mut tool_links(name.clone(), links, false)),
                    @if let (Some(notice) = notice) {
                        tool_notice(notice)
                    }
                ])
            ])
        ])
    ])
}

fn tool_plain(Tool { name, title, description, notice, links, .. }: Tool, cross: bool, has_title: bool) -> Vec<Node> {
    vec_ext![
        @if (has_title) {
            Element(h3, id!(name.clone()), vec_ext![
                Text(s!(title)),
                nbsp!(),
                Element(i, vec![], vec![Text(s!(name.clone()))]),
                @if (cross) {
                    nbsp!()
                },
                @if (cross) {
                    Element(i, class!("hint"), vec![Text(s!("[cross]"))])
                },
            ])
        },
        Element(p, vec![], description.map(Text).to_vec()),
        @append(&mut tool_links(name, links, true)),
        @if let (Some(notice) = notice) {
            tool_notice(notice)
        },
    ]
}

fn tools_plain(tools: Map<Tool>, index: ToolIndex, cross: ToolCross) -> Vec<Node> {
    let mut res = Vec::new();
    for (name, ToolIndexItem { single, title, list, cross_list }) in index {
        res.push(Element(h2, id!(name.clone()), vec_ext![
            Text(s!(title, " ")),
            Element(i, vec![], vec![Text(name.clone())]),
            nbsp!(),
            // TODO(foundations)
            @if (single) {
                Element(i, class!("hint"), vec![Text(s!("[single]"))])
            },
            @if (single) {
                nbsp!()
            },
            Element(a, vec![(class, s!("toc")), (href, s!("#toc"))], vec![Text(s!("[目录]"))]),
        ]));
        if single {
            res.append(&mut tool_plain(tools.get(&list[0]).unwrap().clone(), false, false));
        } else {
            for tool_name in list {
                res.append(&mut tool_plain(tools.get(&tool_name).unwrap().clone(), false, true));
            }
        }
        for tool_name in cross_list {
            res.append(&mut tool_plain(tools.get(&tool_name).unwrap().clone(), true, true));
            if let Some(cross_notice) = cross.get(&name).and_then(|m| m.get(&tool_name)) {
                res.push(Text(cross_notice.clone()));
            }
        }
    }
    res
}

fn tools_plain_toc(groups: Vec<ToolGroup>) -> Vec<Node> {
    let mut res = Vec::new();
    res.push(Element(h2, id!("toc"), vec![Text(s!("目录"))]));
    for ToolGroup { name, title, list, .. } in groups {
        let name = name.unwrap_or_else(|| list[0].name.clone());
        let title = title.unwrap_or_else(|| list[0].title.clone());
        res.push(Element(p, vec![], vec![
            Element(a, vec![(href, s!("#", name.clone()))], vec![Text(s!(title))]),
            nbsp!(),
            Element(i, vec![], vec![Text(s!(name))])
        ]));
    }
    res
}

fn include_data(data: GlobalData) -> ByteString {
    s!("<script>window.__DATA__=", serde_json::to_string(&data).unwrap(), "</script>")
}

fn classic_button(ClassicButton { target: _target, text }: ClassicButton, top: bool) -> Node {
    Element(p, vec![], vec![Element(a, vec_ext![
        classes!(
            "button",
            @if (!top) {
                "button-detail"
            },
            @if (_target.is_none()) {
                "button-nolink"
            },
        ),
        @if (_target.is_some()) {
            (href, s!("//r.ldt.pc.wiki/r/", _target.as_ref().unwrap()))
        },
    ], vec![Text(text)])])
}

fn classic_text(ClassicText { footer, text }: ClassicText) -> Node {
    Element(span, class!(if footer { s!("text-detail-footer") } else { s!("text") }), vec![Text(text)])
}

fn classic_list(ClassicList { id: _id, text, content }: ClassicList, list: &mut Vec<Node>) {
    list.push(Element(p, vec![], vec![
        Element(a, vec![(class, s!("button")), (onclick, s!("detail('", _id, "')"))], vec![Text(text)]),
    ]));
    list.push(Element(div, vec![(class, s!("detail-container")), (id, s!(_id, "-detail"))], content.map_to(|node| {
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

pub fn codegen<P: AsRef<std::path::Path>>(inserts: &mut Inserts, page_path: P) {
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

    let home_major = tile_columns(home_major).collect();

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

    add_insert! {
        inserts:
        "<!--{{codegen-home-major}}-->" => render_nodes(home_major)
        "<!--{{codegen-home-fragments}}-->" => render_nodes(home_sides)
        "<!--{{codegen-tool-fragments}}-->" => render_nodes(tools_fragments)
        "<!--{{codegen-tool-plain}}-->" => render_nodes(tools_plains)
        "<!--{{codegen-home-include-data}}-->" => include_data(GlobalData::Home)
        "<!--{{codegen-tool-include-data}}-->" => include_data(GlobalData::Tool { tool: tool_data })
        "<!--{{codegen-legacy-buttons}}-->" => render_nodes(legacy_buttons)
    }
}
