use std::path::PathBuf;
use ldtstore_codegen::{Config, build};

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
    build(base_path, dest_path, config);
}
