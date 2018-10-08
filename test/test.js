var a = new AlnumWasmParser(
  "FROM 'Math' IMPORT 'random' AS FUNC rand RESULT F64\n" +
  "FROM 'env' IMPORT 'mem' AS MEMORY 0\n" +
  "FROM 'env' IMPORT 'winsize' AS GLOBAL winsize AS I32\n" +
  "FROM 'env' IMPORT 'tbl' AS TABLE 0 AS ANYFUNC\n" +
  "TYPEDEF 2 PARAM I32 AND I32 AND I32\n" +
  "TYPEDEF drd PARAM F64 RESULT F64\n" +
  "TYPEDEF happy NOPARAM RESULT F64\n" +
  "GLOBAL abc AS I32 INIT ICONST 123 END\n" +
  "FUNC add EXPORT 'addint' PARAM a AS I32 AND b AS I32 RESULT I32\n" +
  "CODE\n" +
  "  GETLOCAL a GETLOCAL b IADD RETURN\n" +
  "END\n" +
  "FUNC recursiveTest EXPORT rt\n" +
  "CODE\n" +
  "    ICONST 0\n" +
  "    ICONST 0 ILOAD ICONST 1 IADD\n" +
  "  ISTORE\n" +
  "  CALL recursiveTest\n" +
  "END\n" +
  "FUNC dyncall PARAM a AS F64\n" +
  "LOCAL r AS F64\n" +
  "CODE\n" +
  "  GETLOCAL a ICONST 0 CALLINDIRECT TYPE drd SETLOCAL r\n" +
  "END\n" +
  "FUNC aa TYPE 2 CODE END\n"
);
a.parse();
console.log(JSON.stringify(a.functions));
console.log(JSON.stringify(a.imports));
console.log(JSON.stringify(a.exports));

var b = new AlnumWasmCompiler(a.lexer.str);
var buf = b.compile();
WebAssembly.compile(buf).then(function (r) {
  window.hello = r;
  window.mem = new WebAssembly.Memory({initial: 1});
  window.tbl = new WebAssembly.Table({element: 'anyfunc', initial: 1});
  console.log('hello webassembly');
  return WebAssembly.instantiate(hello, {
    Math: Math,
    env: {mem: mem, winsize: 4, tbl: tbl}
  });
}).catch(function (e) {
  console.log(e);
}).then(function (y) {
  window.hello2 = y;
  console.log('instantiated!');
}).catch(function (e) {
  console.log(e);
});
