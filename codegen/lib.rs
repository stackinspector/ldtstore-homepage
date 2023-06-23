#![allow(non_camel_case_types)]

use lighthtml::ByteString;
use aho_corasick::AhoCorasick;
type Map<T> = indexmap::IndexMap<ByteString, T>;
type Inserts = Vec<(ByteString, ByteString)>;

use concat_string::concat_string as cs;

#[macro_export]
macro_rules! s {
    ($s:expr) => {
        $crate::ByteString::from($s)
    };
    ($($s:expr),+) => {
        $crate::ByteString::from($crate::cs!($($s),+))
    }
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

pub mod config;
pub mod data;
pub mod codegen;
use codegen::codegen;

use std::{str::FromStr, fs::{self, OpenOptions, read_to_string as load}, path::{Path, PathBuf}, io::Write};

#[derive(Clone, Copy)]
pub enum Config {
    Default,
    Intl,
}

impl Config {
    const fn image(&self) -> &'static str {
        use Config::*;
        match self {
            Default => "//s0.ldtstore.com.cn",
            Intl => "//ldtstore-intl-asserts.pages.dev/image",
        }
    }

    const fn mirror(&self) -> &'static str {
        use Config::*;
        match self {
            Default => "//r.ldtstore.com.cn/mirror-cn/",
            Intl => "//r.ldtstore.com.cn/mirror-os/",
        }
    }
}

impl FromStr for Config {
    type Err = &'static str;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(match s {
            "default" => Config::Default,
            "intl" => Config::Intl,
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

fn read_commit<P: AsRef<Path>>(base_path: P) -> String {
    let base_path = base_path.as_ref();
    let head = load(base_path.join(".git/HEAD")).unwrap();
    let head = head.split('\n').next().unwrap();
    let head = head.split("ref: ").nth(1).unwrap();
    let commit = fs::read(base_path.join(".git").join(head)).unwrap();
    String::from_utf8(commit[0..7].to_vec()).unwrap()
}

fn build_static_inserts<P: AsRef<Path>>(base_path: P, config: Config, commit: String) -> Inserts {
    let fragment_path = base_path.as_ref().join("fragment");
    let mut res = Inserts::new();
    for entry in fs::read_dir(fragment_path.clone()).unwrap() {
        let entry = entry.unwrap();
        if entry.metadata().unwrap().is_file() {
            let file_name = entry.file_name();
            let file_name = file_name.to_str().unwrap();
            if file_name.ends_with(FileType::Css.as_src()) {
                add_insert! {
                    res:
                    "/*{{minified:", file_name, "}}*/" => minify_css(entry.path())
                }
            } else if file_name.ends_with(FileType::Script.as_src()) {
                add_insert! {
                    res:
                    "/*{{minified:", file_name, "}}*/" => compile_script(entry.path())
                }
            } else if (file_name == "footer.html") | (file_name == "footer-intl.html") {

            } else {
                add_insert! {
                    res:
                    "<!--{{", file_name, "}}-->" => load(entry.path()).unwrap()
                }
            }
        }
    }
    add_insert! {
        res:
        "<!--{{footer}}-->" => load(fragment_path.join(if matches!(config, Config::Intl) { "footer-intl.html" } else { "footer.html" })).unwrap()
        "{{COMMIT}}" => commit
    }
    res
}

fn call_esbuilld_cli<P: AsRef<Path>>(full_path: P, args: &'static [&'static str]) -> String {
    use std::process::{Command, Stdio, Output};
    let Output { status, stdout, .. } = Command::new("esbuild")
        .arg(full_path.as_ref())
        .args(args)
        .stdin(Stdio::null())
        .stderr(Stdio::inherit())
        .stdout(Stdio::piped())
        .output().unwrap();
    assert!(status.success());
    String::from_utf8(stdout).unwrap()
}

fn minify_css<P: AsRef<Path>>(full_path: P) -> String {
    call_esbuilld_cli(full_path, &[
        "--minify",
    ])
}

fn compile_script<P: AsRef<Path>>(full_path: P) -> String {
    call_esbuilld_cli(full_path, &[
        "--minify-whitespace",
        "--minify-syntax",
        "--format=iife",
        "--target=es6",
    ])
}

const GLOBAL_REPLACE_ITEMS: [&'static str; 3] = ["{{IMAGE}}", "{{MIRROR}}", "<a n "];

pub struct GlobalStates {
    base_path: PathBuf,
    dest_path: PathBuf,
    commit: String,
    global_replacer: GlobalReplacer<{GLOBAL_REPLACE_ITEMS.len()}>,
    inserts: Inserts,
}

impl GlobalStates {
    pub fn init(base_path: PathBuf, dest_path: PathBuf, config: Config) -> GlobalStates {
        let commit = read_commit(&base_path);
        let mut inserts = build_static_inserts(&base_path, config, commit.clone());
        codegen(&mut inserts, &base_path);
        let global_replacer = GlobalReplacer::build(
            GLOBAL_REPLACE_ITEMS,
            [config.image(), config.mirror(), r#"<a target="_blank" "#],
        );
        GlobalStates { base_path, dest_path, commit, global_replacer, inserts }
    }

    pub fn emit(&self, name: &str, ty: FileType) {
        let GlobalStates { base_path, dest_path, commit, global_replacer, inserts } = self;

        let src_path = base_path.join(cs!(name, ".", ty.as_src()));
        let content = match ty {
            FileType::Html => insert(&load(src_path).unwrap(), inserts.clone()),
            FileType::Css => minify_css(src_path),
            FileType::Script => compile_script(src_path),
        };
        let content = global_replacer.replace(&content);

        let dest_path = dest_path.join(if matches!(ty, FileType::Html) {
            cs!(name, ".", ty.as_dest())
        } else {
            cs!(name, "-", commit, ".", ty.as_dest())
        });
        let (comment_l, comment_r) = ty.comment();
        let mut file = OpenOptions::new().create_new(true).write(true).open(dest_path).unwrap();
        macro_rules! w {
            ($s:expr) => {
                file.write_all($s.as_bytes()).unwrap();
            };
        }
        w!(comment_l);
        w!(COPYRIGHT_L);
        w!(commit);
        w!(COPYRIGHT_R);
        w!(comment_r);
        w!("\n\n");
        w!(content);
    }
}
