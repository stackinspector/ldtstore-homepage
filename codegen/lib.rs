#![allow(non_camel_case_types)]

pub use lighthtml::ByteString;
pub type Map<T> = indexmap::IndexMap<ByteString, T>; // Vec<(String, T)>;
pub type Inserts = std::collections::HashMap<String, String>;

pub mod config;
pub mod data;
pub mod codegen;
