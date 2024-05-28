#r "nuget: FSharp.Json"
open FSharp.Json

type ElementTag = ElementTag of string

type AttrKey = AttrKey of string

type Node =
    | Text of string
    | HtmlText of string
    | Element of ElementTag * (AttrKey * string) list * Node list

let Attr (key: string) (value: string) =
    (AttrKey key, value)

let El (tag: string) (attr: (AttrKey * string) list) (childs: Node list) =
    Element (ElementTag tag, attr, childs)

let E_div = El "div"
let A_class = Attr "class"
let A_id = Attr "id"

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

let Option_unwrap_or (or_val: 'a) (option: 'a option) =
    match option with
    | Some v -> v
    | None -> or_val

let Option_unwrap_or_else (or_fun: unit -> 'a) (option: 'a option) =
    match option with
    | Some v -> v
    | None -> or_fun ()

let Option_to_list (option: 'a option) =
    match option with
    | Some v -> [v]
    | None -> []

let clearfix =
    E_div [A_class "clearfix"] []

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

// printfn Json.serialize

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

// #[derive(Clone, Debug, Deserialize)]
type Config = {
    lang: string option;
    // #[serde(default)]
    css: string list;
    // #[serde(default)]
    js: string list;
    // #[serde(default)]
    minified_css: string list;
    // #[serde(default)]
    minified_js: string list;
}

// #[derive(Clone, Debug, Serialize)]
type Resource = {
    path: string;
    integrity: string option;
}

type JsonValue = unit
type _Map<'a> = Map<string, 'a>

// #[derive(Clone, Debug, Serialize)]
type Boot = {
    lang: string option;
    css: Resource list;
    js: Resource list;
    minified_css: string list;
    minified_js: string list;
    includes: _Map<JsonValue>;
    head: string;
    body: string;
}
