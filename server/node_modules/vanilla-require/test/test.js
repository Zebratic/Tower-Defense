/* Include */
// Instance the vanilla-require class
// - arg: directory path
const vr = require("../lib.js")(__dirname);

// ## Import a Vanilla JS Class
console.log("testing: vanilla-require");

// Instance a Vanilla Class
// - arg: file path
const Calculator = vr.require("Calculator.js");

// Enjoy the Class!
let myCalc = new Calculator(),
    a = 2, b = 3;

console.log("-- Vanilla class");
console.log(myCalc);

console.log("-- Using the class");
console.log("a:"+a+" b:"+b);
console.log("sum:"+myCalc.sum(a, b));
