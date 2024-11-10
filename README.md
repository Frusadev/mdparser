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
### Output
```json
{
  "nodeType": 0,
  "token": {
    "tokenType": 12,
    "tokenValue": "Root"
  },
  "children": [
    {
      "nodeType": 5,
      "token": {
        "tokenValue": "_",
        "tokenType": 3
      },
      "children": [
        {
          "nodeType": 3,
          "token": {
            "tokenValue": "Hello ",
            "tokenType": 0
          },
          "children": []
        },
        {
          "nodeType": 4,
          "token": {
            "tokenValue": "**",
            "tokenType": 2
          },
          "children": [
            {
              "nodeType": 3,
              "token": {
                "tokenValue": "World",
                "tokenType": 0
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "nodeType": 3,
      "token": {
        "tokenValue": " ",
        "tokenType": 0
      },
      "children": []
    },
    {
      "nodeType": 7,
      "token": {
        "tokenValue": "`",
        "tokenType": 10
      },
      "children": [
        {
          "nodeType": 3,
          "token": {
            "tokenValue": "Code is fantastic",
            "tokenType": 0
          },
          "children": []
        }
      ]
    },
    {
      "nodeType": 3,
      "token": {
        "tokenValue": "\n",
        "tokenType": 1
      },
      "children": []
    },
    {
      "nodeType": 11,
      "token": {
        "tokenValue": "###",
        "tokenType": 8
      },
      "children": [
        {
          "nodeType": 3,
          "token": {
            "tokenValue": " Hello World",
            "tokenType": 0
          },
          "children": []
        }
      ]
    }
  ]
}
```
`tokenValue` is used as value of the current token. It's held in a string.

`tokenType` is used to get the type of the current token. It's held as a TokenType.
```typescript
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
```
# Examples in different frameworks
## React
### Create the different rendering nodes.
```typescript
// Render nodes
export type TextNode = {
  type: 'text';
  value: string;
};

export type HeadingNode = {
  type: 'heading';
  level: number;
  children: ASTNode[];
};

export type BoldNode = {
  type: 'bold';
  children: ASTNode[];
};

export type MarkdownNode = TextNode | HeadingNode | BoldNode;
```
### Create components
```typescript
import React from 'react';

export const Heading: React.FC<HeadingNode> = ({ level, children }) => React.createElement(`h${level}`, {}, children);

export const Text: React.FC<TextNode> = ({ value }) => <span>{value}</span>;

export const Bold: React.FC<{ children: React.ReactNode }> = ({ children }) => <strong>{children}</strong>;
// Create the components for the other ASTNodes
```
### Rendering
```typescript
const renderNode = (node: MarkdownNode): React.ReactNode => {
  switch (node.type) {
    case 'heading':
      return (
        <Heading level={node.level}>
          // Render the children
          {node.children.map((childNode, index) => (
            <React.Fragment key={index}>{renderNode(childNode)}</React.Fragment>
          ))}
        </Heading>
      );
    case 'text':
      return <Text value={node.value} />;
    case 'bold':
      return (
        <Bold>
          {node.children.map((childNode, index) => (
            <React.Fragment key={index}>{renderNode(childNode)}</React.Fragment>
          ))}
        </Bold>
      );
    default:
      return null;
  }
};
```

PS: File a pull request if you want to contribute to the core of the project or to examples.
