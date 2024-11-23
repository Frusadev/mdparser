import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";
import { toHtml } from "./html.ts";

const data = `### Section
- List n 1
- List n 2
- List n 3
- List n 4
**Test _test_**
   \`hhhh\`
`;
const lexer = new Lexer(data);
const parser = new Parser(lexer);
//while (lexer.currentToken.tokenType !== TokenType.EOF) {
//  console.log(lexer.getNextToken())
//  console.log(TokenType[lexer.currentToken.tokenType])
//}
//console.log(JSON.stringify(parser.rootStmt()));
console.log(toHtml(parser.rootStmt()));
