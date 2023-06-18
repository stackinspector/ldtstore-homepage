use std::{fs, path::Path};

fn read_commit<P: AsRef<Path>>(base_path: P) -> String {
    let base_path = base_path.as_ref();
    let head = fs::read_to_string(base_path.join(".git/HEAD")).unwrap();
    let head = head.split('\n').next().unwrap();
    let head = head.split("ref: ").nth(1).unwrap();
    let commit = fs::read(base_path.join(".git").join(head)).unwrap();
    String::from_utf8(commit[0..7].to_vec()).unwrap()
}

fn main() {
    println!("cargo:rustc-env=GIT_HASH={}", read_commit(".."))
}
