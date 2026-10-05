const { areElementsSame } = require('./node_modules/@ndy-onl/y-excalidraw/dist/helpers.js');

let oldEl = { id: '1', version: 1, pos: 'a', x: 0, y: 0 };
let newEl = { id: '1', version: 2, pos: 'a', x: 10, y: 10 };

let arr1 = [oldEl];
let arr2 = [newEl];

console.log(areElementsSame(arr1, arr2));
