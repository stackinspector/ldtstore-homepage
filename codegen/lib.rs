#![allow(non_camel_case_types)]

pub use lighthtml::ByteString;
pub type Map<T> = indexmap::IndexMap<ByteString, T>; // Vec<(String, T)>;
pub type Inserts = std::collections::HashMap<ByteString, ByteString>;

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
        $(assert!(matches!($insert.insert($crate::s!($($s1),+), $crate::s!($($s2),+)), None));)*
    };
}

pub mod config;
pub mod data;
pub mod codegen;
