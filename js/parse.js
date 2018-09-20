"use strict";

const BlockTypes = {
  "": 0x40,
  I32: 0x7f, I64: 0x7e, F32: 0x7d, F64: 0x7c,
  I: 0x7f, L: 0x7e, F: 0x7d, D: 0x7c
};

function AlnumWasmParser(str) {
  this.scope = [];
  this.labelNames = {};
  this.lexer = new Tokenizer(str);
  this.code = [];
  this.functions = [];
  this.exports = [];
  this.imports = [];
}

AlnumWasmParser.log2 = function (n, strict) {
  if ((n & (n-1) || n !== n || n < 0) && strict) {
    throw SyntaxError(n + ' is not power of 2');
  }
  var lv = 0;
  while (n > 1) {
    lv++;
    n >>= 1;
  }
  return lv;
};

AlnumWasmParser.writeInt = function (n, code) {
  n = n | 0;
  while (n >= 64 || n < -64) {
    code.push(n & 0x7F | 0x80);
    n >>= 7;
  }
  code.push(n & 0x7F);
};

AlnumWasmParser.writeUint = function (n, code) {
  while (n >= 128) {
    code.push(n & 0x7F | 0x80);
    n >>>= 7;
  }
  code.push(n);
};

AlnumWasmParser.prototype.parseExpr = function () {
  this.scope = [];
  this.labelNames = {};
  while (1) {
    var tok = this.lexer.next();
    if (tok === "") {
      throw SyntaxError("missing end of block");
    }
    var op = OpCodes[tok];
    this.code.push(op);
    if (op === void 0) {
      throw SyntaxError("unknown instruction: " + tok);
    }
    else if (op === OpCodes.BLOCK || op === OpCodes.LOOP || op === OpCodes.IF) {
      this.parseBlockOp();
    }
    else if (op === OpCodes.END) {
      if (this.scope.length === 0) break;
      var lbl = this.scope.pop();
      this.labelNames[lbl[0]] = lbl[1];
    }
    else if (op === OpCodes.BR || op === OpCodes.BRIF) {
      var name = this.lexer.next();
      var lv;
      if (/^\d+$/.test(name)) {
        lv = parseInt(name);
      }
      else {
        lv = this.labelNames[name];
        if (lv === void 0) {
          throw ReferenceError("label " + name + " is not defined");
        }
        else lv = this.scope.length - lv;
      }
      AlnumWasmParser.writeUint(lv, this.code);
    }
    else if (op === OpCodes.BRTABLE) {
      
    }
    else if (op === OpCodes.CALL) {
      var name = this.lexer.next();
      if (/^\d+$/.test(name)) {
        AlnumWasmParser.writeUint(parseInt(name), this.code);
      }
      else {
        this.code.push(["func", name]);
      }
    }
    else if (op === OpCodes.CALLINDIRECT) {
      var type = this.parseType();
      this.code.push(type);
      this.code.push(0x00);
    }
    else if (op >= OpCodes.GETLOCAL && op <= OpCodes.TEELOCAL) {
      var vname = this.lexer.next();
      if (/^\d+$/.test(vname)) {
        AlnumWasmParser.writeUint(parseInt(vname), this.code);
      }
      else {
        this.code.push(["local", vname]);
      }
    }
    else if (op >= OpCodes.GETGLOBAL && op <= OpCodes.SETGLOBAL) {
      var vname = this.lexer.next();
      if (/^\d+$/.test(vname)) {
        AlnumWasmParser.writeUint(parseInt(vname), this.code);
      }
      else {
        this.code.push(["global", vname]);
      }
    }
    else if (op >= OpCodes.I32LOAD && op <= OpCodes.I64STORE32) {
      this.parseMemoryOp();
    }
    else if (op === OpCodes.CURRENTMEMORY || op === OpCodes.GROWMEMORY) {
      this.code.push(0);
    }
    else if (op === OpCodes.I32CONST) {
      this.parseInt();
    }
    else if (op === OpCodes.I64CONST) {
      ;
    }
    else if (op === OpCodes.F32CONST || op === OpCodes.F64CONST) {
      this.parseFloat(op - OpCodes.F32CONST);
    }
  }
};

