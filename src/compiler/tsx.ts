// TSX → scene calls.
//
// A TypeScript `before` transformer rewrites JSX into `jsx(type, props, ...)`
// calls and wraps dynamic expressions so the runtime can bind them without
// re-running the component:
//
//   <div title={name()}>Count: {count()}</div>
//   → _tjsx("div", { title: () => name() }, "Count: ", _tdynamic(() => count()))
//
// Event props, key/ref, and function-valued props are not wrapped: they are
// callbacks, not reactive reads. The transformer runs inside ts.transpileModule,
// so there is no second grammar and no JSX left in the output.

import ts from 'typescript'

const RUNTIME_MODULE = '@devansharora18/tardisjs/scene'
const JSX = '_tjsx'
const DYNAMIC = '_tdynamic'
const FRAGMENT = '_tFragment'

export interface TsxCompileResult {
  code: string
  diagnostics: string[]
}

const EVENT_PROP = /^on[A-Z]/

export function compileTsx(source: string, fileName = 'app.tsx'): TsxCompileResult {
  const diagnostics: string[] = []
  const result = ts.transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      esModuleInterop: true,
      sourceMap: false,
    },
    transformers: { before: [createTransformer(diagnostics)] },
  })

  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      diagnostics.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    }
  }

  return { code: result.outputText, diagnostics }
}

function createTransformer(diagnostics: string[]): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const factory = context.factory
    let usedJsx = false

    const id = (name: string): ts.Identifier => factory.createIdentifier(name)
    const call = (name: string, args: ts.Expression[]): ts.CallExpression =>
      factory.createCallExpression(id(name), undefined, args)

    const visitExpression = (node: ts.Expression): ts.Expression => {
      return ts.visitNode(node, visit) as ts.Expression
    }

    const transformTag = (tag: ts.JsxTagNameExpression): ts.Expression => {
      if (ts.isIdentifier(tag)) {
        const name = tag.text
        const first = name.charAt(0)
        if (first && first === first.toLowerCase()) return factory.createStringLiteral(name)
        return factory.createIdentifier(name)
      }
      if (ts.isPropertyAccessExpression(tag)) {
        return tag as unknown as ts.Expression
      }
      diagnostics.push(`unsupported JSX tag name: ${tag.getText()}`)
      return factory.createStringLiteral(tag.getText())
    }

    const transformProps = (attributes: ts.JsxAttributes): ts.ObjectLiteralExpression => {
      const properties: ts.ObjectLiteralElementLike[] = []
      for (const attr of attributes.properties) {
        if (ts.isJsxSpreadAttribute(attr)) {
          properties.push(factory.createSpreadAssignment(visitExpression(attr.expression)))
          continue
        }
        const name = attributeName(attr.name)
        if (name === null) {
          diagnostics.push(`unsupported JSX attribute: ${attr.getText()}`)
          continue
        }
        let value: ts.Expression
        if (attr.initializer === undefined) {
          value = factory.createTrue()
        } else if (ts.isStringLiteral(attr.initializer)) {
          value = factory.createStringLiteral(attr.initializer.text)
        } else if (ts.isJsxExpression(attr.initializer)) {
          const expression = attr.initializer.expression
          if (!expression) {
            value = factory.createTrue()
          } else {
            const visited = visitExpression(expression)
            if (isStaticProp(name, expression)) {
              value = visited
            } else {
              value = factory.createArrowFunction(
                undefined,
                undefined,
                [],
                undefined,
                factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                visited
              )
            }
          }
        } else {
          value = visitExpression(attr.initializer as unknown as ts.Expression)
        }
        properties.push(factory.createPropertyAssignment(propertyName(factory, name), value))
      }
      return factory.createObjectLiteralExpression(properties, false)
    }

    const transformChildren = (children: readonly ts.JsxChild[]): ts.Expression[] => {
      const out: ts.Expression[] = []
      for (const child of children) {
        if (ts.isJsxText(child)) {
          const text = cleanJsxText(child.text)
          if (text) out.push(factory.createStringLiteral(text))
          continue
        }
        if (ts.isJsxExpression(child)) {
          if (!child.expression) continue
          const expression = visitExpression(child.expression)
          out.push(
            call(DYNAMIC, [
              factory.createArrowFunction(
                undefined,
                undefined,
                [],
                undefined,
                factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                expression
              ),
            ])
          )
          continue
        }
        out.push(transformJsx(child))
      }
      return out
    }

    const transformJsx = (
      node: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment
    ): ts.Expression => {
      usedJsx = true
      if (ts.isJsxFragment(node)) {
        return call(JSX, [
          id(FRAGMENT),
          factory.createObjectLiteralExpression([], false),
          ...transformChildren(node.children),
        ])
      }
      const opening = ts.isJsxElement(node) ? node.openingElement : node
      const tag = transformTag(opening.tagName)
      const props = transformProps(opening.attributes)
      const children = ts.isJsxElement(node) ? transformChildren(node.children) : []
      return call(JSX, [tag, props, ...children])
    }

    const visit: ts.Visitor = (node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
        return transformJsx(node)
      }
      return ts.visitEachChild(node, visit, context)
    }

    return (sourceFile) => {
      let visited = ts.visitEachChild(sourceFile, visit, context)
      if (!usedJsx) return visited
      const specifiers = [
        factory.createImportSpecifier(false, factory.createIdentifier('jsx'), id(JSX)),
        factory.createImportSpecifier(false, factory.createIdentifier('dynamic'), id(DYNAMIC)),
        factory.createImportSpecifier(false, factory.createIdentifier('Fragment'), id(FRAGMENT)),
      ]
      const runtimeImport = factory.createImportDeclaration(
        undefined,
        factory.createImportClause(false, undefined, factory.createNamedImports(specifiers)),
        factory.createStringLiteral(RUNTIME_MODULE)
      )
      visited = factory.updateSourceFile(visited, [runtimeImport, ...visited.statements])
      return visited
    }
  }
}

function propertyName(
  factory: ts.NodeFactory,
  name: string
): ts.PropertyName {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
    ? factory.createIdentifier(name)
    : factory.createStringLiteral(name)
}

function attributeName(name: ts.JsxAttributeName): string | null {
  if (ts.isIdentifier(name)) return name.text
  return null
}

function isStaticProp(name: string, expression: ts.Expression): boolean {
  if (EVENT_PROP.test(name)) return true
  if (name === 'key' || name === 'ref') return true
  if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) return true
  return false
}

// Mirrors the JSX whitespace rules closely enough for real layouts:
// indentation collapses, inline spaces survive. `Hello <b>x</b>` keeps the
// space before the tag; a text node that ends with a newline does not.
export function cleanJsxText(raw: string): string {
  if (!raw) return ''
  const startsWithNewline = /^[ \t]*\n/.test(raw)
  const endsWithNewline = /\n[ \t]*$/.test(raw)
  let out = raw.replace(/[ \t]*\n[ \t]*/g, ' ').replace(/[ \t]+/g, ' ')
  if (startsWithNewline) out = out.replace(/^ /, '')
  if (endsWithNewline) out = out.replace(/ $/, '')
  if (out.trim() === '') {
    return /^[ \t]+$/.test(raw) ? ' ' : ''
  }
  return out
}
