use serde::{Serialize, Deserialize};

#[derive(Clone, Debug, Deserialize)]
pub struct Config {
    pub lang: Option<String>,
    #[serde(default)]
    pub css: Vec<String>,
    #[serde(default)]
    pub js: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct Boot<D> {
    pub lang: Option<String>,
    pub css: Vec<Resource>,
    pub js: Vec<Resource>,
    pub includes: Option<D>, // TODO only __DATA__ and one type?
    pub head: String,
    pub body: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct Resource {
    pub path: String,
    pub integrity: String, // TODO option
}
