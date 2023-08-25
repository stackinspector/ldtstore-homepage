#![allow(non_camel_case_types)]

use lighthtml::ByteString;
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

pub mod config;
pub mod data;
pub mod codegen;
use codegen::codegen;
use once_cell::sync::OnceCell;

use std::{fs::{self, OpenOptions, read_to_string as load}, path::{Path, PathBuf}, io::Write};

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
            Dev => "../",
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

static ARGS: OnceCell<Args> = OnceCell::new();

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

fn build_static_inserts(fragment_path: PathBuf, commit: String) -> Inserts {
    let mut res = Inserts::new();
    for entry in fs::read_dir(fragment_path.clone()).unwrap() {
        let entry = entry.unwrap();
        if entry.metadata().unwrap().is_file() {
            let file_name = entry.file_name();
            let file_name = file_name.to_str().unwrap();
            match FileType::parse(file_name) {
                Html => {
                    add_insert! {
                        res:
                        "<!--{{", file_name, "}}-->" => load(entry.path()).unwrap()
                    }
                },
                Css => {
                    add_insert! {
                        res:
                        "/*{{minified:", file_name, "}}*/" => minify_css(entry.path())
                    }
                },
                Script => {
                    add_insert! {
                        res:
                        "/*{{minified:", file_name, "}}*/" => compile_script(entry.path())
                    }
                },
            }
        }
    }
    add_insert! {
        res:
        "{{COMMIT}}" => commit
    }
    res
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

// fn complie_file(file_name: &str) -> (FileType, String) {}

fn firstname(file_name: &str, ty: FileType) -> &str {
    let b = file_name.as_bytes();
    let l = b.len() - ty.as_src().len() - 1;
    std::str::from_utf8(&b[..l]).unwrap()
}

pub fn build(args: Args) {
    let Args { dest_path, base_path, config, .. } = ARGS.get_or_init(|| args);

    fs::create_dir_all(&dest_path).unwrap();
    for name in ["code", "ldt", "tool", "legacy"] {
        fs::create_dir_all(dest_path.join(name)).unwrap();
    }

    let commit = read_commit(&base_path);
    let mut inserts = build_static_inserts(base_path.join("fragment"), commit.clone());
    codegen(&mut inserts, base_path.join("page"));
    let global_replacer = GlobalReplacer::build(
        ["<a n ", "{{ASSERT}}"],
        [r#"<a target="_blank" "#, config.assert()],
    );

    for entry in fs::read_dir(base_path.join("static")).unwrap() {
        let entry = entry.unwrap();
        if entry.metadata().unwrap().is_file() {
            for name in ["ldt", "tool"] {
                fs::copy(entry.path(), dest_path.join(name).join(entry.file_name())).unwrap();
            }
        }
    }

    let emit = |path: PathBuf, file_name: &str, dest_dir: PathBuf| {
        let ty = FileType::parse(file_name);
        let content = match ty {
            Html => insert(&load(path).unwrap(), inserts.clone()),
            Css => minify_css(path),
            Script => compile_script(path),
        };
        let content = global_replacer.replace(&content);
        let (comment_l, comment_r) = ty.comment();
        let dest = dest_dir.join(if matches!(ty, Html) {
            cs!(firstname(file_name, ty), ".", ty.as_dest())
        } else {
            cs!(firstname(file_name, ty), "-", commit, ".", ty.as_dest())
        });
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
        w!(content);
    };

    let dynamic_base = base_path.join("dynamic");
    for name in ["code", "ldt", "tool", "legacy"] {
        for entry in fs::read_dir(dynamic_base.join(name)).unwrap() {
            let entry = entry.unwrap();
            if entry.metadata().unwrap().is_file() {
                let file_name = entry.file_name();
                let file_name = file_name.to_str().unwrap();
                emit(entry.path(), file_name, dest_path.join(name));
            }
        }
    }
}
