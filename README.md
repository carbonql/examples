# CarbonQL examples

## Building

To get the code and its dependencies, run:

```sh
git clone git@github.com:carbonql/examples.git
cd examples
npm install
```

Then, to build, run:

```sh
npm run build
```

## Running examples

The repository is organized as a set of examples in the `src` directory:

```sh
src/
  queries/ # A bunch of sample queries. One per file.
  ktail/   # Sample app tail'ing logs from an arbitrary number of pods
  kgrep/   # Sample app grep'ing logs from an arbitrary number of pods
  svcmon/  # Sample terminal dashboard for debugging services
```

**After building**, you can run any example as you would a normal node.js
application. For example:

```sh
# Run a file containing a query.
node build/queries/certSignReqs.js

# Run an app that is identified with index.js
node build/ktail
node build/kgrep
```
