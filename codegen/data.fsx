type _Map<'a> = (string * 'a) list

// Serialize
type ToolIndexItem = {
    single: bool
    title: string
    list: string list
    cross_list: string list
}

type ToolIndex = _Map<ToolIndexItem>

// Serialize
type ToolCategoryItem = {
    title: string
    list: string list
}

type ToolCategory = _Map<ToolCategoryItem>

type ToolAll = _Map<string>

type ToolCross = _Map<_Map<string>>

// Serialize
type ToolData = {
    index: ToolIndex
    category: ToolCategory
    all: ToolAll
    cross: ToolCross
}

// Serialize
// #[serde(tag = "page_type")]
// #[serde(rename_all = "snake_case")]
// #[allow(clippy::large_enum_variant)]
type GlobalData =
    | GlobalData__Home
    | GlobalData__Tool of (* tool: *) ToolData
