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
      default:
        token = this.getTextToken();
    }
    this.currentToken = token;
    return this.currentToken;
  }
}

enum NodeType {
  RootNode,
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

type ASTNode = {
  nodeType: NodeType;
  token: Token;
  children: Array<ASTNode>;
};

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
    this.eat(TokenType.STRING);
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
    while (this.currentToken.tokenType in [TokenType.BOLD, TokenType.STRING]) {
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
      this.currentToken.tokenType in [TokenType.ITALIC, TokenType.STRING]
    ) {
      if (this.currentToken.tokenType === TokenType.BOLD) {
        break
      }
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
    switch (this.currentToken.tokenType) {
      case TokenType.STRING:
        rootNode.children = rootNode.children.concat(this.textStmt());
        break;
      case TokenType.MONOSPACE:
        rootNode.children = rootNode.children.concat(this.monoSpaceStmt());
        break;
      case TokenType.CODE:
        rootNode.children = rootNode.children.concat(this.codeStmt());
        break;
      case TokenType.ITALIC:
        rootNode.children = rootNode.children.concat(this.italicStmt());
        break;
      case TokenType.BOLD:
        rootNode.children = rootNode.children.concat(this.boldStmt());
        break;
    }
    while (this.currentToken.tokenType !== TokenType.EOF) {
      rootNode.children = rootNode.children.concat(this.formatStmt());
    }
    return rootNode;
  }
}

const lexer = new Lexer("_Hello **World**_ `Code is fantastic`");
//while (lexer.currentToken.tokenType !== TokenType.EOF) {
//  console.log(lexer.getNextToken())
//}
const parser = new Parser(lexer);
console.log(JSON.stringify(parser.rootStmt()));
