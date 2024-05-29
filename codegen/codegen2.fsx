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
