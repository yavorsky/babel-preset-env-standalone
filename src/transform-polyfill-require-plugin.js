// Copyright (c) Babel

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

function isPolyfillSource(value) {
  return value === "babel-polyfill" || value === "core-js";
}

export default function ({ types: t }) {
  function createImportDeclaration(polyfill) {
    let declar = t.importDeclaration([], t.stringLiteral(polyfill));
    declar._blockHoist = 3;
    return declar;
  }

  function createRequireStatement(polyfill) {
    return t.expressionStatement(
      t.callExpression(
        t.identifier("require"),
        [
          t.stringLiteral(polyfill)
        ]
      )
    );
  }

  function isRequire(path) {
    return t.isExpressionStatement(path.node) &&
      t.isCallExpression(path.node.expression) &&
      t.isIdentifier(path.node.expression.callee) &&
      path.node.expression.callee.name === "require" &&
      path.node.expression.arguments.length === 1 &&
      t.isStringLiteral(path.node.expression.arguments[0]) &&
      isPolyfillSource(path.node.expression.arguments[0].value);
  }

  function createImport(polyfill, requireType, core) {
    if (core) {
      polyfill = `core-js/modules/${polyfill}`;
    }

    if (requireType === "import") {
      return createImportDeclaration(polyfill);
    } else {
      return createRequireStatement(polyfill);
    }
  }

  function createImports(polyfills, requireType, regenerator) {
    let imports = polyfills
    .filter((el, i, arr) => arr.indexOf(el) === i)
    .map((polyfill) => createImport(polyfill, requireType, true));

    return [
      ...imports,
      regenerator && createImport("regenerator-runtime/runtime", requireType)
    ].filter(Boolean);
  }

  const isPolyfillImport = {
    ImportDeclaration(path, state) {
      if (path.node.specifiers.length === 0 &&
          isPolyfillSource(path.node.source.value)) {
        this.numPolyfillImports++;
        if (this.numPolyfillImports > 1) {
          path.remove();
          return;
        }

        path.replaceWithMultiple(
          createImports(state.opts.polyfills, "import", state.opts.regenerator)
        );
      }
    },
    Program(path, state) {
      if (!state.opts.polyfills) {
        throw path.buildCodeFrameError(`
There was an issue in "babel-preset-env" such that
the "polyfills" option was not correctly passed
to the "transform-polyfill-require" plugin
`);
      }
      path.get("body").forEach((bodyPath) => {
        if (isRequire(bodyPath)) {
          this.numPolyfillImports++;
          if (this.numPolyfillImports > 1) {
            path.remove();
            return;
          }

          bodyPath.replaceWithMultiple(
            createImports(state.opts.polyfills, "require", state.opts.regenerator)
          );
        }
      });
    }
  };

  return {
    name: "transform-polyfill-require",
    visitor: isPolyfillImport,
    pre() {
      this.numPolyfillImports = 0;
    }
  };
}
