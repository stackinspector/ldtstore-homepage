use std::path::PathBuf;

#[derive(argh::FromArgs)]
#[argh(description = "")]
struct Args {
    /// dest wwwroot path
    #[argh(option, short = 'd')]
    dest_path: PathBuf,
    /// source path (default .)
    #[argh(option, short = 's', default = "Default::default()")]
    base_path: PathBuf,
}

fn main() {
    let Args { base_path, dest_path }: Args = argh::from_env();
    ldtstore_codegen::build(base_path, dest_path);
}
