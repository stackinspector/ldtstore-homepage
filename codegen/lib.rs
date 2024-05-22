#![allow(non_camel_case_types)]

type ByteString = String;
type JsonValue = serde_json::Value;

use aho_corasick::AhoCorasick;
type Map<T> = indexmap::IndexMap<ByteString, T>;
type Inserts = Vec<(ByteString, ByteString)>;

use foundations::concat_string as cs;

#[macro_export]
macro_rules! s {
    () => {
        $crate::ByteString::from("")
    };
    ($s:expr) => {
        $crate::ByteString::from($s)
    };
    ($($s:expr),+) => {
        $crate::ByteString::from($crate::cs!($($s),+))
    };
}

#[macro_export]
macro_rules! add_insert {
    ($insert:ident: $($($s1:expr),+ => $($s2:expr),+)*) => {
        $($insert.push(($crate::s!($($s1),+), $crate::s!($($s2),+)));)*
    };
}

fn insert(input: &str, inserts: Inserts) -> String {
    let (patterns, replaces): (Vec<_>, Vec<_>) = inserts.into_iter().unzip();
    AhoCorasick::new(patterns).unwrap().replace_all(input, &replaces)
}

struct GlobalReplacer<const N: usize> {
    replacer: AhoCorasick,
    replaces: [&'static str; N],
}

impl<const N: usize> GlobalReplacer<N> {
    fn build(patterns: [&'static str; N], replaces: [&'static str; N]) -> GlobalReplacer<N> {
        GlobalReplacer { replacer: AhoCorasick::new(patterns).unwrap(), replaces }
    }

    fn replace(&self, input: &str) -> String {
        self.replacer.replace_all(input, &self.replaces)
    }
}

pub mod util;
pub mod config;
pub mod data;
pub mod jsldr;
pub mod codegen;
use util::{IndexMapFirstInsert, VecMap};
use codegen::codegen;

use std::{fs, path::{Path, PathBuf}, io::Write, sync::OnceLock};

#[derive(Clone, Copy)]
pub enum Config {
    Prod,
    Dev,
}

impl Config {
    const fn name(&self) -> &'static str {
        use Config::*;
        match self {
            Prod => "Prod",
            Dev => "Dev",
        }
    }

    const fn assert(&self) -> &'static str {
        use Config::*;
        match self {
            Prod => "//s0.ldt.pc.wiki",
            Dev => "..",
        }
    }
}

impl core::str::FromStr for Config {
    type Err = &'static str;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(match s {
            "prod" => Config::Prod,
            "dev" => Config::Dev,
            _ => return Err("error parsing config type")
        })
    }
}

#[derive(Clone, Copy)]
pub enum FileType {
    Html,
    Css,
    Script,
}
use FileType::*;

impl FileType {
    fn parse(name: &str) -> Self {
        if name.ends_with(Html.as_src()) {
            Html
        } else if name.ends_with(Css.as_src()) {
            Css
        } else if name.ends_with(Script.as_src()) {
            Script
        } else {
            unreachable!()
        }
    }

    fn as_src(&self) -> &'static str {
        match self {
            Html => "html",
            Css => "css",
            Script => "ts",
        }
    }

    fn as_dest(&self) -> &'static str {
        match self {
            Html => "html",
            Css => "css",
            Script => "js",
        }
    }

    fn comment(&self) -> (&'static str, &'static str) {
        match self {
            Html => ("<!--", "-->"),
            Css | Script => ("/*", "*/"),
        }
    }
}

const COPYRIGHT_L: &str = "
  Copyright (c) 2021-2023 CarrotGeball and stackinspector. All rights reserved. MIT license.
  Source: https://github.com/stackinspector/ldtstore-homepage
  Commit (content): ";

