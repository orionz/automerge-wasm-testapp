
## Automerge WASM Packaging 

Here is a summary of my discoveries with regard to packaging AutomergeWASM.  The basic issue is that there needs to be a simple way to use the rust implementation of the Automerge backend.  It compiles to WASM.  The way WASM is consumed in different javascript environments is different ergo I have yet to find the one true simple way to package this product.  A core problem (but not the only problem) is that browsers refuse to load WASM synchronously.

### ES6 Modules

The closest thing I've found to a perfect solution to all of this is ES6 modules.  These modules create a way to import code asynchronously but without adding async/promise syntax to the code.  For example, the entire [code](https://github.com/orionz/automerge-wasm/blob/main/index.mjs) for the AutomergeWASM implementation in ES6 modules is as follows.

```js
import * as Automerge from "automerge"
import * as Backend from "automerge-backend-wasm-module"
Automerge.setDefaultBackend(Backend)
export * from "automerge"
```

And an ES6 application using this code looks like this.

```js
import * as Automerge from "automerge-wasm"
```

Now if you wanted to use this module from a node application you would need to do 2 things.

One - you have to use an async `import` instead of `require`.  This is obnoxious - but - since WASM loading can be async a CommonJS implementation of this would look exactly the same except use an async `require` instead of an `import`.

```js
import("automerge-wasm").then((Automerge) => {
  let doc = Automerge.init();
  // ...
})
```

The next problem tho is a bit more annoying.  Deep in the code there exists this line - 


```js
import * as wasm from "./index_bg.wasm";
```

Which asynchronously loads the wasm (via a synchronous looking statement) that works over both http or the local filesystem transparently - but requires Node v13 to **AND** the `--experimental-wasm-modules` command line switch.  To make matters worse there does not appear to be an environment variable or global config to set this option which causes havoc in all the ways node is invked indirectly (mocha?).

As best I can tell this would be as close to a perfect solution as we could hope for except this command line switch is a deal killer.

### Bundling?

I suspect there is a way to bundle the ES6/wasm module with a bundler into a basic async js file but this is where I hit the limits of my knowledge of the javascript ecosystem.  Snowpack's bundling is immature and recommends the webpack plugin. My attempts with Webpack generated all kinds of non-usable javascript with little explanation as to why. I tried `browserify` which needed the `esmify` plugin to handle es6 code and the `wasmify` plugin to handle importing wasm.  But these two plugins don't play well together generating code that accesses the result of the `import "wasm"` before the import has run (thank you async loading).  This is where I need to ask for help from anyone with more understanding of this code bundling toolchain.

### ASM JS

One option that I have considered (and has been suggested to me) is to transpile the WASM to ASM.js which would allow simple synchronous loading and packaging.  I experimented with this and found while it worked great it produced javascript that was about 2x the side and 1/2 the speed of the native js implementation.  With this tradeoff I don't see anyone ever being willing to use this should we package it.

### Two Packages

Currently I believe the best option is to create two packages: [automerge-backend-wasm-module](https://github.com/orionz/automerge-backend-wasm-module) and [automerge-backend-wasm-node](https://github.com/orionz/automerge-backend-wasm-node).

If you want to use AutomergeWASM in node

```js
let Automerge = require("automerge")
let Backend = require("automerge-backend-wasm-node");
Automerge.setDefaultBackend(Backend)
```

And if you wanted to use AutomergeWSAM in an ES6 module.

```js
import * as Automerge from "automerge"
import * as Backend from "automerge-backend-wasm-module"
Automerge.setDefaultBackend(Backend)
```

I also experimented and made an [automerge-wasm](https://github.com/orionz/automerge-wasm) package that wraps these 3 lines up in several exports that you're welcome to experiment with either an

```js
import Automerge from "automerge-wasm/mjs"
```

or 

```js
let Automerge = require("automerge-wasm")
```

### But Isomorphic Apps

The problem with having a node-only pand a ES6 module as separate packages is that it makes writing isomorphics codebases that run on both node and in browser difficult.

The options are not good but here they are, as best as I can tell, as follows.

1. Require people to require a different package on node vs the web
2. Wait for node to fully support experimental wasm modules so the code can be used without the command line switch
3. Expect people to write the app in ES6 and transpile into CommonJS with Webpack
4. We transpile the ES6 package into CommonJS and require people writing in CommonJS to import a promise

Options 3 and 4 require us to figure out the correct set of plugins and options to get an MJS/WASM module to transpile correctly.

