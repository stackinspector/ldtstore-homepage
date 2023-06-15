use std::{str::FromStr, fs::{self, OpenOptions}, path::{Path, PathBuf}, io::Write};
use concat_string::concat_string as cs;
use ldtstore_codegen::{codegen::{codegen, CodegenResult}, Inserts};

macro_rules! assert_none {
    ($x:expr) => {
        assert!(matches!($x, None))
    };
}

macro_rules! load {
    ($p:expr) => {
        fs::read_to_string($p).unwrap()
    };
}

fn global_replace(content: &str, config: Config) -> String {
    use Config::*;
    content
        .replace("{{IMAGE}}", match config {
            Default => "//s0.ldtstore.com.cn",
            Intl => "//raw.githubusercontent.com/stackinspector/ldtstore-assert/master/image",
            Test => "/image",
        })
        .replace("{{MIRROR}}", match config {
            Default => "//r.ldtstore.com.cn/mirror-cn/",
            Intl | Test => "//r.ldtstore.com.cn/mirror-os/",
        })
}

#[derive(Clone, Copy)]
enum Config {
    Default,
    Intl,
    Test,
}

impl FromStr for Config {
    type Err = &'static str;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(match s {
            "default" => Config::Default,
            "intl" => Config::Intl,
            "test" => Config::Test,
            _ => return Err("error parsing config type")
        })
    }
}

#[derive(Clone, Copy)]
enum FileType {
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
  Copyright (c) 2021-2022 CarrotGeball and stackinspector. All rights reserved. MIT license.
  Source: https://github.com/stackinspector/ldtstore-homepage
  Commit (content): ";

const COPYRIGHT_R: &str = concat!("
  Commit (codegen): ", env!("GIT_HASH"));

fn read_commit<P: AsRef<Path>>(base_path: P) -> String {
    let base_path = base_path.as_ref();
    let head = load!(base_path.join(".git/HEAD"));
    let head = head.split('\n').next().unwrap();
    let head = head.split("ref: ").nth(1).unwrap();
    let commit = fs::read(base_path.join(".git").join(head)).unwrap();
    String::from_utf8(commit[0..7].to_vec()).unwrap()
}

fn build_static_inserts<P: AsRef<Path>>(base_path: P, config: Config) -> Inserts {
    let base_path = base_path.as_ref();
    let mut res = Inserts::new();
    for entry in fs::read_dir(base_path.join("fragment")).unwrap() {
        let entry = entry.unwrap();
        if entry.metadata().unwrap().is_file() {
            assert_none!(res.insert(
                cs!("<!--{{", entry.file_name().to_str().unwrap(), "}}-->"),
                load!(entry.path()),
            ));
        }
    }
    assert_none!(res.insert(
        "<!--{{footer}}-->".to_owned(),
        load!(base_path.join("fragment").join(if matches!(config, Config::Intl) { "footer-intl.html" } else { "footer.html" })),
    ));
    assert_none!(res.insert(
        "/*{{minified:plain.css}}*/".to_owned(),
        minify_css(base_path.join("fragment").join("plain.css")),
    ));
    res
}

fn insert(mut input: String, inserts: &Inserts) -> String {
    for (k, v) in inserts {
        input = input.replace(k, v);
    }
    input
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

struct GlobalStates {
    base_path: PathBuf,
    dest_path: PathBuf,
    config: Config,
    commit: String,
    static_inserts: Inserts,
    codegen_result: CodegenResult,
}

impl GlobalStates {
    fn init(Args { base_path, dest_path, config }: Args) -> GlobalStates {
        let commit = read_commit(&base_path);
        let codegen_result = codegen(&base_path);
        let static_inserts = build_static_inserts(&base_path, config);
        GlobalStates { base_path, dest_path, config, commit, static_inserts, codegen_result }
    }

    fn emit(&self, name: &str, ty: FileType) {
        let GlobalStates { base_path, dest_path, config, commit, static_inserts, codegen_result } = self;

        let src_path = base_path.join(cs!(name, ".", ty.as_src()));
        let content = match ty {
            FileType::Html => {
                let code = load!(src_path);
                let code = insert(code, static_inserts);
                let code = insert(code, match name {
                    "index" => &codegen_result.home,
                    "ldtools/index" => &codegen_result.tools,
                    "ldtools/plain" => &codegen_result.tools_plain,
                    _ => unreachable!(),
                });
                let code = code.replace(
                    r#"<script src="/main.js"></script>"#,
                    cs!(r#"<script src="/main-"#, commit, r#".js"></script>"#).as_str(),
                );
                let code = code.replace(
                    r#"<link rel="stylesheet" href="/style.css">"#,
                    cs!(r#"<link rel="stylesheet" href="/style-"#, commit, r#".css">"#).as_str(),
                );
                let code = code.replace(
                    "<a n ",
                    r#"<a target="_blank" "#,
                );
                code
            },
            FileType::Css => minify_css(src_path),
            FileType::Script => compile_script(src_path),
        };

        let content = global_replace(&content, *config);

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
        w!("\n");
        w!(comment_r);
        w!("\n\n");
        w!(content);
    }
}

#[derive(argh::FromArgs)]
#[argh(description = "")]
struct Args {
    /// dest wwwroot path
    #[argh(option, short = 'd')]
    dest_path: PathBuf,
    /// dest profile
    #[argh(option, short = 'c')]
    config: Config,
    /// source path (default .)
    #[argh(option, short = 's', default = "Default::default()")]
    base_path: PathBuf,
}

fn main() {
    let args: Args = argh::from_env();
    fs::create_dir_all(&args.dest_path).unwrap();
    fs::create_dir_all(args.dest_path.join("ldtools")).unwrap();
    fs::copy(args.base_path.join("robots.txt"), args.dest_path.join("robots.txt")).unwrap();
    fs::copy(args.base_path.join("error.html"), args.dest_path.join("error.html")).unwrap();

    let builder = GlobalStates::init(args);
    builder.emit("index", FileType::Html);
    builder.emit("ldtools/index", FileType::Html);
    builder.emit("ldtools/plain", FileType::Html);
    builder.emit("style", FileType::Css);
    builder.emit("main", FileType::Script);
}
