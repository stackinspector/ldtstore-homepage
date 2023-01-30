use serde::Serialize;
use crate::{ByteString, Map};

pub type ToolIndex = Map<ToolIndexItem>;

#[derive(Clone, Debug, Serialize)]
pub struct ToolIndexItem {
    pub title: ByteString,
    pub list: Vec<ByteString>,
    pub cross_list: Vec<ByteString>,
}

pub type ToolCategory = Map<ToolCategoryItem>;

#[derive(Clone, Debug, Serialize)]
pub struct ToolCategoryItem {
    pub title: ByteString,
    pub list: Vec<ByteString>,
}

pub type ToolAll = Map<ByteString>;

pub type ToolCross = Map<Map<ByteString>>;

#[derive(Clone, Debug, Serialize)]
pub struct ToolData {
    pub index: ToolIndex,
    pub category: ToolCategory,
    pub all: ToolAll,
    pub cross: ToolCross,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "page_type")]
#[serde(rename_all = "snake_case")]
pub enum GlobalData {
    Home,
    Tool { tool: ToolData }
}
