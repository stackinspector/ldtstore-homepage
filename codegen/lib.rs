#![allow(non_camel_case_types)]

type ByteString = String;

use aho_corasick::AhoCorasick;
type Map<T> = indexmap::IndexMap<ByteString, T>;
type Inserts = Vec<(ByteString, ByteString)>;

use concat_string::concat_string as cs;

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

use std::{fs::{self, OpenOptions, read_to_string as load}, path::{Path, PathBuf}, io::Write, sync::OnceLock};

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
    let head = load(base_path.join(".git/HEAD")).unwrap();
    let head = head.split('\n').next().unwrap();
    let head = head.split("ref: ").nth(1).unwrap();
    let commit = fs::read(base_path.join(".git").join(head)).unwrap();
    String::from_utf8(commit[0..7].to_vec()).unwrap()
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
                        "<!--{{", file_name, "}}-->" => load(entry.path()).unwrap()
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
        Config::Dev => load(full_path).unwrap(),
    }
}

fn compile_script<P: AsRef<Path>>(full_path: P) -> String {
    match args().config {
        Config::Prod => call_esbuilld_cli(full_path, &[
            "--minify-whitespace",
            "--minify-syntax",
            "--format=iife",
            "--target=es6",
        ]),
        Config::Dev => call_esbuilld_cli(full_path, &[
            "--format=iife",
            "--target=es6",
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

    let commit: String = read_commit(&base_path);
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
    let dest_page_base = dest_path.join("page");

    fs::create_dir_all(&dest_code_base).unwrap();
    fs::create_dir_all(&dest_page_base).unwrap();

    let replace_html = |path: PathBuf| {
        global_replacer.replace(&insert(&load(path).unwrap(), inserts.clone()))
    };

    fn write_json<D: serde::Serialize>(value: &D, dest: PathBuf) {
        let mut file = OpenOptions::new().create_new(true).write(true).open(dest).unwrap();
        serde_json::to_writer(&mut file, value).unwrap();
    }

    let mut code_info = Map::new();

    for entry in fs::read_dir(&dynamic_code_base).unwrap() {
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
            let mut file = OpenOptions::new().create_new(true).write(true).open(dest).unwrap();
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
                path: s!(config.assert(), "/code/", dest_name),
                integrity: Some(integrity.output()),
            });
        }
    }

    for entry in fs::read_dir(&dynamic_page_base).unwrap() {
        let entry = entry.unwrap();
        if entry.metadata().unwrap().is_dir() {
            let path = entry.path();
            let page_name = entry.file_name();
            let page_name = page_name.to_str().unwrap();
            let lconfig: jsldr::Config = serde_yaml::from_reader(fs::File::open(path.join("config.yml")).unwrap()).unwrap();
            let head = replace_html(path.join("head.html"));
            let body = replace_html(path.join("body.html"));
            // TODO warn when head or body include <link> <style> <script>
            // allow control-used <style>?
            let boot: jsldr::Boot<crate::data::GlobalData> = jsldr::Boot {
                lang: lconfig.lang,
                css: lconfig.css.map_to(|file| code_info.get(&file).unwrap().clone()),
                minified_css: lconfig.minified_css.map_to(|file| minifieds.get(&file).unwrap().clone()),
                minified_js: lconfig.minified_js.map_to(|file| minifieds.get(&file).unwrap().clone()),
                js: lconfig.js.map_to(|file| code_info.get(&file).unwrap().clone()),
                includes: includes.get(page_name).cloned(),
                head,
                body,
            };
            write_json(&boot, dest_page_base.join(cs!(page_name, ".boot.json")));
            let dest = dest_page_base.join(cs!(page_name, ".html"));

            let (comment_l, comment_r) = FileType::Html.comment();
            let mut file = OpenOptions::new().create_new(true).write(true).open(dest).unwrap();
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
            w!("\n\n");

            if let Some(lang) = boot.lang {
                w!("<html lang=\"");
                w!(lang);
                w!("\">\n");
            } else {
                w!("<html>\n");
            }
            w!("<head>\n");
            w!(boot.head);
            for css_content in boot.minified_css.iter() {
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
            w!(boot.body);
            if let Some(includes) = boot.includes {
                w!("<script>window.__DATA__=");
                serde_json::to_writer(&mut file, &includes).unwrap();
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
            w!("</body>\n</html>\n");
        }
    }
}

// TODO build frameworks
// TODO icp-record auto dispatch