AlnumWasmParser.prototype.parseBlockOp = function () {
  var tok = this.lexer.next();
  if (tok === "LBL") {
    tok = this.lexer.next();
    if (!tok) throw SyntaxError("missing label name");
    if (/^\d+$/.test(tok)) throw SyntaxError("label name cannot be all digits");
    this.scope.push([tok, this.labelNames[tok]]);
    this.labelNames[tok] = this.scope.length;
  }
  else {
    this.scope.push(["", void 0]);
    this.lexer.backtrack();
  }
  tok = this.lexer.next();
  if (tok === "AS") {
    this.code.push(this.parseBasicType('block'));
  }
  else {
    this.lexer.backtrack();
    this.code.push(0x40);
  }
};

AlnumWasmParser.prototype.parseMemoryOp = function () {
  var tok = this.lexer.next();
  var align = 0;
  if (tok === "ALIGN") {
    tok = this.lexer.next();
    if (!tok) throw SyntaxError("missing alignment");
    if (!/^\d+$/.test(tok)) throw SyntaxError("alignment is not an integer");
    align = AlnumWasmParser.log2(parseInt(tok), true);
  }
  else this.lexer.backtrack();
  tok = this.lexer.next();
  var offset = 0;
  if (tok === "OFFSET" || tok === "OFF") {
    tok = this.lexer.next();
    if (!tok) throw SyntaxError("missing offset");
    if (!/^\d+$/.test(tok)) throw SyntaxError("offset is not an integer");
    offset = parseInt(tok);
  }
  else this.lexer.backtrack();
  AlnumWasmParser.writeUint(align, this.code);
  AlnumWasmParser.writeUint(offset, this.code);
};

AlnumWasmParser.prototype.parseInt = function () {
  var tok = this.lexer.next();
  if (!tok) throw SyntaxError("missing integer");
  var sign = 1;
  var n = tok;
  if (n[0] === 'M') { // minus
    n = n.substring(1);
    sign = -1;
  }
  n = parseInt(n);
  if (n !== n) throw SyntaxError(tok + ' is not an integer');
  AlnumWasmParser.writeInt(n * sign, this.code);
};

AlnumWasmParser.prototype.parseFloat = function (isDouble) {
  var tok = this.lexer.next();
  if (!tok) throw SyntaxError("missing float");
  tok = tok.replace("P", ".");
  tok = tok.replace(/M/g, "-");
  var n = parseFloat(tok);
  var dv = new DataView(new ArrayBuffer(8));
  var d;
  if (isDouble) {
    dv.setFloat64(0, n, true);
    d = dv.getUint32(0, true);
    this.code.push(d & 0xff, d>>8 & 0xff, d>>16 & 0xff, d>>24 & 0xff);
    d = dv.getUint32(4, true);
    this.code.push(d & 0xff, d>>8 & 0xff, d>>16 & 0xff, d>>24 & 0xff);
  }
  else {
    dv.setFloat32(0, n, true);
    d = dv.getUint32(0, true);
    this.code.push(d & 0xff, d>>8 & 0xff, d>>16 & 0xff, d>>24 & 0xff);
  }
};

AlnumWasmParser.prototype.parseName = function (kind) {
  var name = this.lexer.next();
  if (!name) throw SyntaxError('missing ' + kind);
  return name;
}

AlnumWasmParser.prototype.parseInlineExport = function (kind, name) {
  while (this.lexer.next() === "EXPORT") {
    var expoName = this.lexer.next();
    if (!expoName) throw SyntaxError('missing export name');
    expoName = this.lexer.word;
    this.exports.push([expoName, kind, name]);
  }
  this.lexer.backtrack();  
};

AlnumWasmParser.prototype.parseFunc = function () {
  var name = this.parseName('function name');
  this.parseInlineExport('func', name);
  var type = this.parseType();
  var locals = [];
  this.code = [];
  var t = this.lexer.next();
  if (t === "LOCAL") {
    locals = this.parseVarList();
    t = this.lexer.next();
  }
  if (t === "CODE") {
    this.parseExpr();
  }
  else throw SyntaxError('missing code');
  return [name, type, locals, this.code];
};