const COPYRIGHT_R: &str = concat!("
  Commit (codegen): ", env!("GIT_HASH"), "\n");

#[derive(argh::FromArgs)]
#[argh(description = "")]
pub struct Args {
    /// dest wwwroot path
    #[argh(option, short = 'd')]
    dest_path: PathBuf,
    /// source path (default .)
    #[argh(option, short = 's', default = "Default::default()")]
    base_path: PathBuf,
    /// mode
    #[argh(option, short = 'c')]
    config: Config,
    /// esbuild binary path
    #[argh(option)]
    esbuild_path: Option<PathBuf>,
}

static ARGS: OnceLock<Args> = OnceLock::new();

fn args<'a>() -> &'a Args {
    ARGS.get().unwrap()
}

fn read_commit<P: AsRef<Path>>(base_path: P) -> String {
    let base_path = base_path.as_ref();
    let head = load(base_path.join(".git/HEAD"));
    let head = head.split('\n').next().unwrap();
    let head = head.split("ref: ").nth(1).unwrap();
    let commit = fs::read(base_path.join(".git").join(head)).unwrap();
    String::from_utf8(commit[0..7].to_vec()).unwrap()
}

fn load<P: AsRef<Path>>(path: P) -> String {
    fs::read_to_string(path).unwrap()
}

fn load_yaml<D: serde::de::DeserializeOwned, P: AsRef<Path>>(path: P) -> D {
    serde_yaml::from_reader(fs::File::open(path).unwrap()).unwrap()
}

fn create<P: AsRef<Path>>(path: P) -> fs::File {
    fs::OpenOptions::new().create_new(true).write(true).open(path).unwrap()
}

fn create_json<D: serde::Serialize, P: AsRef<Path>>(value: &D, dest: P) {
    let mut file = create(dest);
    serde_json::to_writer(&mut file, value).unwrap();
}

fn build_static_inserts(fragment_path: PathBuf) -> (Inserts, Map<String>) {
    let mut inserts = Inserts::new();
    let mut minifieds = Map::new();
    for entry in fs::read_dir(fragment_path.clone()).unwrap() {
        let entry = entry.unwrap();
        if entry.metadata().unwrap().is_file() {
            let file_name = entry.file_name();
            let file_name = file_name.to_str().unwrap();
            match FileType::parse(file_name) {
                Html => {
                    add_insert! {
                        inserts:
                        "<!--{{", file_name, "}}-->" => load(entry.path())
                    }
                },
                Css => {
                    minifieds.first_insert(s!(file_name), minify_css(entry.path()));
                },
                Script => {
                    minifieds.first_insert(s!(file_name), compile_script(entry.path()));

                },
            }
        }
    }
    // add_insert! {
    //     res:
    //     "{{COMMIT}}" => commit
    // }
    (inserts, minifieds)
}

fn call_esbuilld_cli<P: AsRef<Path>>(full_path: P, cmdargs: &'static [&'static str]) -> String {
    use std::process::{Command, Stdio, Output};
    let mut command = if let Some(path) = &args().esbuild_path {
        Command::new(path)
    } else {
        Command::new("esbuild")
    };
    let Output { status, stdout, .. } = command
        .arg(full_path.as_ref())
        .args(cmdargs)
        .stdin(Stdio::null())
        .stderr(Stdio::inherit())
        .stdout(Stdio::piped())
        .output().unwrap();
    assert!(status.success());
    String::from_utf8(stdout).unwrap()
}

fn minify_css<P: AsRef<Path>>(full_path: P) -> String {
    match args().config {
        Config::Prod => call_esbuilld_cli(full_path, &[
            "--minify",
        ]),
        Config::Dev => load(full_path),
    }
}

fn compile_script<P: AsRef<Path>>(full_path: P) -> String {
    match args().config {
        Config::Prod => call_esbuilld_cli(full_path, &[
            "--minify-whitespace",
            "--minify-syntax",
            "--format=iife",
            "--target=es6",
            "--charset=utf8",
        ]),
        Config::Dev => call_esbuilld_cli(full_path, &[
            "--format=iife",
            "--target=es6",
            "--charset=utf8",
        ]),
    }
}

struct IntegrityBuilder {
    hasher: sha2::Sha512,
}

impl IntegrityBuilder {
    fn new() -> Self {
        Self { hasher: Default::default() }
    }

    fn update(&mut self, data: &[u8]) {
        use sha2::Digest;
        self.hasher.update(data);
    }

    fn output(self) -> String {
        use sha2::Digest;
        let hash = self.hasher.finalize();
        let mut integrity = "sha512-".to_owned();
        data_encoding::BASE64.encode_append(&hash, &mut integrity);
        integrity
    }
}

// fn complie_file(file_name: &str) -> (FileType, String) {}

fn firstname(file_name: &str, ty: FileType) -> &str {
    let b = file_name.as_bytes();
    let l = b.len() - ty.as_src().len() - 1;
    std::str::from_utf8(&b[..l]).unwrap()
}

