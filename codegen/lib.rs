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

macro_rules! insert {
    ($($($s1:expr),+ => $($s2:expr),+)*) => {{
        let mut res = Inserts::new();
        $(res.push(($crate::s!($($s1),+), $crate::s!($($s2),+)));)*
        res
    }};
}

pub fn insert(input: &str, inserts: Inserts) -> String {
    let (patterns, replaces): (Vec<_>, Vec<_>) = inserts.into_iter().unzip();
    AhoCorasick::new(patterns).unwrap().replace_all(input, &replaces)
}

pub struct GlobalReplacer<const N: usize> {
    replacer: AhoCorasick,
    replaces: [&'static str; N],
}

impl<const N: usize> GlobalReplacer<N> {
    pub fn build(patterns: [&'static str; N], replaces: [&'static str; N]) -> GlobalReplacer<N> {
        GlobalReplacer { replacer: AhoCorasick::new(patterns).unwrap(), replaces }
    }

    pub fn replace(&self, input: &str) -> String {
        self.replacer.replace_all(input, &self.replaces)
    }
}

pub mod config;
pub mod data;
pub mod codegen;
