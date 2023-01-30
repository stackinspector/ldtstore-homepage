# ldtstore-homepage

The new home page of LDTstore.com.cn

The `/codegen` is MPL licensed and the rest is MIT licensed.

## Build Codegen

```bash
cargo install --path ./codegen --force
```

## Build Pages

Make sure the `esbuild` binary is present in the PATH and codegen is installed.

```bash
ldtstore-codegen -c default -d path/to/wwwroot/
ldtstore-codegen -c intl -d path/to/intl-wwwroot/
```
