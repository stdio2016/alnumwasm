"use strict";

const BlockTypes = {
  "": 0x40,
  I32: 0x7f, I64: 0x7e, F32: 0x7d, F64: 0x7c,
  I: 0x7f, L: 0x7e, F: 0x7d, D: 0x7c
};

function AlnumWasmParser(str) {
  this.scope = [];
  this.labelNames = {};
  this.locals = {};
  this.lexer = new Tokenizer(str);
  this.code = [];
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
      
    }
    else if (op >= OpCodes.GETLOCAL && op <= OpCodes.TEELOCAL) {
      var vname = this.lexer.next();
      if (/^\d+$/.test(vname)) {
        AlnumWasmParser.writeUint(parseInt(vname), this.code);
      }
      else if (this.locals[vname]) {
        AlnumWasmParser.writeUint(this.locals[vname], this.code);
      }
      else {
        throw ReferenceError("variable " + vname + " is not defined");
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
    tok = this.lexer.next();
    if (!tok) throw SyntaxError("missing type name");
    var type = BlockTypes[tok];
    if (type === void 0) {
      throw SyntaxError("unknown type " + type);
    }
    this.code.push(type);
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

function parseParams(tok) {
  var param = [];
  var t;
  do {
    let type = nextToken(tok), pname = "";
    t = nextToken(tok).toUpperCase();
    if (t.toUpperCase() === "AS") {
      pname = type;
      type = nextToken(tok).toUpperCase();
      t = nextToken(tok).toUpperCase();
    }
    param.push({name: pname, type: type.toUpperCase()});
  } while (t === "AND") ;
  return [param, t];
}

function parseFun(tok) {
  var name = nextToken(tok);
  var t = nextToken(tok).toUpperCase();
  var param = [], ret = "", type = "", local = [];
  if (t === "TYPE") {
    type = nextToken(tok);
    t = nextToken(tok).toUpperCase();
  }
  if (t === "PARAM") {
    [param, t] = parseParams(tok);
  }
  if (t === "RET") {
    ret = nextToken(tok).toUpperCase();
    t = nextToken(tok).toUpperCase();
  }
  if (t === "LOCAL") {
    [local, t] = parseParams(tok);
  }
  if (t !== "CODE") {
    throw SyntaxError("function without code at line "+tok.lineno);
  }
  var code = parseExpr(tok);
  return {
    name: name,
    type: type,
    param: param,
    ret: ret,
    local: local,
    code: code
  };
}

function parseLbl(tok, name) {
  if (nextUpperCaseToken(tok) === name) {
    return nextToken(tok);
  }
  tok.reverted = true;
  return "";
}

function parseExpr(tok, locals) {
  var t = nextUpperCaseToken(tok);
  var code = [];
  var depth = 0;
  var name, type;
  var brtargets = {};

  while ((depth > 0 || t !== "END") && t !== "") {
    var decoded = OpCodes[t];
    if (!decoded) {
      throw SyntaxError("unknown instruction "+t+" at line "+tok.lineno);
    }
    code.push(decoded[1]);
    switch (decoded[0]) {
      case 0: // simple instruction
        break;
      case 1: // block, loop, if
        depth++;
        name = parseLbl(tok, "LBL");
        if (brtargets[name]) throw ReferenceError("redeclaration of label "+name+" at line "+tok.lineno);
        brtargets[name] = depth;
        type = parseLbl(tok, "AS").toUpperCase();
        if (type in BlockTypes) code.push(BlockTypes[type]);
        else throw ReferenceError("unknown block type "+type+" at line "+tok.lineno);
        break;
      case 2: // end
        depth--;
        break;
      default:
        throw Error("unimplemented instruction type " + decoded[0]);
    }
    t = nextUpperCaseToken(tok);
  }
  if (t === "") throw SyntaxError("missing end of block at line "+tok.lineno);
  return code;
}

console.dir(parseMy(`fun abc type 432 param a as i32 and b as i32 ret i32
rem This is really Cool!
endrem rem endrem
local c as i32
  and d as i32
code
  rem
    if a < b then 1 else a
  endrem
  if lbl rr as i32
    drop
  else
    drop
  end
end
`));