AlnumWasmParser.prototype.parseBasicType = function (what) {
  var tok = this.lexer.next();
  if (!tok) throw SyntaxError('missing '+ what +' type');
  var type = BlockTypes[tok];
  if (type === void 0) throw SyntaxError('unknown type ' + tok);
  return type;
};

AlnumWasmParser.prototype.parseType = function () {
  var tok = this.lexer.next();
  if (tok === "TYPE") {
    tok = this.parseName('type name');
    return ["type", tok];
  }
  else {
    this.lexer.backtrack();
    return this.parseArgs();
  }
};

AlnumWasmParser.prototype.parseVarList = function () {
  var param = [];
  var tok;
  do {
    var argname = this.lexer.next();
    if (!argname) throw SyntaxError('missing parameter');
    tok = this.lexer.next();
    if (tok === "AS") {
      param.push([argname, this.parseBasicType('parameter')]);
      tok = this.lexer.next();
    }
    else {
      var type = BlockTypes[argname];
      if (type === void 0) throw SyntaxError('unknown type ' + argname);
      param.push([param.length + "", type]);
    }
  } while (tok === "AND") ;
  this.lexer.backtrack();
  return param;
};

AlnumWasmParser.prototype.parseArgs = function () {
  var param = [];
  var result = [];
  var tok = this.lexer.next();
  if (tok === "PARAM") {
    param = this.parseVarList();
    tok = this.lexer.next();
  }
  else if (tok === "NOPARAM") {
    tok = this.lexer.next();
  }
  if (tok === "RESULT") {
    result.push(this.parseBasicType('result'));
  }
  else this.lexer.backtrack();
  return ['param', param, result];
};

AlnumWasmParser.prototype.parseSizeLimit = function () {
  var tok = this.lexer.next();
  var min = 0;
  var max = Infinity;
  if (tok === "MIN") {
    min = this.lexer.next();
    if (!/^\d+$/.test(min))
      throw SyntaxError(min + ' is not a valid memory size');
    min |= 0; // convert to integer
    tok = this.lexer.next();
  }
  if (tok === "MAX") {
    max = this.lexer.next();
    if (!/^\d+$/.test(max))
      throw SyntaxError(min + ' is not a valid memory size');
    max |= 0; // convert to integer
  }
  else this.lexer.backtrack();
  return {min: min, max: max};
};

AlnumWasmParser.prototype.parseImport = function () {
  this.lexer.next();
  var mod = this.lexer.word;
  if (!mod) throw SyntaxError('missing module name');
  if (this.lexer.next() !== "IMPORT") {
    throw SyntaxError('expected IMPORT, found ' + this.lexer.token);
  }
  this.lexer.next();
  var name = this.lexer.word;
  if (!name) throw SyntaxError('missing import name');
  if (this.lexer.next() !== "AS") {
    throw SyntaxError('expected AS, found ' + this.lexer.token);
  }
  var kind = this.lexer.next();
  var alias = this.parseName('alias');
  var options;
  if (kind === "MEMORY") {
    options = this.parseSizeLimit();
  }
  else if (kind === "FUNC") {
    options = this.parseType();
  }
  else {
    throw SyntaxError('unsupported kind of import: ' + kind);
  }
  this.imports.push([mod, name, kind, alias, options]);
};

AlnumWasmParser.prototype.parse = function () {
  var tok = this.lexer.next();
  while (tok) {
    if (tok === "FUNC") {
      this.functions.push(this.parseFunc());
    }
    else if (tok === "MEMORY") {
      // TODO
    }
    else if (tok === "FROM") {
      this.parseImport();
    }
    tok = this.lexer.next();
  }
};

var a = new AlnumWasmParser(
  "FROM 'Math' IMPORT 'rand' AS FUNC rand RESULT F64\n" +
  "FROM 'env' IMPORT 'mem' AS MEMORY 0\n" +
  "FUNC add EXPORT 'addint' PARAM a AS I32 AND b AS I32 RESULT I32\n" +
  "CODE\n" +
  "  GETLOCAL a GETLOCAL b IADD RETURN\n" +
  "END\n" +
  "FUNC recursiveTest\n" +
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
  "END\n"
);
a.parse();
console.log(JSON.stringify(a.functions));
console.log(JSON.stringify(a.imports));
console.log(JSON.stringify(a.exports));
