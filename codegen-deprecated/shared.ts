export type ToolIndexType = Record<string, {
    title: string
    list: string[]
    cross_list: string[]
}>;

export type ToolCategoryType = Record<string, {
    title: string
    list: string[]
}>;

export type ToolAllType = Record<string, string>;

export type ToolCrossType = Record<string, Record<string, string>>;

export type ToolData = {
    index: ToolIndexType;
    category: ToolCategoryType;
    all: ToolAllType;
    cross: ToolCrossType;
};

export type GlobalData = {
    page_type: "home";
} | {
    page_type: "tool";
    tool: ToolData;
};
