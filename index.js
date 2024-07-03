const Parser = require("./src/Parser");

const parser = new Parser({
    lineDelimiter: "\n",
});
const data = "Line 1 Column 1,Line 1 Column 2\nLine 2 Column 1,Line 2 Column 2";
const result = parser.parse(data);

console.log(result);