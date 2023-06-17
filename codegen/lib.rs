#![allow(non_camel_case_types)]

pub use lighthtml::ByteString;
pub type Map<T> = indexmap::IndexMap<ByteString, T>; // Vec<(String, T)>;
pub type Inserts = std::collections::HashMap<ByteString, String>;

pub use concat_string::concat_string as cs;
#[macro_export]
macro_rules! s {
    ($s:expr) => {{
        let t: $crate::ByteString = $s.into();
        t
    }};
    ($($s:expr),+) => {
        s!(cs!($($s),+))
    }
}

pub mod config;
pub mod data;
pub mod codegen;
