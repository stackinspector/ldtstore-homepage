use std::{path::PathBuf, fs};
use ldtstore_codegen::{Config, FileType, GlobalStates};

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
    let Args { base_path, dest_path, config }: Args = argh::from_env();
    fs::create_dir_all(&dest_path).unwrap();
    fs::create_dir_all(dest_path.join("ldtools")).unwrap();
    fs::copy(base_path.join("robots.txt"), dest_path.join("robots.txt")).unwrap();
    fs::copy(base_path.join("error.html"), dest_path.join("error.html")).unwrap();

    let builder = GlobalStates::init(base_path, dest_path, config);
    builder.emit("index", FileType::Html);
    builder.emit("ldtools/index", FileType::Html);
    builder.emit("ldtools/plain", FileType::Html);
    builder.emit("style", FileType::Css);
    builder.emit("main", FileType::Script);
}
