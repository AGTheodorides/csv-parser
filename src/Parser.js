const {defaults, isNil} = require("lodash");

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

class Parser {
    constructor(options = {}) {
        const _options = defaults(options, defaultOptions);

        this.lineDelimiter = _options.lineDelimiter;
        this.columnDelimiter = _options.columnDelimiter;
        this.columnHeaders = _options.columnHeaders;
        this.quotedSegments = _options.quotedSegments;
        this.quotationMark = _options.quotationMark;
        this.escapeQuotationCharacter = _options.escapeQuotationCharacter;
        this.allowAsymmetry = _options.allowAsymmetry;
        this.skipLines = _options.skipLines;
        this.limitLines = _options.limitLines;

        // Basic validation
        if (isNil(this.lineDelimiter) || this.lineDelimiter === "") throw new Error("Line delimiter must be set");
        if (isNil(this.columnDelimiter) || this.columnDelimiter === "") throw new Error("Column delimiter must be set");
        if (!isNil(this.quotationMark) && this.quotationMark.length !== 1) throw new Error("Quotation mark must be a single character");
        if (!isNil(this.escapeQuotationCharacter) && this.escapeQuotationCharacter.length !== 1) throw new Error("Escape quotation character must be a single character");
        if (this.skipLines < 0) throw new Error("Skipped lines must be a positive number");
        if (this.limitLines < 0) throw new Error("Limit lines must be a positive number");
    }

    parse(data) {
        let cursor = 0;
        let quoted = false;
        const lines = [];
        let linesSkipped = 0;
        let line = [];
        let lineIndex = 0;
        const columnNames = [];
        let column = "";
        let columnIndex = 0;
        let assumedColumnCount = 0;

        const finalizeColumn = () => {
            if (linesSkipped >= this.skipLines) {
                if (lineIndex === 0 && this.columnHeaders === true) {
                    // Column data becomes column name if we are on the first line and
                    // the option to do so is set
                    columnNames[columnIndex] = column;
                } else {
                    if (isNil(columnNames[columnIndex])) {
                        columnNames[columnIndex] = `Column_${columnIndex}`; // Default column naming
                    }

                    line.push(column); // Push column data to the current line
                }
            }

            column = "";
            columnIndex++;
        };
        const finalizeLine = () => {
            if (linesSkipped < this.skipLines) {
                linesSkipped++; // Skip line
            } else {
                if (lineIndex > 0 || this.columnHeaders === false) {
                    lines.push(line); // Push line data to the result set unless we are on the first line, and we need it
                                      // to become column names
                }

                if (lineIndex === 0) {
                    assumedColumnCount = columnIndex;
                } else {
                    if (assumedColumnCount !== columnIndex) {
                        if (!this.allowAsymmetry) {
                            throw new Error(`Invalid column count on line ${lineIndex + 1}: expected ${assumedColumnCount}, got ${columnIndex}`);
                        }
                    }
                }

                line = [];
                lineIndex++;
            }

            columnIndex = 0;
        };

        while(cursor < data.length) {
            const character = data[cursor];

            if (quoted) {
                // Quoted mode: treat characters within a quoted string until we reach a quotation mark
                // denoting the end of the quoted segment. Escaping the quotation mark is supported by doubling
                // the quotation mark or using a custom escape character
                switch(character) {
                    case this.escapeQuotationCharacter: {
                        // Allow escaping custom
                        if (cursor < data.length - 1 && data[cursor + 1] === this.quotationMark) {
                            column += this.quotationMark; // Upcoming quote was escaped, count as character
                            cursor++;
                        } else {
                            // Not a valid escape, count as character unless it is
                            // an upcoming closing quote in which case quotation stops
                            if (this.escapeQuotationCharacter !== this.quotationMark) {
                                column += character;
                            } else {
                                quoted = false;
                            }
                        }

                        break;
                    }
                    case this.quotationMark: {
                        quoted = false;

                        break;
                    }
                    default: {
                        column += character;
                    }
                }

                cursor++;
            } else {
                let columnDelimiterHit = false;
                let lineDelimiterHit = false;

                // Preprocess for delimiters as they need to be treated as a chunk
                switch(character) {
                    case this.columnDelimiter[0]: {
                        columnDelimiterHit = true;

                        // Make sure we've hit the entire column delimiter
                        for(let i = 0; i < this.columnDelimiter.length; i++) {
                            if (
                                cursor + i >= data.length ||
                                data[cursor + i] !== this.columnDelimiter[i]
                            ) {
                                columnDelimiterHit = false;
                                break;
                            }
                        }

                        break;
                    }
                    case this.lineDelimiter[0]: {
                        lineDelimiterHit = true;

                        // Make sure we've hit the entire line delimiter
                        for(let i = 0; i < this.lineDelimiter.length; i++) {
                            if (
                                cursor + i >= data.length ||
                                data[cursor + i] !== this.lineDelimiter[i]
                            ) {
                                lineDelimiterHit = false;
                                break;
                            }
                        }

                        break;
                    }
                }

                if (columnDelimiterHit === true) {
                    finalizeColumn();

                    cursor += this.columnDelimiter.length;
                } else if (lineDelimiterHit === true) {
                    finalizeColumn();
                    finalizeLine();

                    cursor += this.lineDelimiter.length;
                } else {
                    switch(character) {
                        case this.escapeQuotationCharacter: {
                            // Allow escaping custom
                            if (cursor < data.length - 1 && data[cursor + 1] === this.quotationMark) {
                                column += this.quotationMark; // Upcoming quote was escaped, count as character
                                cursor ++;
                            } else {
                                // Not a valid escape, count as character unless it is
                                // an upcoming closing quote in which case quotation stops
                                if (this.escapeQuotationCharacter !== this.quotationMark) {
                                    column += character;
                                } else {
                                    // Check if the quotation appears in the middle of the column in which
                                    // case we would be dealing a quoted segment where we can safely ignore
                                    // delimiters
                                    if (column.length === 0 || this.quotedSegments === true) {
                                        quoted = true;
                                    } else {
                                        column += character;
                                    }
                                }
                            }

                            break;
                        }
                        case this.quotationMark: {
                            // Check if the quotation appears in the middle of the column in which
                            // case we would be dealing a quoted segment where we can safely ignore
                            // delimiters
                            if (column.length === 0 || this.quotedSegments === true) {
                                quoted = true;
                            } else {
                                column += character;
                            }

                            break;
                        }
                        default: {
                            column += character;
                        }
                    }

                    cursor++;
                }
            }

            if (this.limitLines > 0 && lineIndex >= this.limitLines) {
                break;
            }
        }

        // Account for edge case where final column or line delimiter is missing
        if (column !== "") {
            finalizeColumn();
            finalizeLine();
        }

        return {
            columnNames,
            lines
        };
    }
}

module.exports = Parser;