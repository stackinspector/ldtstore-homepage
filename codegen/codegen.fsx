#r "nuget: FSharp.Json"
open FSharp.Json

let unreachable (msg: string) = raise (System.Exception $"__unreachable: {msg}")

let Option_unwrap_or (or_val: 'a) (option: 'a option) =
    match option with
    | Some v -> v
    | None -> or_val

let Option_unwrap_or_else (or_fun: unit -> 'a) (option: 'a option) =
    match option with
    | Some v -> v
    | None -> or_fun ()

type ElementTag = ElementTag of string

type AttrKey = AttrKey of string

type Node =
    | Text of string
    | HtmlText of string
    | Element of ElementTag * (AttrKey * string) list * Node list

let Attr (key: string) (value: string) =
    (AttrKey key, value)

let El (tag: string) (attrs: (AttrKey * string) list) (childs: Node list) =
    Element (ElementTag tag, attrs, childs)

#load "config.fsx"
open Config

let nbsp = Text " "

let E_div = El "div"
let A_class = Attr "class"
let A_id = Attr "id"

let s_class (class_name: string) = [A_class class_name]

let s_id (id: string) = [A_id id]

let s_text (content: string) = [Text content]

let clearfix =
    E_div [A_class "clearfix"] []

let svg_icon (icon: string) (class_name: string) =
    El "svg" [A_class class_name] [
        El "use" [Attr "href" $"#icon-{icon}"] []
    ]

let svg_icon_default (icon: string) = svg_icon icon "icon"

let tool_link_title (title: ToolLinkTitle) = 
    match title with 
    | ToolLinkTitle__Text title -> title
    | ToolLinkTitle__Type t -> tool_website_type t

let tile_inner (t: Tile) (is_category: bool) =
    let class_name = if is_category then "category-item" else $"tile {t.tile |> Option.get}"
    
    let icon_type =
        t.icon_type
        |> Option.map (fun s -> $"-{s}")
        |> Option_unwrap_or ""

    let inner =
        El "img" [
            Attr "src" $"{{ASSERT}}/image/icon{t.icon_type}/{(t.icon |> Option_unwrap_or t.name)}.webp"
            // @if let (Some(title) = title.clone()) { (alt, title) }
        ] (if is_category then (
            t.title
            |> Option.map (fun title->
                El "span" [] [Text title])
        ) else (
            match (t.font, t.title) with
            | Some font, Some title ->
                Some (El font.into_tag [] [Text title])
            | _ -> None
        ) |> Option.toList)

    let link (location: string) =
        El "a" [
            Attr "target" "_blank"
            A_class "tile-link"
            Attr "href" location
        ] [
            E_div [A_class class_name] [inner]
        ]

    let call (func: string) =
        E_div [
            A_class class_name
            Attr "onclick" $"{func}({t.name})"
        ] [inner]

    let none () =
        E_div [A_class class_name] [inner]

    match t.action with
    | TileAction__Side -> call "side"
    | TileAction__Tool -> call "tool"
    | TileAction__Category -> call "category"
    | TileAction__Copy -> call "copy"
    | TileAction__Path -> call (t.path |> Option_unwrap_or $"/{t.name}/")
    | TileAction__Subdomain -> link $"//{t.subdomain |> Option.get}.pc.wiki/"
    | TileAction__R -> link $"//r.ldt.pc.wiki/r/{t.name}/"
    | TileAction__R2 -> link $"//r.ldt.pc.wiki/r2/{t.name}/"
    | TileAction__None -> none ()

let tile (input: Tile) =
    tile_inner input false

let tile_columns(input: TileColumns) =
    input
    |> List.map (fun o -> E_div [A_class "tile-column"] (o |> List.map tile))

let major_fragment (inner: Node list) (template_id: string) =
    El "template" [A_id $"major-{template_id}"] (inner |> List.append [clearfix])

// TODO destructuring assignment like in rust
let tool_link (t: ToolLink) =
    El "span" [] [
        El "a" [
            Attr "target" "_blank"
            A_class "link"
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
        E_div (s_class "category-tab-part") left
        E_div (s_class "category-tab-part") right
    ]

let category (t: Category) =
    [
        E_div (s_class "category-title") [
            E_div [A_id "tool-button"; A_class "selected"] (s_text t.tool.title)
            E_div (s_id "link-button") (s_text t.link.title)
        ]
        E_div (s_class "category-content") [
            E_div (s_id "tool-list") (category_tab t.tool.content)
            E_div [A_id "link-list"; Attr "style" "opacity: 0; pointer-events: none"] (category_tab t.link.content)
        ]
    ]

let example_tile: Tile = {
    tile = Some "l2";
    font = Some TileFont__H3;
    action = TileAction__Tool;
    name = "doc";
    icon = Some "review";
    title = Some "测试文档";
    icon_type = None;
    path = None;
    subdomain = None;
}

example_tile
|> tile
|> Json.serialize
|> printfn "%s"
