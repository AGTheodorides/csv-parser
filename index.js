const fs = require("fs");
const Parser = require("./src/Parser");

// let data = "Year,Industry_aggregation_NZSIOC,Industry_code_NZSIOC,Industry_name_NZSIOC,Units,Variable_code,Variable_name,Variable_category,Value,Industry_code_ANZSIC06\r\n" +
//     "2021,Level 1,99999,All industries,Dollars (millions),H01,Total income,Financial performance,\"757,504\",\"ANZSIC06 divisions A-S (excluding classes K6330, L6711, O7552, O760, O771, O772, S9540, S9601, S9602, and S9603)\"";
//
// let data = "Year,Value,Industry_code_ANZSIC06\r\n2021,\"757,504\",\"ANZSIC06 divisions A-S (excluding classes K6330, L6711, O7552, O760, O771, O772, S9540, S9601, S9602, and S9603)\"";
//
//
// const parser = new Parser({
//     columnHeaders: true,
// });
//
// const result = parser.parse(data);
//
// console.log(result);

// const parser = new Parser({
//     lineDelimiter: "\n",
// });
// const data = "Line 1 Column 1,Line 1 Column 2\nLine 2 Column 1,Line 2 Column 2";
// const result = parser.parse(data);
//
// console.log(result);

//const buffer = fs.readFileSync("E:\\Test\\csv\\annual-enterprise-survey-2021-financial-year-provisional-csv.csv");
const buffer = fs.readFileSync("E:\\Test\\csv\\business-financial-data-march-2024-csv.csv");
const data = buffer.toString();
const parser = new Parser({
    quotedSegments: true,
    columnHeaders: true,
});
const result = parser.parse(data);
console.log(result);