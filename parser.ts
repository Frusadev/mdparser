/**
 * GRAMMAR
 * formatStmt: text           |
 *             bold           |
 *             italic         |
 *             code           |
 *             multiline_code |
 *             formatStmt     |
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

type Token = {
  tokenValue: string;
  tokenType: TokenType;
};

type ASTNode = {
  nodeType: NodeType;
  token: Token;
  children: Array<ASTNode>;
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

  private peekSequence(size: number): string {
    let p = this.position;
    let s = "";
    const start = this.position
    // currentChar + ... + char ar input[size]
    // while position < position at end: (position + size)
    while (p < start + size) {
      if (this.position === this.input.length - 1){
        break
      }
      s += this.input[p]
      p++
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
      this.advance(5)
      return token;
    }

    if (this.peekSequence(4) === "####") {
      token.tokenType = TokenType.HEADER5;
      token.tokenValue = "####";
      this.advance(4)
      return token;
    }

    if (this.peekSequence(3) === "###") {
      token.tokenType = TokenType.HEADER4;
      token.tokenValue = "###";
      this.advance(3)
      return token;
    }

    if (this.peekSequence(2) === "##") {
      token.tokenType = TokenType.HEADER3;
      token.tokenValue = "##";
      this.advance(2)
      return token;
    }

    token.tokenValue = "#";
    token.tokenType = TokenType.HEADER1;
    this.advance(1)
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

enum NodeType {
  RootNode,
  UnorderedList,
  OrderedList,
  StringNode,
  Bold,
  Italic,
  Code,
  Monospace,
  Header1,
  Header2,
  Header3,
  Header4,
  Header5,
  Void,
}

class Parser {
  private currentToken: Token;
  private lexer: Lexer;

  constructor(lexer: Lexer) {
    this.lexer = lexer;
    this.currentToken = this.lexer.getNextToken();
  }

  private invalidTokenError() {
    throw `Invalid token: ${JSON.stringify(this.currentToken)}`;
  }

  private eat(tokenType: TokenType) {
    if (this.currentToken.tokenType === tokenType) {
      this.currentToken = this.lexer.getNextToken();
    } else {
      this.invalidTokenError();
    }
  }

  private textStmt(): ASTNode {
    const text: ASTNode = {
      nodeType: NodeType.StringNode,
      token: this.currentToken,
      children: [],
    };
    if (this.currentToken.tokenType === TokenType.STRING) {
      this.eat(TokenType.STRING);
    } else if (this.currentToken.tokenType === TokenType.NEWLINE) {
      this.eat(TokenType.NEWLINE);
    } else {
      this.invalidTokenError();
    }
    return text;
  }

  private boldStmt(): ASTNode {
    const node: ASTNode = {
      nodeType: NodeType.Bold,
      token: this.currentToken,
      children: [],
    };
    this.eat(TokenType.BOLD);
    node.children = [...this.innerBoldStmt()];
    this.eat(TokenType.BOLD);
    return node;
  }

  private italicStmt(): ASTNode {
    const node: ASTNode = {
      nodeType: NodeType.Italic,
      token: this.currentToken,
      children: [],
    };
    this.eat(TokenType.ITALIC);
    node.children = [...this.innerItalicStmt()];
    this.eat(TokenType.ITALIC);
    return node;
  }

  private innerItalicStmt(): Array<ASTNode> {
    let nodes: Array<ASTNode> = [];
    while (
      [TokenType.BOLD, TokenType.STRING].includes(this.currentToken.tokenType)
    ) {
      switch (this.currentToken.tokenType) {
        case TokenType.BOLD:
          nodes = nodes.concat(this.boldStmt());
          break;
        case TokenType.STRING:
          nodes = nodes.concat(this.textStmt());
      }
    }
    return nodes;
  }

  private innerBoldStmt(): Array<ASTNode> {
    let nodes: Array<ASTNode> = [];
    while (
      [TokenType.ITALIC, TokenType.STRING].includes(this.currentToken.tokenType)
    ) {
      switch (this.currentToken.tokenType) {
        case TokenType.ITALIC:
          nodes = nodes.concat(this.italicStmt());
          break;
        case TokenType.STRING:
          nodes = nodes.concat(this.textStmt());
      }
    }
    return nodes;
  }

  private monoSpaceStmt(): ASTNode {
    const node: ASTNode = {
      nodeType: NodeType.Monospace,
      token: this.currentToken,
      children: [],
    };
    this.eat(TokenType.MONOSPACE);
    node.children = node.children.concat(this.textStmt());
    this.eat(TokenType.MONOSPACE);
    return node;
  }

  private codeStmt(): ASTNode {
    const node: ASTNode = {
      nodeType: NodeType.Code,
      token: this.currentToken,
      children: [],
    };
    this.eat(TokenType.CODE);
    node.children = node.children.concat(this.textStmt());
    this.eat(TokenType.CODE);
    return node;
  }

  private headerStmt(): ASTNode {
    const node: ASTNode = {
      nodeType: NodeType.Void,
      token: this.currentToken,
      children: [],
    };
    const headers: Map<TokenType, NodeType> = new Map([
      [TokenType.HEADER1, NodeType.Header1],
      [TokenType.HEADER2, NodeType.Header2],
      [TokenType.HEADER3, NodeType.Header3],
      [TokenType.HEADER4, NodeType.Header4],
      [TokenType.HEADER5, NodeType.Header5],
    ]);
    if (headers.get(node.token.tokenType) !== undefined) {
      node.nodeType = headers.get(node.token.tokenType) as NodeType;
      this.eat(this.currentToken.tokenType);
    } else {
      this.invalidTokenError();
    }
    node.children = node.children.concat(this.textStmt());
    this
    return node;
  }

  private formatStmt(): ASTNode {
    let node: ASTNode = {
      nodeType: NodeType.Void,
      token: {
        tokenType: TokenType.UNTYPED,
        tokenValue: "",
      },
      children: [],
    };
    switch (this.currentToken.tokenType) {
      case TokenType.STRING:
        node = this.textStmt();
        break;
      case TokenType.MONOSPACE:
        node = this.monoSpaceStmt();
        break;
      case TokenType.CODE:
        node = this.codeStmt();
        break;
      case TokenType.ITALIC:
        node = this.italicStmt();
        break;
      case TokenType.BOLD:
        node = this.boldStmt();
        break;
      case TokenType.NEWLINE:
        node = this.textStmt();
        break;
      default:
        if (TokenType[this.currentToken.tokenType].startsWith("HEADER")) {
          node = this.headerStmt();
        } else {
          this.invalidTokenError();
        }
    }
    return node;
  }

  public rootStmt(): ASTNode {
    const rootNode: ASTNode = {
      nodeType: NodeType.RootNode,
      token: {
        tokenType: TokenType.UNTYPED,
        tokenValue: "Root",
      },
      children: [],
    };
    while (this.currentToken.tokenType !== TokenType.EOF) {
      rootNode.children = rootNode.children.concat(this.formatStmt());
    }
    return rootNode;
  }
}

const lexer = new Lexer(
  "_Hello **World**_ `Code is fantastic`\n### Hello World",
);
const parser = new Parser(lexer);
console.log(JSON.stringify(parser.rootStmt()));