pub fn build(args: Args) {
    let Args { dest_path, base_path, config, .. } = ARGS.get_or_init(|| args);

    let commit: String = read_commit(base_path);
    let (mut inserts, minifieds) = build_static_inserts(base_path.join("fragment"));
    let mut includes = Map::new();
    codegen(&mut inserts, &mut includes, base_path.join("page"));
    let global_replacer = GlobalReplacer::build(
        ["<a n ", "{{ASSERT}}"],
        [r#"<a target="_blank" "#, config.assert()],
    );

    let dynamic_base = base_path.join("dynamic");
    let dynamic_code_base = dynamic_base.join("code");
    let dynamic_page_base = dynamic_base.join("page");
    let dest_code_base = dest_path.join("code");
    let dest_page_boot_base = dest_path.join("page-boot");

    fs::create_dir_all(&dest_code_base).unwrap();
    fs::create_dir_all(&dest_page_boot_base).unwrap();

    let replace_html = |path: PathBuf| {
        global_replacer.replace(&insert(&load(path), inserts.clone()))
    };

    let mut code_info = Map::new();

    for entry in fs::read_dir(dynamic_code_base).unwrap() {
        let entry = entry.unwrap();
        if entry.metadata().unwrap().is_file() {
            let path = entry.path();
            let file_name = entry.file_name();
            let file_name = file_name.to_str().unwrap();
            let ty = FileType::parse(file_name);
            let content = match ty {
                Css => minify_css(path),
                Script => compile_script(path),
                Html => unreachable!(),
            };
            let content = global_replacer.replace(&content);
            let dest_name = cs!(firstname(file_name, ty), "-", commit, ".", ty.as_dest());
            let dest = dest_code_base.join(&dest_name);

            let (comment_l, comment_r) = ty.comment();
            let mut file = create(dest);
            let mut integrity = IntegrityBuilder::new();
            macro_rules! w {
                ($s:expr) => {
                    file.write_all($s.as_bytes()).unwrap();
                    integrity.update($s.as_bytes());
                };
            }
            w!(comment_l);
            w!(COPYRIGHT_L);
            w!(commit);
            w!(COPYRIGHT_R);
            w!("  ");
            w!(config.name());
            w!(" build\n");
            w!(comment_r);
            w!("\n\n");
            w!(content);

            code_info.first_insert(s!(file_name), jsldr::Resource {
                path: cs!(config.assert(), "/code/", dest_name),
                integrity: Some(integrity.output()),
            });
        }
    }

    fn make_includes(data: Option<&data::GlobalData>) -> Map<JsonValue> {
        let mut includes = Map::new();
        if let Some(data) = data {
            includes.first_insert(s!("__DATA__"), serde_json::to_value(data).unwrap());
        }
        includes
    }

    #[derive(Clone, Debug, serde::Deserialize)]
    struct PageConfig {
        lang: Option<ByteString>,
        #[serde(default)]
        css: Vec<ByteString>,
        #[serde(default)]
        js: Vec<ByteString>,
        #[serde(default)]
        minified_css: Vec<ByteString>,
        #[serde(default)]
        minified_js: Vec<ByteString>,
        dest: Vec<Dest>,
    }

    #[derive(Clone, Debug, serde::Deserialize)]
    struct Dest {
        dir: ByteString,
        name: ByteString,
        reg: DomainReg,
    }

    #[derive(Clone, Debug, serde::Deserialize)]
    enum DomainReg {
        #[serde(rename = "none")]
        None,
        #[serde(rename = "pc.wiki")]
        PC_WIKI,
        #[serde(rename = "ldtstore.com.cn")]
        LDTSTORE_COM_CN,
    }

    impl DomainReg {
        fn icpreg(&self) -> Option<&'static str> {
            match self {
                DomainReg::None => None,
                DomainReg::PC_WIKI => Some("鲁ICP备2023022036号"),
                DomainReg::LDTSTORE_COM_CN => Some("鲁ICP备2021014114号"),
            }
        }

        fn replace_body(&self, body: &ByteString) -> ByteString {
            let replace = if let Some(icpreg) = self.icpreg() {
                cs!(
                    "<a target=\"_blank\" class=\"link hidden\" href=\"//beian.miit.gov.cn/\"><span>",
                    icpreg,
                    "</span></a>\n"
                )
            } else {
                String::new()
            };
            body.replace("<!--{{icpreg-static}}-->", &replace)
        }
    }

    for entry in fs::read_dir(&dynamic_page_base).unwrap() {
        let entry = entry.unwrap();
        if entry.metadata().unwrap().is_dir() {
            let path = entry.path();
            let page_name = entry.file_name();
            let page_name = page_name.to_str().unwrap();
            let lconfig: PageConfig = load_yaml(path.join("config.yml"));
            let head = replace_html(path.join("head.html"));
            let body = replace_html(path.join("body.html"));
            // TODO warn when head or body include <link> <style> <script>
            // allow control-used <style>?
            let boot = jsldr::Boot {
                lang: lconfig.lang,
                css: lconfig.css.map_to(|file| code_info.get(file.as_str()).unwrap().clone()),
                minified_css: lconfig.minified_css.map_to(|file| minifieds.get(file.as_str()).unwrap().clone()),
                minified_js: lconfig.minified_js.map_to(|file| minifieds.get(file.as_str()).unwrap().clone()),
                js: lconfig.js.map_to(|file| code_info.get(file.as_str()).unwrap().clone()),
                includes: make_includes(includes.get(page_name)),
                head,
                body,
            };
            create_json(&boot, dest_page_boot_base.join(cs!(page_name, "-", commit, ".boot.json")));

            for Dest { dir, name, reg } in lconfig.dest {
                fs::create_dir_all(dest_path.join(&dir)).unwrap();
                let dest = dest_path.join(dir).join(name);

                let (comment_l, comment_r) = FileType::Html.comment();
                let mut file = create(dest);
                macro_rules! w {
                    ($s:expr) => {
                        file.write_all($s.as_bytes()).unwrap();
                    };
                }
                w!(comment_l);
                w!(COPYRIGHT_L);
                w!(commit);
                w!(COPYRIGHT_R);
                w!("  ");
                w!(config.name());
                w!(" build\n");
                w!(comment_r);
                w!("\n\n<!DOCTYPE html>\n");

                if let Some(ref lang) = boot.lang {
                    w!("<html lang=\"");
                    w!(lang);
                    w!("\">\n");
                } else {
                    w!("<html>\n");
                }
                w!("<head>\n");
                w!(boot.head);
                for css_content in boot.minified_css.iter() {
                    // TODO one tag?
                    w!("<style>");
                    w!(css_content);
                    w!("</style>\n");
                }
                for jsldr::Resource { path, integrity } in boot.css.iter() {
                    w!("<link rel=\"stylesheet\" href=\"");
                    w!(path);
                    if let Some(integrity) = integrity {
                        w!("\" integrity=\"");
                        w!(integrity);
                    }
                    w!("\" crossorigin=\"anonymous\">\n");
                }
                w!("</head>\n<body>\n");
                w!(reg.replace_body(&boot.body));
                for (key, data) in boot.includes.iter() {
                    // TODO one tag?
                    w!("<script>window.");
                    w!(key);
                    w!("=");
                    serde_json::to_writer(&mut file, data).unwrap();
                    w!("</script>\n");
                }
                for js_content in boot.minified_js.iter() {
                    w!("<script>");
                    w!(js_content);
                    w!("</script>\n");
                }
                for jsldr::Resource { path, integrity } in boot.js.iter() {
                    w!("<script src=\"");
                    w!(path);
                    if let Some(integrity) = integrity {
                        w!("\" integrity=\"");
                        w!(integrity);
                    }
                    w!("\" crossorigin=\"anonymous\"></script>\n");
                }
                w!("</body>\n</html>");

                /*

                use foundations::vec_ext;
                use lighthtml::{*, prelude::*};
                macro_rules! text {
                    ($s:expr) => {
                        vec![Text($s)]
                    };
                }
                w!(&render_node(Element(E_HTML, vec_ext![
                    @if let (Some(ref lang) = boot.lang) {
                        (A_LANG, s!(lang))
                    }
                ], vec![
                    Element(E_HEAD, attr!{}, vec_ext![
                        Html(s!(&boot.head)),
                        @for (css_content in boot.minified_css.iter()) {
                            // TODO one tag?
                            Element(E_STYLE, attr!{}, text!(s!(css_content)))
                        },
                        @for (jsldr::Resource { path, integrity } in boot.css.iter()) {
                            Element(E_LINK, vec_ext![
                                (A_REL, s!("stylesheet")),
                                (A_HREF, s!(path)),
                                @if let (Some(integrity) = integrity) {
                                    (A_INTEGRITY, s!(integrity))
                                },
                                (A_CROSSORIGIN, s!("anonymous")),
                            ], vec![])
                        }
                    ]),
                    Element(E_BODY, attr!{}, vec_ext![
                        Html(reg.replace_body(&boot.body)),
                        @for ((key, data) in boot.includes.iter()) {
                            // TODO one tag?
                            Element(E_SCRIPT, attr!{}, text!(s!(
                                "window.",
                                key,
                                "=",
                                serde_json::to_string(data).unwrap()
                            )))
                        },
                        @for (js_content in boot.minified_js.iter()) {
                            Element(E_SCRIPT, attr!{}, text!(s!(js_content)))
                        },
                        @for (jsldr::Resource { path, integrity } in boot.js.iter()) {
                            Element(E_SCRIPT, vec_ext![
                                (A_HREF, s!(path)),
                                @if let (Some(integrity) = integrity) {
                                    (A_INTEGRITY, s!(integrity))
                                },
                                (A_CROSSORIGIN, s!("anonymous")),
                            ], vec![])
                        }
                    ]),
                ])));
            */

            }
        }
    }
}

// TODO build frameworks
