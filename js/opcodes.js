"use strict";
const OpCodes = {
// block [lbl <name>] [as <type>] ... end
  BLOCK: 0x2,
  LOOP: 0x3,
  IF: 0x4,

// end of block
  END: 0xB,

// br <label>
  BR: 0xC,
  BRIF: 0xD,

// brtable <label> ... else ...
  BRTABLE: 0xE,

// call <funname>
  CALL: 0x10,

// callindirect <typename>
  CALLINDIRECT: 0x11, CALLIND: 0x11,

// getlocal <name>
  GETLOCAL: 0x20, GET: 0x20,
  SETLOCAL: 0x21, SET: 0x21,
  TEELOCAL: 0x22,
  GETGLOBAL: 0x23,
  SETGLOBAL: 0x24,

// op [align <n>] [offset/off <n>]
  I32LOAD: 0x28, ILOAD: 0x28,
  I64LOAD: 0x29, LLOAD: 0x29,
  F32LOAD: 0x2A, FLOAD: 0x2A,
  F64LOAD: 0x2B, DLOAD: 0x2B,
  I32LOAD8S: 0x2C, ILOAD8S: 0x2C,
  I32LOAD8U: 0x2D, ILOAD8U: 0x2D,
  I32LOAD16S: 0x2E, ILOAD16S: 0x2E,
  I32LOAD16U: 0x2F, ILOAD16U: 0x2F,
  I64LOAD8S: 0x30, LLOAD8S: 0x30,
  I64LOAD8U: 0x31, LLOAD8U: 0x31,
  I64LOAD16S: 0x32, LLOAD16S: 0x32,
  I64LOAD16U: 0x33, LLOAD16U: 0x33,
  I64LOAD32S: 0x34, LLOAD32S: 0x34,
  I64LOAD32U: 0x35, LLOAD32U: 0x35,
  I32STORE: 0x36, ISTORE: 0x36,
  I64STORE: 0x37, LSTORE: 0x37,
  F32STORE: 0x38, FSTORE: 0x38,
  F64STORE: 0x39, DSTORE: 0x39,
  I32STORE8: 0x3A, ISTORE8: 0x3A,
  I32STORE16: 0x3B, ISTORE16: 0x3B,
  I64STORE8: 0x3C, LSTORE8: 0x3C,
  I64STORE16: 0x3D, LSTORE16: 0x3D,
  I64STORE32: 0x3E, LSTORE32: 0x3E,

// might add memory argument
  CURRENTMEMORY: 0x3F,
  GROWMEMORY: 0x40,

// constant
  I32CONST: 0x41, ICONST: 0x41,
  I64CONST: 0x42, LCONST: 0x42,
  F32CONST: 0x43, FCONST: 0x43,
  F64CONST: 0x44, DCONST: 0x44,

// simple ops
  UNREACHABLE: 0x0,
  NOP: 0x1,
  ELSE: 0x5,
  RETURN: 0xF,
  DROP: 0x1A, POP: 0x1A,
  SELECT: 0x1B,

// arithmetic and comparison ops at bottom

  I32WRAPI64: 0xA7, L2I: 0xA7,
  I32TRUNCSF32: 0xA8, F2SI: 0xA8,
  I32TRUNCUF32: 0xA9, F2UI: 0xA9,
  I32TRUNCSF64: 0xAA, D2SI: 0xAA,
  I32TRUNCUF64: 0xAB, D2UI: 0xAB,
  I64EXTENDSI32: 0xAC, SI2L: 0xAC,
  I64EXTENDUI32: 0xAD, UI2L: 0xAD,
  I64TRUNCSF32: 0xAE, F2SL: 0xAE,
  I64TRUNCUF32: 0xAF, F2UL: 0xAF,
  I64TRUNCSF64: 0xB0, D2SL: 0xB0,
  I64TRUNCUF64: 0xB1, D2UL: 0xB1,

  F32CONVERTSI32: 0xB2, SI2F: 0xB2,
  F32CONVERTUI32: 0xB3, UI2F: 0xB3,
  F32CONVERTSI64: 0xB4, SL2F: 0xB4,
  F32CONVERTUI64: 0xB5, UL2F: 0xB5,
  F32DEMOTEF64: 0xB6, D2F: 0xB6,
  F64CONVERTSI32: 0xB7, SI2D: 0xB7,
  F64CONVERTUI32: 0xB8, UI2D: 0xB8,
  F64CONVERTSI64: 0xB9, SL2D: 0xB9,
  F64CONVERTUI64: 0xBA, UL2D: 0xBA,
  F64PROMOTEF32: 0xBB, F2D: 0xBB,
  
  I32REINTERPRETF32: 0xBC, IREINTERPRETF: 0xBC,
  I64REINTERPRETF64: 0xBD, LREINTERPRETD: 0xBD,
  F32REINTERPRETI32: 0xBE, FREINTERPRETI: 0xBE,
  F64REINTERPRETI64: 0xBF, DREINTERPRETL: 0xBF
};
(function () {
  function addOp(op, names, types, short) {
    for (var i = 0; i < types.length; i++) {
      for (var j = 0; j < names.length; j++) {
        OpCodes[types[i] + names[j]] = op;
        OpCodes[short[i] + names[j]] = op;
        op++;
      }
    }
  }
  addOp(
    0x45,
    ["EQZ","EQ","NE", "LTS","LTU","GTS","GTU","LES","LEU","GES","GEU"],
    ["I32", "I64"], "IL"
  );
  addOp(
    0x5B,
    ["EQ","NE","LT","GT","LE","GE"],
    ["F32", "F64"], "FD"
  );
  addOp(
    0x67,
    [
      "CLZ","CTZ","POPCNT","ADD","SUB","MUL","DIVS","DIVU","REMS","REMU",
      "AND","OR","XOR","SHL","SHRS","SHRU","ROTL","ROTR"
    ],
    ["I32", "I64"], "IL"
  );
  addOp(
    0x8B,
    [
      "ABS","NEG","CEIL","FLOOR","TRUNC","NEAREST","SQRT",
      "ADD","SUB","MUL","DIV","MIN","MAX","COPYSIGN"
    ],
    ["F32", "F64"], "FD"
  );
})();
