let unreachable (msg: string) = raise (System.Exception $"__unreachable: {msg}")

type ElementTag = ElementTag of string

type AttrKey = AttrKey of string

type Node =
    | Text of string
    | HtmlText of string
    | Element of ElementTag * (AttrKey * string) list * Node list

let Attr (key: string) (value: string) = (AttrKey key, value)

let El (tag: string) (attrs: (AttrKey * string) list) (childs: Node list) = Element (ElementTag tag, attrs, childs)

let el = El "a" [Attr "href" "d"; Attr "k" "v"] [Text "content"]

type ToolLinkTitleType =
    | Official = 1
    | Link = 2
    | PageLink = 3
    | Unofficial = 4

type ToolLinkTitle =
    | ToolLinkTitle__Type of ToolLinkTitleType
    | ToolLinkTitle__Text of string

// #[serde(rename_all = "kebab-case")]
type ToolLinkType =
    | ToolLinkType__R2
    | ToolLinkType__Mirror

// #[serde(rename_all = "kebab-case")]
type ToolLinkIcon =
    | ToolLinkIcon__Link
    | ToolLinkIcon__Download
    member self.as_str =
        match self with
        | ToolLinkIcon__Link -> "link"
        | ToolLinkIcon__Download -> "download"

type ToolLink = {
    title: ToolLinkTitle;
    link_type: ToolLinkType;
    link: string;
    icon: ToolLinkIcon;
}

// #[serde(rename_all = "kebab-case")]
type TileFont =
    | H1
    | H2
    | H3
    | H4
    | H5
    member self.into_tag =
        match self with
        | H1 -> ElementTag "h1"
        | H2 -> ElementTag "h2"
        | H3 -> ElementTag "h3"
        | H4 -> ElementTag "h4"
        | H5 -> ElementTag "h5"

// #[serde(rename_all = "kebab-case")]
type TileAction =
    | Side
    | Tool
    | Category
    | Copy
    | Path
    | Subdomain
    | R
    | R2
    | None

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

type CategoryGroup = {
    title: string;
    content: Tile list;
}

type CategoryTab = {
    title: string;
    content: CategoryGroup list;
}

type Category = {
    tool: CategoryTab;
    link: CategoryTab;
}

let tool_link_prefix (t: ToolLinkType) =
    match t with
    | ToolLinkType__R2 -> "//r.ldt.pc.wiki/r2/"
    | ToolLinkType__Mirror -> "//r.ldt.pc.wiki/mirror/"

let nbsp = Text " "

let s_class (class_name: string) = [Attr "class" class_name]

let s_id (id: string) = [Attr "id" id]

let s_text (content: string) = [Text content]

let svg_icon (icon: string) (class_name: string) =
    El "svg" [Attr "class" class_name] [
        El "use" [Attr "href" $"#icon-{icon}"] []
    ]

let svg_icon_default (icon: string) = svg_icon icon "icon"

let tool_website_type (t: ToolLinkTitleType) =
    match t with
    | ToolLinkTitleType.Official -> "官方网站"
    | ToolLinkTitleType.Link -> "首发链接"
    | ToolLinkTitleType.PageLink -> "网页链接"
    | ToolLinkTitleType.Unofficial -> "<b>非官方</b>页面"
    | _ -> unreachable "num_enum"

let tool_link_title (title: ToolLinkTitle) = 
    match title with 
    | ToolLinkTitle__Text title -> title
    | ToolLinkTitle__Type t -> tool_website_type t

// TODO destructuring assignment like in rust
let tool_link (t: ToolLink) =
    El "span" [] [
        El "a" [
            Attr "target" "_blank"
            Attr "class" "link"
            Attr "href" $"{(tool_link_prefix t.link_type)}{t.link}"
        ] [
            svg_icon_default t.icon.as_str
            nbsp
            Text (tool_link_title t.title)
        ]
    ]

let category_group (t: CategoryGroup) = Text "todo"

let category_tab (content: CategoryGroup list) =
    let content = Seq.map category_group content
    // TODO vec op more proper alt
    let mutable left = []
    let mutable right = []
    // TODO if let alt
    // TODO iterator alt
    [
        El "div" (s_class "category-tab-part") left
        El "div" (s_class "category-tab-part") right
    ]

let category (t: Category) =
    [
        El "div" (s_class "category-title") [
            El "div" [Attr "id" "tool-button"; Attr "class" "selected"] (s_text t.tool.title)
            El "div" (s_id "link-button") (s_text t.link.title)
        ]
        El "div" (s_class "category-content") [
            El "div" (s_id "tool-list") (category_tab t.tool.content)
            El "div" [Attr "id" "link-list"; Attr "style" "opacity: 0; pointer-events: none"] (category_tab t.link.content)
        ]
    ]
