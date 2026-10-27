const { getDeltaOperationsForElements } = require('./node_modules/@ndy-onl/y-excalidraw/dist/diff.js');

let oldEl = { id: '1', version: 1, pos: 'a', x: 0, y: 0 };
let newEl = { id: '1', version: 2, pos: 'a', x: 10, y: 10 };

let arr1 = [oldEl];
let arr2 = [newEl];

console.log(getDeltaOperationsForElements(arr1, arr2));
