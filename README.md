# ldtstore-homepage

The new home page of LDTstore.com.cn

The `/codegen` is MPL licensed and the rest is MIT licensed.

## Build

Make sure the `esbuild` binary is present in the PATH.

```bash
cargo run --release -- -c default -d path/to/wwwroot/
cargo run --release -- -c intl -d path/to/intl-wwwroot/
```
