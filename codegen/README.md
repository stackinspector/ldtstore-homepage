# ldtstore-codegen

The new page build system of LDTstore.com.cn

## Build

Make sure the `esbuild` binary is present in the PATH.

```bash
cargo install https://github.com/stackinspector/ldtstore-codegen
git clone https://github.com/stackinspector/ldtstore-homepage
cd ldtstore-homepage
ldtstore-codegen -c default -d path/to/wwwroot/
ldtstore-codegen -c intl -d path/to/intl-wwwroot/
```
