import { isAlphaNumeric, isAsciiAlpha } from "./utils.ts";

export enum TokenType {
  STRING,
  SPACE,
  NEWLINE,
  BOLD,
  ITALIC,
  UNORDEREDLI,
  HEADER1,
  HEADER2,
  HEADER3,
  HEADER4,
  HEADER5,
  MONOSPACE,
  CODE,
  UNTYPED,
  EOF,
  LINEBREAK,
}

export type Token = {
  tokenValue: string;
  tokenType: TokenType;
};

export class Lexer {
  public position = 0;
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

  private peekSequence(size: number): string {
    let p = this.position;
    let s = "";
    const start = this.position;
    // currentChar + ... + char ar input[size]
    // while position < position at end: (position + size)
    while (p < start + size) {
      if (this.position === this.input.length - 1) {
        break;
      }
      s += this.input[p];
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

    if (this.peekSequence(5) === "#####") {
      token.tokenType = TokenType.HEADER5;
      token.tokenValue = "#####";
      this.advance(5);
      return token;
    }

    if (this.peekSequence(4) === "####") {
      token.tokenType = TokenType.HEADER4;
      token.tokenValue = "####";
      this.advance(4);
      return token;
    }

    if (this.peekSequence(3) === "###") {
      token.tokenType = TokenType.HEADER3;
      token.tokenValue = "###";
      this.advance(3);
      return token;
    }

    if (this.peekSequence(2) === "##") {
      token.tokenType = TokenType.HEADER2;
      token.tokenValue = "##";
      this.advance(2);
      return token;
    }

    token.tokenValue = "#";
    token.tokenType = TokenType.HEADER1;
    this.advance(1);
    return token;
  }

  private getTextToken(): Token {
    let s = "";
    while (isAlphaNumeric(this.currentChar)) {
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
      this.advance(3);
    } else {
      token.tokenValue = "`";
      token.tokenType = TokenType.MONOSPACE;
      this.advance();
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
      case " ":
        token.tokenType = TokenType.SPACE;
        token.tokenValue = " ";
        this.advance();
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
          this.invalidCharacterError();
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
      case "\n":
        token.tokenValue = "\n";
        token.tokenType = TokenType.NEWLINE;
        this.advance();
        break;
      default:
        token = this.getTextToken();
    }
    this.currentToken = token;
    return this.currentToken;
  }
}
