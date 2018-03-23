"use strict";

const OpCodes = {
  UNREACHABLE: [0,0x0],
  NOP: [0,0x1],
  BLOCK: [1,0x2], // block lbl type ... end
  LOOP: [1,0x3],
  IF: [1,0x4],
  ELSE: [0,0x5],
  END: [2,0xb], // end
  BR: [3,0xc], // br label
  BRIF: [3,0xd],
  BRTABLE: [4,0xe], // brtable label and ...
  RETURN: [0,0xf], // return
  CALL: [5,0x10], // call funname
  CALLINDIRECT: [6,0x11], CALLIND: [6,0x11], // callindirect typename
  DROP: [0,0x1a],
  SELECT: [0,0x1b],
};

const BlockTypes = {
  "": 0x40,
  I32: 0x7f, I64: 0x7e, F32: 0x7d, F64: 0x7c,
  I: 0x7f, L: 0x7e, F: 0x7d, D: 0x7c
};

function nextTokenNoRem(tokenizer) {
  var i, j;
  var str = tokenizer.str, lineno = tokenizer.lineno;
  for (i = tokenizer.pos; i < str.length; i++) {
    let ch = str.charAt(i);
    if (ch === "\n") ++lineno;
    if (/^\S/.test(ch)) break;
  }
  for (j = i + 1; j < str.length; j++) {
    let ch = str.charAt(j);
    if (/^\s/.test(ch)) break;
  }
  tokenizer.lineno = lineno;
  tokenizer.pos = j;
  return str.substring(i, j);
}

function nextToken(tokenizer) {
  if (tokenizer.reverted) {
    tokenizer.reverted = false;
    return tokenizer.now;
  }
  var t = nextTokenNoRem(tokenizer), depth = 0;
  while (t.toUpperCase() === "REM") {
    depth = 1;
    do {
      t = nextTokenNoRem(tokenizer);
      let tt = t.toUpperCase();
      if (tt === "REM") ++depth;
      else if (tt === "ENDREM") --depth;
    } while (depth > 0 && t !== "") ;
    t = nextTokenNoRem(tokenizer);
  }
  tokenizer.now = t;
  return t;
}

function nextUpperCaseToken(tok) {
  return nextToken(tok).toUpperCase();
}

function parseMy(str) {
  var tok = {str: str, pos: 0, lineno: 0, reverted: false, now: ""};
  var funs = [];
  while (tok.pos < tok.str.length) {
    var t = nextToken(tok).toUpperCase();
    if (t === "FUN") {
      funs.push(parseFun(tok));
    }
  }
  return funs;
}

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
