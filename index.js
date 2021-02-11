
let Automerge = require("automerge-wasm")

let doc = Automerge.init();

console.log("docNode",doc)

import("automerge-wasm/mjs").then(AutomergeMJS => {
  let docMJS = AutomergeMJS.init();
  console.log("docMJS", docMJS)
})

require("automerge-wasm/cjs").then(AutomergeCJS => {
  let docCJS = AutomergeCJS.init();
  console.log("docCJS",docCJS)
})

