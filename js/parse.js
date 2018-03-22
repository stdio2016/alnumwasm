"use strict";

const OpCodes = {
  UNREACHABLE: [0x0,0],
  NOP: [0x1,0],
  BLOCK: [0x2,1], // block lbl type ... end
  LOOP: [0x3,1],
  IF: [0x4,1],
  ELSE: [0x5,0],
  END: [0xb,2], // end
  BR: [0xc,3], // br label
  BRIF: [0xd,3],
  BRTABLE: [0xe,4], // brtable label and ...
  RETURN: [0xf,0], // return
  CALL: [0x10,5], // call funname
  CALLINDIRECT: [0x11,6], CALLIND: [0x11,6], // callindirect typename
  DROP: [0x1a,0], POP: [0x1a,0],
  SELECT: [0x1b,0],
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
  return t;
}

function parseMy(str) {
  var tok = {str: str, pos: 0, lineno: 0};
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
  var param = [], ret = "NONE", type = "", local = [];
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
  var code = parseExpr(tok, "");
  return {
    name: name,
    type: type,
    param: param,
    ret: ret,
    local: local,
    code: code
  };
}

function parseExpr(tok, begin) {
  var t = nextToken(tok);
  var tt = t.toUpperCase();
  var code = [begin];
  while (t !== "" && tt !== "END") {
    switch (tt) {
      case "BLOCK": case "LOOP": case "IF":
        code.push(parseExpr(tok, tt)); break;
      default:
        code.push(t);
    }
    t = nextToken(tok);
    tt = t.toUpperCase();
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
  getlocal a getlocal b i32lt
  if
    i32const 1
  else
    getlocal a
  end
end
`));
