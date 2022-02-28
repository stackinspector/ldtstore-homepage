export type ToolIndexType = Record<string, {
    title: string
    list: string[]
    cross_list: string[]
}>

export type ToolAllType = Record<string, string>

export type ToolCrossType = Record<string, Record<string, string>>

export type GlobalData = {
    page_type: "home";
} | {
    page_type: "tool";
    tool: {
        index: ToolIndexType;
        all: ToolAllType;
        cross: ToolCrossType;
    };
};
