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

import { isAlphaNumeric } from "./utils.ts";

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

export type Token = {
	tokenValue: string;
	tokenType: TokenType;
};

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

export class Lexer {
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
			token.tokenType = TokenType.HEADER5;
			token.tokenValue = "####";
			this.advance(4);
			return token;
		}

		if (this.peekSequence(3) === "###") {
			token.tokenType = TokenType.HEADER4;
			token.tokenValue = "###";
			this.advance(3);
			return token;
		}

		if (this.peekSequence(2) === "##") {
			token.tokenType = TokenType.HEADER3;
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
	UnorderedListRoot,
	UnorderedListItem,
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
			this.invalidTokenError();
		}
	}

	private textStmt(): ASTNode {
		const text: ASTNode = {
			nodeType: NodeType.StringNode,
			token: this.currentToken,
			children: [],
		};
		switch (this.currentToken.tokenType) {
			case TokenType.STRING:
				this.eat(TokenType.STRING);
				break;
			case TokenType.NEWLINE:
				this.eat(TokenType.NEWLINE);
				break;
			default:
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
			languageName: "",
			children: [],
		};
		this.eat(TokenType.CODE);
		node.languageName = this.currentToken.tokenValue;
		this.eat(TokenType.STRING);
		this.eat(TokenType.NEWLINE);
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
		this;
		return node;
	}

	private innerUnorederedLiStmt(): ASTNode {
		const listNode: ASTNode = {
			nodeType: NodeType.UnorderedListItem,
			token: this.currentToken,
			children: [],
		};
		this.eat(TokenType.UNORDEREDLI);
		switch (this.currentToken.tokenType) {
			case TokenType.ITALIC:
				listNode.children = listNode.children.concat(this.italicStmt());
				break;
			case TokenType.BOLD:
				listNode.children = listNode.children.concat(this.boldStmt());
				break;
			case TokenType.STRING:
				listNode.children = listNode.children.concat(this.textStmt());
				break;
			case TokenType.MONOSPACE:
				listNode.children = listNode.children.concat(this.monoSpaceStmt());
				break;
			default:
				if (this.currentToken.tokenValue.includes("#")) {
					listNode.children = listNode.children.concat(this.headerStmt());
				}
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

export function toHtml(root: ASTNode): string {
	let output = "";
  if (root.nodeType === NodeType.RootNode) {
    output += "<html>\n"
  }
	for (const child of root.children) {
		switch (child.nodeType) {
			case NodeType.Bold:
				output += "<strong>";
				output += toHtml(child);
				output += "</strong>\n";
				break;
			case NodeType.StringNode:
        output += "<span>"
				output += child.token.tokenValue;
        output += "</span>\n"
				break;
			case NodeType.Italic:
				output += "<i>";
				output += toHtml(child);
				output += "</i>\n";
				break;
			case NodeType.Header1:
				output += "<h1>\n";
				output += toHtml(child);
				output += "\n</h1>\n";
				break;
			case NodeType.Header2:
				output += "<h2>\n";
				output += toHtml(child);
				output += "\n</h2>\n";
				break;
			case NodeType.Header3:
				output += "<h3>\n";
				output += toHtml(child);
				output += "\n</h3>\n";
				break;
			case NodeType.Header4:
				output += "<h4>\n";
				output += toHtml(child);
				output += "\n</h4>\n";
				break;
			case NodeType.Header5:
				output += "<h5>\n";
				output += toHtml(child);
				output += "\n</h5>\n";
				break;
      case NodeType.Monospace:
        output += "<code>";
        output += toHtml(child);
        output += "</code>\n"
        break
      case NodeType.UnorderedListRoot:
        output += "<ul>\n"
        output += toHtml(child)
        output += "\n</ul>\n"
        break
      case NodeType.UnorderedListItem:
        output += "<li>\n"
        output += toHtml(child)
        output += "\n</li>\n"
		}
	}
  if (root.nodeType === NodeType.RootNode) {
    output += "\n</html>"
  }
	return output;
}

const lexer = new Lexer(
	"_Hello **World**_ `Code is fantastic`\n### Hello World",
);
const parser = new Parser(lexer);
console.log(toHtml(parser.rootStmt()));
