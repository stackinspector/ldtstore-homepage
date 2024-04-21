
pub trait VecMap<T>: IntoIterator<Item = T> + Sized {
    #[inline]
    fn map<U, F: FnMut(T) -> U>(self, f: F) -> core::iter::Map<Self::IntoIter, F> {
        self.into_iter().map(f)
    }

    #[inline]
    fn map_to<U, F: FnMut(T) -> U>(self, f: F) -> Vec<U> {
        self.into_iter().map(f).collect()
    }
}

impl<T> VecMap<T> for Vec<T> {}

pub trait MapMap<K, V>: IntoIterator<Item = (K, V)> + Sized {
    #[inline]
    fn map<U, F: FnMut((K, V)) -> U>(self, f: F) -> core::iter::Map<Self::IntoIter, F> {
        self.into_iter().map(f)
    }

    #[inline]
    fn map_to<U, F: FnMut((K, V)) -> U>(self, f: F) -> Vec<U> {
        self.into_iter().map(f).collect()
    }
}

impl<K, V> MapMap<K, V> for indexmap::IndexMap<K, V> {}

pub trait OptionToVec<T>: IntoIterator<Item = T> + Sized {
    #[inline]
    fn to_vec(self) -> Vec<T> {
        self.into_iter().collect()
    }
}

impl<T> OptionToVec<T> for Option<T> {}

pub trait UnwrapNone {
    fn unwrap_none(self);
}

impl<T> UnwrapNone for Option<T> {
    fn unwrap_none(self) {
        assert!(self.is_none())
    }
}

pub trait OrSelf<T> {
    fn or_self(&mut self, optb: Option<T>);
}

impl<T> OrSelf<T> for Option<T> {
    fn or_self(&mut self, optb: Option<T>) {
        *self = self.take().or(optb);
    }
}

pub trait IndexMapFirstInsert<K: core::hash::Hash + core::cmp::Eq, V> {
    fn first_insert(&mut self, k: K, v: V);
}

impl<K: core::hash::Hash + core::cmp::Eq, V> IndexMapFirstInsert<K, V> for indexmap::IndexMap<K, V> {
    fn first_insert(&mut self, k: K, v: V) {
        self.insert(k, v).unwrap_none()
    }
}
