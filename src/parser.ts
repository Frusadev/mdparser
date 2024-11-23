import { Lexer, TokenType, Token } from "./lexer.ts";
/**
 * GRAMMAR
 * formatStmt: text           |
 *             *textstmt           |
 *             bold           |
 *             italic         |
 *             code           |
 *             multiline_code |
 *             formatStmt     |
 * text:   STRING        ?EOF
 * bold:   STAR       innerBoldStmt STAR
 * innerBoldStmt: italic | text
 * italic: UNDERSCORE innerItalicStmt UNDERSCORE
 * innerItalicStmt: bold | text
 * code:   BACKTICK  formatStmt BACKTICK
 * multiline_code: BACKTICK BACKTICK BACKTICK text BACKTICK BACKTICK BACKTICK
 */

export type ASTNode =
  | {
      nodeType: NodeType;
      token: Token;
      children: Array<ASTNode>;
    }
  | {
      nodeType: NodeType.Code;
      token: Token;
      languageName: string;
      children: Array<ASTNode>;
    };

export enum NodeType {
  RootNode,
  UnorderedList,
  UnorderedListRoot,
  UnorderedListItem,
  OrderedList,
  StringNode,
  SpaceNode,
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
  NewLineNode,
}

export class Parser {
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
      console.log(`Unexpected token: Eat ${this.lexer.position}`);
      this.invalidTokenError();
    }
  }

  private allCharsStmt(): ASTNode {
    const node: ASTNode = {
      nodeType: NodeType.StringNode,
      token: {
        tokenType: TokenType.STRING,
        tokenValue: "",
      },
      children: [],
    };
    while (
      [TokenType.STRING, TokenType.SPACE].includes(this.currentToken.tokenType)
    ) {
      node.token.tokenValue += this.currentToken.tokenValue;
      this.eat(this.currentToken.tokenType);
    }
    return node;
  }

  private textStmt(): ASTNode {
    const text: ASTNode = {
      nodeType: NodeType.StringNode,
      token: {
        tokenType: TokenType.STRING,
        tokenValue: "",
      },
      children: [],
    };

    switch (this.currentToken.tokenType) {
      case TokenType.STRING:
        text.token = this.currentToken;
        this.eat(TokenType.STRING);
        this.textStmt();
        break;
      case TokenType.NEWLINE:
        text.token = this.currentToken;
        this.eat(TokenType.NEWLINE);
        text.nodeType = NodeType.NewLineNode;
        break;
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
          nodes = nodes.concat(this.allCharsStmt());
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
          nodes = nodes.concat(this.allCharsStmt());
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
    node.children = node.children.concat(this.allCharsStmt());
    this.eat(TokenType.MONOSPACE);
    return node;
  }

  private codeStmt(): ASTNode {
    const node: ASTNode = {
      nodeType: NodeType.Code,
      token: this.currentToken,
      languageName: "",
      children: [],
    };
    this.eat(TokenType.CODE);
    node.languageName = this.currentToken.tokenValue;
    this.eat(TokenType.STRING);
    this.eat(TokenType.NEWLINE);
    node.children = node.children.concat(this.allCharsStmt());
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
    this.eat(TokenType.SPACE);
    node.children = node.children.concat(this.allCharsStmt());
    return node;
  }

  private innerUnorederedLiStmt(): ASTNode {
    const listNode: ASTNode = {
      nodeType: NodeType.UnorderedListItem,
      token: this.currentToken,
      children: [],
    };
    this.eat(TokenType.UNORDEREDLI);
    this.eat(TokenType.SPACE);
    switch (this.currentToken.tokenType) {
      case TokenType.ITALIC:
        listNode.children = listNode.children.concat(this.italicStmt());
        break;
      case TokenType.BOLD:
        listNode.children = listNode.children.concat(this.boldStmt());
        break;
      case TokenType.STRING:
        listNode.children = listNode.children.concat(this.allCharsStmt());
        break;
      case TokenType.MONOSPACE:
        listNode.children = listNode.children.concat(this.monoSpaceStmt());
        break;
      default:
        listNode.children = listNode.children.concat(this.headerStmt());
    }
    return listNode;
  }

  private unorderedListStmt(): ASTNode {
    const listRoot: ASTNode = {
      nodeType: NodeType.UnorderedListRoot,
      token: {
        tokenType: TokenType.UNTYPED,
        tokenValue: "lis",
      },
      children: [],
    };
    while (this.currentToken.tokenType === TokenType.UNORDEREDLI) {
      listRoot.children = listRoot.children.concat(
        this.innerUnorederedLiStmt(),
      );
    }
    return listRoot;
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
      case TokenType.SPACE:
        node = this.allCharsStmt();
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
      case TokenType.UNORDEREDLI:
        node = this.unorderedListStmt();
        break;
      default:
        if (this.currentToken.tokenType === TokenType.EOF) {
          return node;
        }
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
