# mdparser
**mdparser** is a simple markdown parser built in typescript.
It returns an AST (Abstract syntax tree) of the input the user provided

## How to use?
Here are simple steps to use mdparser
### Initialize a lexer
```typescript
const lexer = new Lexer(
	"_Hello **World**_ `Code is fantastic`\n### Hello World",
);
```
The lexer will turn the markdown source code into a series of token. Tokens are used as values for the AST nodes.
The lexer takes the markdown source code as a parameter.
### Initialize a parser
```typescript
const parser = new Parser(lexer);
```
Initializing a parser is as simple as creating a new Parser object and passing in the lexer as a parameter.
### Get the markdown source code structure
```typescript
const lexer = new Lexer(
	"_Hello **World**_ `Code is fantastic`\n### Hello World",
);

const parser = new Parser(lexer);
const structure: ASTNode = parser.rootStmt()
console.log(JSON.stringify(structure));
```
The `parser.rootStmt()` method is used to get the entire structure of the source code.

### Transpile the markdown source code into html

```typescript
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
console.log(toHtml(parser.rootStmt()));
```

PS: File a pull request if you want to contribute to the core of the project or to examples.
