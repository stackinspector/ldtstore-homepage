use std::{str::FromStr, fs::{self, OpenOptions, read_to_string as load}, path::{Path, PathBuf}, io::Write};
use ldtstore_codegen::{codegen::{codegen, CodegenResult}, Inserts, insert, cs, add_insert, GlobalReplacer};

#[derive(Clone, Copy)]
enum Config {
    Default,
    Intl,
}

impl Config {
    const fn image(&self) -> &'static str {
        use Config::*;
        match self {
            Default => "//s0.ldtstore.com.cn",
            Intl => "//raw.githubusercontent.com/stackinspector/ldtstore-assert/master/image",
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
                    "/*{{minified:", file_name, "}}*/" => minify_css(load(entry.path()).unwrap())
                }
            } else if file_name.ends_with(FileType::Script.as_src()) {
                add_insert! {
                    res:
                    "/*{{minified:", file_name, "}}*/" => compile_script(load(entry.path()).unwrap())
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

struct GlobalStates {
    base_path: PathBuf,
    dest_path: PathBuf,
    commit: String,
    global_replacer: GlobalReplacer,
    static_inserts: Inserts,
    codegen_result: CodegenResult,
}

impl GlobalStates {
    fn init(Args { base_path, dest_path, config }: Args) -> GlobalStates {
        let commit = read_commit(&base_path);
        let codegen_result = codegen(&base_path);
        let static_inserts = build_static_inserts(&base_path, config, commit.clone());
        let global_replacer = GlobalReplacer::build(
            &["{{IMAGE}}", "{{MIRROR}}", "<a n "],
            &[config.image(), config.mirror(), r#"<a target="_blank" "#],
        );
        GlobalStates { base_path, dest_path, commit, global_replacer, static_inserts, codegen_result }
    }

    fn emit(&self, name: &str, ty: FileType) {
        let GlobalStates { base_path, dest_path, commit, global_replacer, static_inserts, codegen_result } = self;

        let src_path = base_path.join(cs!(name, ".", ty.as_src()));
        let mut inserts = static_inserts.clone();
        inserts.extend(match name {
            "index" => &codegen_result.home,
            "ldtools/index" => &codegen_result.tools,
            "ldtools/plain" => &codegen_result.tools_plain,
            _ => unreachable!(),
        }.clone().into_iter());
        let content = match ty {
            FileType::Html => insert(&load(src_path).unwrap(), inserts),
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
