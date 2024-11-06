/**
 * GRAMMAR
 * formatStmt: text           |
 *             bold           |
 *             italic         |
 *             code           |
 *             multiline_code |
 * text:   TEXT        ?EOF
 * bold:   STAR       innerBoldStmt STAR
 * innerBoldStmt: italic | text
 * italic: UNDERSCORE innerItalicStmt UNDERSCORE
 * innerItalicStmt: bold | text
 * code:   BACKTICK  formatStmt BACKTICK
 * multiline_code: BACKTICK BACKTICK BACKTICK text BACKTICK BACKTICK BACKTICK
 */

import { isAsciiAlpha, isAlphaNumeric } from "./utils.ts";

enum TokenType {
	STRING,
	BOLD,
	ITALIC,
	UNORDEREDLI,
	H1,
	H2,
	H3,
	H4,
	H5,
	MONOSPACE,
	CODE,
	UNTYPED,
	EOF,
	LINEBREAK,
}

type Token = {
	tokenValue: string;
	tokenType: TokenType;
};

class Lexer {
	private position = 0;
	private input: string;
	private currentChar: string;
	public currentToken: Token = {
		tokenValue: "",
		tokenType: TokenType.UNTYPED,
	};

	constructor(input: string, currentToken: Token = this.currentToken) {
		this.currentToken = currentToken;
		this.input = input;
		this.currentChar = this.input[this.position];
	}

	private peek(stroke = 1): string {
		if (this.input.length - 1 >= this.position + stroke) {
			return this.input[this.position + stroke];
		}
		return "";
	}

	private peekSequence(end: number): string {
		let p = this.position;
		let s = "";
		while (p <= end && this.input.length - 1 <= p) {
			s += this.input[this.position + p];
			p++;
		}
		return s;
	}

	private invalidCharacterError() {
		throw `Invalid character: \`${this.currentChar}\` at position ${this.position}`;
	}

	private advance(stroke = 1) {
		if (this.position + stroke > this.input.length - 1) {
			this.currentChar = "\0";
		} else {
			this.currentChar = this.input[this.position + stroke];
			this.position += stroke;
		}
	}

	private getHeaderToken(): Token {
		const token: Token = {
			tokenValue: "",
			tokenType: TokenType.UNTYPED,
		};

		for (let i = 5; i > 0; i--) {
			const prefix = "#".repeat(i);
			if (this.peekSequence(i) === prefix) {
				token.tokenValue = prefix;
				token.tokenType = TokenType[`H${i}` as keyof typeof TokenType];
				this.advance(i);
				return token;
			}
		}

		token.tokenValue = "#";
		token.tokenType = TokenType.H1;
		return token;
	}

	private getTextToken(): Token {
		let s = "";
		while (isAlphaNumeric(this.currentChar) || this.currentChar === " ") {
			s += this.currentChar;
			this.advance();
		}
		return {
			tokenValue: s,
			tokenType: TokenType.STRING,
		};
	}

	private getCodeToken(): Token {
		const token: Token = {
			tokenValue: "",
			tokenType: TokenType.UNTYPED,
		};
		if (this.peek() === "`" && this.peek(2) === "`") {
			token.tokenValue = "```";
			token.tokenType = TokenType.CODE;
		} else {
			token.tokenValue = "`";
			token.tokenType = TokenType.MONOSPACE;
		}
		return token;
	}

	public getNextToken(): Token {
		let token: Token = {
			tokenValue: "",
			tokenType: TokenType.UNTYPED,
		};
		switch (this.currentChar) {
			case "\0":
				token.tokenType = TokenType.EOF;
				token.tokenValue = "\0";
				break;
			case "_":
				token.tokenValue = "_";
				token.tokenType = TokenType.ITALIC;
				this.advance();
				break;
			case "*":
				if (this.peek() === "*") {
					token.tokenValue = "**";
					token.tokenType = TokenType.BOLD;
					this.advance(2);
				} else {
          this.invalidCharacterError()
        }
				break;
			case "-":
				if (this.peek() === "-" && this.peek(2) === "-") {
					token.tokenValue = "---";
					token.tokenType = TokenType.LINEBREAK;
					this.advance(3);
				} else {
					token.tokenValue = "-";
					token.tokenType = TokenType.UNORDEREDLI;
					this.advance();
				}
				break;
			case "#":
				token = this.getHeaderToken();
				break;
			case "`":
				token = this.getCodeToken();
				break;
			default:
				token = this.getTextToken();
		}
		this.currentToken = token;
		return this.currentToken;
	}
}

const lexer = new Lexer("_**Hello** World_");
