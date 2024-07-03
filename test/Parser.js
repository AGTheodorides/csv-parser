const assert = require("assert");
const Parser = require("../src/Parser");

describe("Parser", () => {
    describe("parse", () => {
        it("should have default options", () => {
            const parser = new Parser();
            const defaultOptions = {
                lineDelimiter: "\r\n",
                columnDelimiter: ",",
                columnHeaders: false,
                quotedSegments: false,
                quotationMark: "\"",
                escapeQuotationCharacter: "\"",
                allowAsymmetry: false,
                skipLines: 0,
                limitLines: 0,
            };

            assert.deepEqual(parser, defaultOptions);
        });
        it("should perform basic validations", () => {
            assert.throws(() => new Parser({ lineDelimiter: null }), Error, "Line delimiter must be set");
            assert.throws(() => new Parser({ lineDelimiter: "" }), Error, "Line delimiter must be set");
            assert.throws(() => new Parser({ columnDelimiter: null }), Error, "Column delimiter must be set");
            assert.throws(() => new Parser({ columnDelimiter: "" }), Error, "Column delimiter must be set");
            assert.throws(() => new Parser({ quotationMark: "12" }), Error, "Quotation mark must be a single character");
            assert.throws(() => new Parser({ escapeQuotationCharacter: "12" }), Error, "Escape quotation character must be a single character");
            assert.throws(() => new Parser({ skipLines: -1 }), Error, "Skipped lines must be a positive number");
            assert.throws(() => new Parser({ limitLines: -1 }), Error, "Limit lines must be a positive number");
        });
        it("should parse lines and columns", () => {
            const parser = new Parser();
            const data = "Line 1 Column 1,Line 1 Column 2\r\nLine 2 Column 1,Line 2 Column 2\r\n";
            const result = parser.parse(data);
            const expected = {
                columnNames: [ 'Column_0', 'Column_1' ],
                lines: [
                    [ 'Line 1 Column 1', 'Line 1 Column 2' ],
                    [ 'Line 2 Column 1', 'Line 2 Column 2' ]
                ]
            };

            assert.deepEqual(result, expected);
        });
        it("should allow for custom line delimiters", () => {
            const parser = new Parser({
                lineDelimiter: "#EOL#",
            });
            const data = "Line 1 Column 1,Line 1 Column 2#EOL#Line 2 Column 1,Line 2 Column 2";
            const result = parser.parse(data);
            const expected = {
                columnNames: [ 'Column_0', 'Column_1' ],
                lines: [
                    [ 'Line 1 Column 1', 'Line 1 Column 2' ],
                    [ 'Line 2 Column 1', 'Line 2 Column 2' ]
                ]
            };

            assert.deepEqual(result, expected);
        });
        it("should allow for custom column delimiters", () => {
            const parser = new Parser({
                columnDelimiter: "#EOC#",
            });
            const data = "Line 1 Column 1#EOC#Line 1 Column 2\r\nLine 2 Column 1#EOC#Line 2 Column 2";
            const result = parser.parse(data);
            const expected = {
                columnNames: [ 'Column_0', 'Column_1' ],
                lines: [
                    [ 'Line 1 Column 1', 'Line 1 Column 2' ],
                    [ 'Line 2 Column 1', 'Line 2 Column 2' ]
                ]
            };

            assert.deepEqual(result, expected);
        });
        it("should treat first line as column headers", () => {
            const parser = new Parser({
                columnHeaders: true,
            });
            const data = "Header 1,Header 2\r\nLine 1 Column 1,Line 1 Column 2\r\nLine 2 Column 1,Line 2 Column 2";
            const result = parser.parse(data);
            const expected = {
                columnNames: [ 'Header 1', 'Header 2' ],
                lines: [
                    [ 'Line 1 Column 1', 'Line 1 Column 2' ],
                    [ 'Line 2 Column 1', 'Line 2 Column 2' ]
                ]
            };

            assert.deepEqual(result, expected);
        });
        it("should not allow asymmetry", () => {
            const parser = new Parser();
            const data = "Line 1 Column 1\r\nLine 2 Column 1,Line 2 Column 2";

            assert.throws(() => parser.parse(data), Error, "Invalid column count on line 2: expected 1, got 2");
        });
        it("should allow asymmetry", () => {
            const parser = new Parser({
                allowAsymmetry: true,
            });
            const data = "Line 1 Column 1\r\nLine 2 Column 1,Line 2 Column 2";
            const result = parser.parse(data);
            const expected = {
                columnNames: [ 'Column_0', 'Column_1' ],
                lines: [
                    [ 'Line 1 Column 1' ],
                    [ 'Line 2 Column 1', 'Line 2 Column 2' ]
                ]
            };

            assert.deepEqual(result, expected);
        });
        it("should skip lines", () => {
            const parser = new Parser({
                skipLines: 2,
            });
            const data = "Skip Line 1 Column 1,Skip Line 1 Column 2\r\nSkip Line 2 Column 1,Skip Line 2 Column 2\r\n" +
                "Line 1 Column 1,Line 1 Column 2\r\nLine 2 Column 1,Line 2 Column 2";
            const result = parser.parse(data);
            const expected = {
                columnNames: [ 'Column_0', 'Column_1' ],
                lines: [
                    [ 'Line 1 Column 1', 'Line 1 Column 2' ],
                    [ 'Line 2 Column 1', 'Line 2 Column 2' ]
                ]
            };

            assert.deepEqual(result, expected);
        });
        it("should limit lines read", () => {
            const parser = new Parser({
                limitLines: 1,
            });
            const data = "Line 1 Column 1,Line 1 Column 2\r\nLine 2 Column 1,Line 2 Column 2";
            const result = parser.parse(data);
            const expected = {
                columnNames: [ 'Column_0', 'Column_1' ],
                lines: [
                    [ 'Line 1 Column 1', 'Line 1 Column 2' ]
                ]
            };

            assert.deepEqual(result, expected);
        });
        it("should handle quoted data", () => {
            const parser = new Parser();
            const data = "Line 1 Column 1,Line 1 Column 2\r\nLine 2 Column 1,\"Line 2 Quoted column 2, with delimiter\"";
            const result = parser.parse(data);
            const expected = {
                columnNames: [ 'Column_0', 'Column_1' ],
                lines: [
                    [ 'Line 1 Column 1', 'Line 1 Column 2' ],
                    [ 'Line 2 Column 1', 'Line 2 Quoted column 2, with delimiter' ]
                ]
            };

            assert.deepEqual(result, expected);
        });
        it("should ignore quoted segments", () => {
            const parser = new Parser();
            const data = "Line 1 Column 1,Line 1 Column 2\r\nLine 2 Column 1,Line 2 \"quoted segment\" column 2";
            const result = parser.parse(data);
            const expected = {
                columnNames: [ 'Column_0', 'Column_1' ],
                lines: [
                    [ 'Line 1 Column 1', 'Line 1 Column 2' ],
                    [ 'Line 2 Column 1', 'Line 2 \"quoted segment\" column 2' ]
                ]
            };

            assert.deepEqual(result, expected);
        });
        it("should handle quoted segments", () => {
            const parser = new Parser({
                quotedSegments: true,
            });
            const data = "Line 1 Column 1,Line 1 Column 2\r\nLine 2 Column 1,Line 2 \"quoted, segment\" column 2";
            const result = parser.parse(data);
            const expected = {
                columnNames: [ 'Column_0', 'Column_1' ],
                lines: [
                    [ 'Line 1 Column 1', 'Line 1 Column 2' ],
                    [ 'Line 2 Column 1', 'Line 2 quoted, segment column 2' ]
                ]
            };

            assert.deepEqual(result, expected);
        });
        it("should allow escaping quotation markers", () => {
            const parser = new Parser();
            const data = "Line 1 Column 1,Line 1 Column 2\r\n\"\"Line 2 Column 1,\"Line 2 Quoted column 2, with delimiter and \"\"escaped quotes\"\"\"";
            const result = parser.parse(data);
            const expected = {
                columnNames: [ 'Column_0', 'Column_1' ],
                lines: [
                    [ 'Line 1 Column 1', 'Line 1 Column 2' ],
                    [ '\"Line 2 Column 1', 'Line 2 Quoted column 2, with delimiter and \"escaped quotes\"' ]
                ]
            };

            assert.deepEqual(result, expected);
        });
        it("should allow escaping with custom quotation markers", () => {
            const parser = new Parser({
                quotationMark: "\\",
            });
            const data = "Line 1 Column 1,Line 1 Column 2\r\nLine 2 Column 1,\\Line 2 Quoted column 2, with delimiter\\";
            const result = parser.parse(data);
            const expected = {
                columnNames: [ 'Column_0', 'Column_1' ],
                lines: [
                    [ 'Line 1 Column 1', 'Line 1 Column 2' ],
                    [ 'Line 2 Column 1', 'Line 2 Quoted column 2, with delimiter' ]
                ]
            };

            assert.deepEqual(result, expected);
        });
        it("should allow escaping quotation markers using a custom escape character", () => {
            const parser = new Parser({
                escapeQuotationCharacter: "\\",
            });
            const data = "Line 1 Column 1,Line 1 Column 2\r\n\\\"Line 2 Column 1,\"Line 2 Quoted column 2, with delimiter and \\\"escaped quotes\\\"\"";
            const result = parser.parse(data);
            const expected = {
                columnNames: [ 'Column_0', 'Column_1' ],
                lines: [
                    [ 'Line 1 Column 1', 'Line 1 Column 2' ],
                    [ '\"Line 2 Column 1', 'Line 2 Quoted column 2, with delimiter and \"escaped quotes\"' ]
                ]
            };

            assert.deepEqual(result, expected);
        });
    })
});