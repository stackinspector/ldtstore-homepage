let unreachable (msg: string) = raise (System.Exception $"__unreachable: {msg}")
type _Map<'a> = (string * 'a) list

// Deserialize
// #[serde(rename_all = "kebab-case")]
type PageType = 
    | PageType__Home
    | PageType__Tool

// Deserialize
// #[serde(rename_all = "kebab-case")]
type InputType =
    | InputType__Major
    | InputType__Sides
    | InputType__Tools
    | InputType__Category

// Deserialize
// #[serde(rename_all = "kebab-case")]
type TileFont =
    | TileFont__H1
    | TileFont__H2
    | TileFont__H3
    | TileFont__H4
    | TileFont__H5
    member self.into_tag =
        match self with
        | TileFont__H1 -> "h1"
        | TileFont__H2 -> "h2"
        | TileFont__H3 -> "h3"
        | TileFont__H4 -> "h4"
        | TileFont__H5 -> "h5"

// Deserialize
// #[serde(rename_all = "kebab-case")]
type TileAction =
    | TileAction__Side
    | TileAction__Tool
    | TileAction__Category
    | TileAction__Copy
    | TileAction__Path
    | TileAction__Subdomain
    | TileAction__R
    | TileAction__R2
    | TileAction__None

// Deserialize
type Tile = {
    tile: string option; // prev no option
    font: TileFont option;
    action: TileAction;
    icon_type: string option;
    name: string;
    title: string option;
    icon: string option;
    path: string option;
    subdomain: string option;
}

type TileColumns = Tile list list

// Deserialize
type TileGridMiddle = {
    title: string;
    content: Tile list;
}

// Deserialize
type TileGrids = {
    left: Tile list;
    middle: TileGridMiddle list;
}

// Deserialize
type CategoryGroup = {
    title: string;
    content: Tile list;
}

// Deserialize
type CategoryTab = {
    title: string;
    content: CategoryGroup list;
}

// TODO Vec<CategoryTab>
// Deserialize
type Category = {
    tool: CategoryTab;
    link: CategoryTab;
}

// Deserialize
type TileTemplateInner = {
    tile: string;
    font: TileFont option;
    action: TileAction;
    icon_type: string option;
}

// Deserialize
// #[serde(untagged)]
type TileTemplateTiles =
    | TileTemplateTiles__WithoutTitle of string list
    | TileTemplateTiles__WithTitle of _Map<string>

// Deserialize
type TileTemplate = {
    template: TileTemplateInner;
    tiles: TileTemplateTiles;
}

// Deserialize
type Side = {
    name: string;
    title: string;
    text: string option;
    text_small: bool option;
    tiles: Tile list option;
    templated: TileTemplate option;
}

// Deserialize_repr
// #[repr(u8)]
type ToolLinkTitleType =
    | Official = 1
    | Link = 2
    | PageLink = 3
    | Unofficial = 4

let tool_website_type (t: ToolLinkTitleType) =
    match t with
    | ToolLinkTitleType.Official -> "官方网站"
    | ToolLinkTitleType.Link -> "首发链接"
    | ToolLinkTitleType.PageLink -> "网页链接"
    | ToolLinkTitleType.Unofficial -> "<b>非官方</b>页面"
    | _ -> unreachable "num_enum"

// Deserialize
// #[serde(untagged)]
type ToolLinkTitle =
    | ToolLinkTitle__Type of ToolLinkTitleType
    | ToolLinkTitle__Text of string

// Deserialize
// #[serde(rename_all = "kebab-case")]
type ToolLinkType =
    | ToolLinkType__R2
    | ToolLinkType__Mirror
    member self.as_str =
        match self with
        | ToolLinkType__R2 -> "r2"
        | ToolLinkType__Mirror -> "mirror"

let tool_link_prefix (t: ToolLinkType) =
    match t with
    | ToolLinkType__R2 -> "//r.ldt.pc.wiki/r2/"
    | ToolLinkType__Mirror -> "//r.ldt.pc.wiki/mirror/"

// #[serde(rename_all = "kebab-case")]
type ToolLinkIcon =
    | ToolLinkIcon__Link
    | ToolLinkIcon__Download
    member self.as_str =
        match self with
        | ToolLinkIcon__Link -> "link"
        | ToolLinkIcon__Download -> "download"

let tool_icon_emoji (t: ToolLinkIcon) =
    match t with
    | ToolLinkIcon__Link -> "🔗"
    | ToolLinkIcon__Download -> "💾"

// Deserialize
// #[serde(rename_all = "kebab-case")]
type MirrorType =
    | MirrorType__Active
    | MirrorType__Locked
    | MirrorType__Synced
    member self.as_str =
        match self with
        | MirrorType__Active -> "active"
        | MirrorType__Locked -> "locked"
        | MirrorType__Synced -> "synced"

// Deserialize
type ToolLink = {
    title: ToolLinkTitle;
    link_type: ToolLinkType;
    link: string;
    icon: ToolLinkIcon;
}

// Deserialize
type ToolLinks = {
    website: ToolLinkTitle option;
    websites: _Map<ToolLinkTitle> option;
    websites_tile: _Map<ToolLinkTitle> option;
    websites_tile_template: TileTemplateInner option;
    downloads: _Map<string> option;
    downloads_groups: _Map<_Map<string>> option;
    mirror: MirrorType option;
    mirrors: _Map<string> option;
    columns: bool option;
}

// Deserialize
type Tool = {
    name: string;
    title: string;
    no_icon: bool option;
    icon: string option;
    description: string option; // prev no option
    notice: string option;
    category: string list option;
    cross: string list option;
    keywords: string option;
    cross_notice: _Map<string> option;
    // #[serde(flatten)]
    links: ToolLinks;
}

// Deserialize
type ToolGroup = {
    name: string option;
    title: string option;
    cross_notice: string option;
    no_icon: bool option;
    list: Tool list;
}

// Deserialize
type ClassicButton = {
    target: string option;
    text: string;
}

// Deserialize
type ClassicText = {
    footer: bool;
    text: string;
}

// Deserialize
// #[serde(tag = "type")]
// #[serde(rename_all = "kebab-case")]
type ClassicSubNode =
    | ClassicSubNode__Button of ClassicButton
    | ClassicSubNode__Text of ClassicText

// Deserialize
type ClassicList = {
    id: string;
    text: string;
    content: ClassicSubNode list;
}

// Deserialize
// #[serde(tag = "type")]
// #[serde(rename_all = "kebab-case")]
type ClassicRootNode =
    | ClassicRootNode__Button of ClassicButton
    | ClassicRootNode__Text of ClassicText
    | ClassicRootNode__List of ClassicList
