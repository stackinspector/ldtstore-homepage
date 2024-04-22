use serde::Serialize;
use crate::{JsonValue, Map};

#[derive(Clone, Debug, Serialize)]
pub struct Boot {
    pub lang: Option<String>,
    pub css: Vec<Resource>,
    pub js: Vec<Resource>,
    pub minified_css: Vec<String>,
    pub minified_js: Vec<String>,
    pub includes: Map<JsonValue>,
    pub head: String,
    pub body: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct Resource {
    pub path: String,
    pub integrity: Option<String>,
}
