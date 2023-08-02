# tsx-translate

Scans typescript jsx files for missing translations and outputs it to stdout

## Installation

```sh
yarn add github.com/carlundmahren/tsx-translate
```

## CLI Usage

```sh
tsx-translate [options]
```

### Options

```
-h, --help                     output usage information
-V, --version                  output the version number
directory                      Directory to scan for tsx files
```

```sh
tsx-translate .
```

### Aknowledgements

Thanks to [react-json-parser](https://github.com/MainframeOS/react-json-parser) for inspiration and a baseline of code.

## License

MIT
