import { NodeType } from "./parser.ts";
import type { ASTNode } from "./parser.ts";

function fillSpace(size: number): string {
  let n = 1;
  let s = "";
  while (n <= size) {
    s += " ";
    n++;
  }
  return s;
}

export function toHtml(root: ASTNode, incSize = 0): string {
  let output = "";
  if (root.nodeType === NodeType.RootNode) {
    output += "<html>\n";
  }
  const inc = fillSpace(incSize);
  const nextInc = incSize + 3;
  for (const child of root.children) {
    switch (child.nodeType) {
      case NodeType.Bold:
        output += `${inc}<strong>`;
        output += toHtml(child);
        output += `${inc}</strong>\n`;
        break;
      case NodeType.NewLineNode:
        output += `${inc}<br>\n`;
        break;
      case NodeType.SpaceNode:
        output += `${inc}<span> </span>`;
        break;
      case NodeType.StringNode:
        output += `${inc}<span>`;
        output += child.token.tokenValue;
        output += `${inc}</span>\n`;
        break;
      case NodeType.Italic:
        output += `${inc}<i>`;
        output += toHtml(child);
        output += `${inc}</i>\n`;
        break;
      case NodeType.Header1:
        output += `${inc}<h1>\n`;
        output += toHtml(child, nextInc);
        output += `${inc}\n</h1>\n`;
        break;
      case NodeType.Header2:
        output += `${inc}<h2>\n`;
        output += toHtml(child, nextInc);
        output += `${inc}\n</h2>\n`;
        break;
      case NodeType.Header3:
        output += `${inc}<h3>\n`;
        output += toHtml(child, nextInc);
        output += `${inc}\n</h3>\n`;
        break;
      case NodeType.Header4:
        output += `${inc}<h4>\n`;
        output += toHtml(child, nextInc);
        output += `${inc}\n</h4>\n`;
        break;
      case NodeType.Header5:
        output += `${inc}<h5>\n`;
        output += toHtml(child, nextInc);
        output += `${inc}\n</h5>\n`;
        break;
      case NodeType.Monospace:
        output += `${inc}<code>`;
        output += toHtml(child);
        output += `${inc}</code>\n`;
        break;
      case NodeType.UnorderedListRoot:
        output += `${inc}<ul>\n`;
        output += inc + toHtml(child, nextInc);
        output += `${inc}\n</ul>\n`;
        break;
      case NodeType.UnorderedListItem:
        output += "<li>\n";
        output += inc + toHtml(child);
        output += `${inc}\n</li>\n`;
    }
  }
  if (root.nodeType === NodeType.RootNode) {
    output += "\n</html>";
  }
  return output;
}
