#![allow(non_camel_case_types)]

pub use lighthtml::ByteString;
pub use aho_corasick::AhoCorasick;
pub type Map<T> = indexmap::IndexMap<ByteString, T>;
pub type Inserts = Vec<(ByteString, ByteString)>;

pub use concat_string::concat_string as cs;

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

pub fn insert(input: &str, inserts: Inserts) -> String {
    let (patterns, replaces): (Vec<_>, Vec<_>) = inserts.into_iter().unzip();
    AhoCorasick::new(patterns).unwrap().replace_all(input, &replaces)
}

pub struct GlobalReplacer {
    replacer: AhoCorasick,
    replaces: Vec<&'static str>,
}

impl GlobalReplacer {
    pub fn build(patterns: &'static [&'static str], replaces: &[&'static str]) -> GlobalReplacer {
        GlobalReplacer { replacer: AhoCorasick::new(patterns).unwrap(), replaces: replaces.to_vec() }
    }

    pub fn replace(&self, input: &str) -> String {
        self.replacer.replace_all(input, &self.replaces)
    }
}

pub mod config;
pub mod data;
pub mod codegen;
