use serde::Deserialize;
use serde_repr::Deserialize_repr;
use crate::{ByteString, Map};

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PageType {
    Home,
    Tool,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum InputType {
    Major,
    Sides,
    Tools,
    Category,
}

pub type TileColumns = Vec<Vec<Tile>>;

#[derive(Clone, Debug, Deserialize)]
pub struct TileGrids {
    pub left: Vec<Tile>,
    pub middle: Vec<TileGridMiddle>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct TileGridMiddle {
    pub title: ByteString,
    pub content: Vec<Tile>,
}

// TODO Vec<CategoryTab>
#[derive(Clone, Debug, Deserialize)]
pub struct Category {
    pub tool: CategoryTab,
    pub link: CategoryTab,
}

#[derive(Clone, Debug, Deserialize)]
pub struct CategoryTab {
    pub title: ByteString,
    pub content: Vec<CategoryGroup>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct CategoryGroup {
    pub title: ByteString,
    pub content: Vec<Tile>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct Tile {
    pub tile: Option<ByteString>, // prev no option
    pub font: Option<TileFont>,
    pub action: TileAction,
    pub icon_type: Option<ByteString>,
    pub name: ByteString,
    pub title: Option<ByteString>,
    pub icon: Option<ByteString>,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TileFont {
    H1,
    H2,
    H3,
    H4,
    H5,
}

impl TileFont {
    pub fn into_tag(&self) -> lighthtml::ElementTag {
        use TileFont::*;
        use lighthtml::ElementTag::*;
        match self {
            H1 => h1,
            H2 => h2,
            H3 => h3,
            H4 => h4,
            H5 => h5,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TileAction {
    Side,
    Tool,
    Category,
    Copy,
    Href,
    R,
    R2,
    Home,
    None,
}

#[derive(Clone, Debug, Deserialize)]
pub struct TileTemplate {
    pub template: TileTemplateInner,
    pub tiles: TileTemplateTiles,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(untagged)]
pub enum TileTemplateTiles {
    WithoutTitle(Vec<ByteString>),
    WithTitle(Map<ByteString>),
}

#[derive(Clone, Debug, Deserialize)]
pub struct TileTemplateInner {
    pub tile: ByteString,
    pub font: Option<TileFont>,
    pub action: TileAction,
    pub icon_type: Option<ByteString>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct Side {
    pub name: ByteString,
    pub title: ByteString,
    pub text: Option<ByteString>,
    pub text_small: Option<bool>,
    pub tiles: Option<Vec<Tile>>,
    pub templated: Option<TileTemplate>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct ToolGroup {
    pub name: Option<ByteString>,
    pub title: Option<ByteString>,
    pub cross_notice: Option<ByteString>,
    pub list: Vec<Tool>,
}

#[derive(Clone, Copy, Debug, Deserialize_repr)]
#[repr(u8)]
pub enum ToolLinkTitleType {
    Official = 1,
    Link = 2,
    PageLink = 3,
    Unofficial = 4,
    OfficialLimited = 5,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ToolLinkType {
    R2,
    Mirror,
}

impl ToolLinkType {
    pub fn as_str(&self) -> &'static str {
        use ToolLinkType::*;
        match self {
            R2 => "r2",
            Mirror => "mirror",
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ToolLinkIcon {
    Link,
    Download,
}

impl ToolLinkIcon {
    pub fn as_str(&self) -> &'static str {
        use ToolLinkIcon::*;
        match self {
            Link => "link",
            Download => "download",
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]

pub enum MirrorType {
    Active,
    Locked,
    Synced,
}

impl MirrorType {
    pub fn as_str(&self) -> &'static str {
        use MirrorType::*;
        match self {
            Active => "active",
            Locked => "locked",
            Synced => "synced",
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct Tool {
    pub name: ByteString,
    pub title: ByteString,
    pub icon: Option<ByteString>,
    pub description: Option<ByteString>, // prev no option
    pub notice: Option<ByteString>,
    pub category: Option<Vec<ByteString>>,
    pub cross: Option<Vec<ByteString>>,
    pub keywords: Option<ByteString>,
    pub cross_notice: Option<Map<ByteString>>,
    #[serde(flatten)]
    pub links: ToolLinks,
}

// #[derive(Clone, Debug, Deserialize)]
// pub struct ToolInner {
//     #[serde(flatten)]
//     pub inner: ToolInner,
// }

// #[derive(Clone, Debug, Deserialize)]
// pub struct ToolCross {
//     #[serde(flatten)]
//     pub cross: ToolCross,
// }

#[derive(Clone, Debug, Deserialize)]
pub struct ToolLinks {
    pub website: Option<ToolLinkTitle>,
    pub websites: Option<Map<ToolLinkTitle>>,
    pub downloads: Option<Map<ByteString>>,
    pub mirror: Option<MirrorType>,
    pub mirrors: Option<Map<ByteString>>,
    pub columns: Option<bool>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct ToolLink {
    pub title: ToolLinkTitle,
    pub link_type: ToolLinkType,
    pub link: ByteString,
    pub icon: ToolLinkIcon,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(untagged)]
pub enum ToolLinkTitle {
    Type(ToolLinkTitleType),
    Text(ByteString),
}

pub const fn tool_website_type(t: ToolLinkTitleType) -> &'static str {
    use ToolLinkTitleType::*;
    match t {
        Official => "官方网站",
        Link => "首发链接",
        PageLink => "网页链接",
        Unofficial => "<b>非官方</b>页面",
        OfficialLimited => "官方网站（国内无法访问）",
    }
}

// #[derive(Clone, Debug)]
// pub struct ProcessedToolGroups {
//     pub tools: Map<Tool>,
//     pub tool_data: ToolData,
// }

pub const fn tool_link_prefix(t: ToolLinkType) -> &'static str {
    use ToolLinkType::*;
    match t {
        R2 => "//r.ldtstore.com.cn/r2/",
        Mirror => "{{MIRROR}}",
    }
}

pub const fn tool_icon_emoji(t: ToolLinkIcon) -> &'static str {
    use ToolLinkIcon::*;
    match t {
        Link => "🔗",
        Download => "💾",
    }
}
