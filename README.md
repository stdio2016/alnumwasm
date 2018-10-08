# alnumwasm

Another way to write WebAssembly. Its syntax is simpler than the syntax of official WebAssembly text format, so I can write the parser quickly.

## Syntax

In Alnumwasm, there are two kinds of tokens, word and quoted string. A word is a string consists of alphabets and digits (0-9, A-Z, a-z). A quoted string is a string that is quoted with a pair of single quotes (') or double quotes ("). Quotes and backslashes in quoted strings must be escaped.

Tokens are separated with whitespace characters, and whitespace character is space, newline or tab. Any other character not in a token starts a line comment, so both semicolon (;) and hash (#) can be used as comment char.

Alnumwasm grammar looks like this:

```
module:
    <items>*

items:
    <typedef> | <import> | <func> | <table> | <memory> | <global>
```

**TODO**: support export section, start section, element section and data section.

```
typedef:  typedef <name> <funcsig>

import:   from <string> import <string> as <impkind>
impkind:  func <name> <functype>
          table <name> <tabletype>
          memory <name> <memorytype>
          global <name> <globaltype>

func:     func <name> (export <name>)* <functype> <locals>? code <expr>
locals:   local <vars>

table:    table <name> (export <string>)* <tabletype>
memory:   memory <name> (export <string>)* <memorytype>
global:   global <name> (export <string>)* <globaltype> (init <expr>)?

functype:   type <name> | <funcsig>
tabletype:  (min <num>)? (max <num>)? as <elemtype>
memorytype: (min <num>)? (max <num>)?
globaltype: as mut? <valtype>

funcsig:  (param <vars> | noparam)? (result <valtype>)?
vars:     <var> (and <var>)*
var:      <name> as <valtype> | <valtype>

valtype:  i32 | i64 | f32 | f64
          I   | L   | F   | D    ;; abbreviation
elemtype: anyfunc
```

Instructions:

```
expr:
  <instr>* end

instr:
  block (lbl <name>)? <blocktype>? <instr>* end
  loop (lbl <name>)? <blocktype>? <instr>* end
  if (lbl <name>)? <blocktype>? <instr>* end
  if (lbl <name>)? <blocktype>? <instr>* else <instr>* end
  <op>

blocktype: as <valtype>

op:
  unreachable
  nop
  br <name>
  brif <name>
    ;; TODO: brtable
  return
  call <name>
  (callindirect | callind) <functype>
  drop | pop
  select
  (getlocal | get) <name>
  (setlocal | set) <name>
  teelocal <name>
  getglobal <name>
  setglobal <name>
  <valtype>load((8|16|32)<sign>)? <align>? <offset>?
  <valtype>store((8|16|32)<sign>)? <align>? <offset>?
  currentmemory
  growmemory
  (i32const | iconst) <int>
    ;; TODO: i64const
  (f32const | fconst) <float>
  (f64const | dconst) <float>
  (i32 | i64 | I | L)(<intcmp> | <intarith>)
  (f32 | f64 | F | D)(<floatcmp> | <floatarith>)
  i32wrapi64 | L2I
  i32truncsf32 | F2SI
  i32turncuf32 | F2UI
  i32truncsf64 | D2SI
  i32truncuf64 | D2UI
  i64extendsi32 | SI2L
  i64extendui32 | UI2L
  i64truncsf32 | F2SL
  i64truncuf32 | F2UL
  i64truncsf64 | D2SL
  i64truncuf64 | D2UL
  f32convertsi32 | SI2F
  f32convertui32 | UI2F
  f32convertsi64 | SL2F
  f32convertui64 | UL2F
  f32demotef64 | D2F
  f64convertsi32 | SI2D
  f64convertui32 | UI2D
  f64convertsi64 | SL2D
  f64convertui64 | UL2D
  f64promotef32 | F2D
  i32reinterpretf32 | ireinterpretf
  i64reinterpretf64 | lreinterpretd
  f32reinterpreti32 | freinterpreti
  f64reinterpreti64 | dreinterpretl
  
sign:   s|u
align:  align (1|2|4|8|...)
offset: (off | offset) <num>
intcmp: eqz | eq | ne | lts | ltu | gts | gtu | les | leu | ges | geu
intarith: clz | ctz | popcnt | add | sub | mul | divs | divu | rems | remu
        | and | or | xor | shl | shrs | shru | rotl | rotr
floatcmp: eq | ne | lt | gt | le | ge
floatarith: abs | neg | ceil | floor | trunc | nearest | sqrt
          | add | sub | mul | div | min | max | copysign
```

Instruction names are the same as in WebAssembly text format, with dots, underscopes and slashed removed. For example, `i32.shr_s` is `i32shrs` in Alnumwasm, and `i32.trunc_s/f32` is `i32truncsf32` in Alnumwasm.

Type of arithmetic and comparison ops can be abbreviated as a single letter. For example, `i32shrs` is the same as `ishrs`.

Conversion ops can be written as `<from type>2<to type>`. Note that conversion from and to integer needs to specify the signedness.

Tokens:

```
char1:    any character except single quote and backslash
char2:    any character except double quote and backslash
hex:      0-9, A-F, and a-f
digit:    0-9
alphabet: A-Z, and a-z

word:     (<digit> | <alphabet>)+ ;; a word token
quoted:   "(<char2> | <escaped>)*"
          '(<char1> | <escaped>)*'
escape:   \n | \t | \\ | \' | \" | \x<hex><hex> | \u<hex><hex><hex><hex>
num:      <digit>+                ;; non negative integer
name:     <word>                  ;; case insensitive
string:   <word> | <quoted>       ;; case sensitive

hexnum:   <hex>+
nat:      <num> | 0x<hexnum>
int:      <nat> | m<nat>
float:    m?<num>(p<num>?)?(Em?<num>)? ;; TODO: hex format float
;; m means minus
;; p means decimal point
```

In Alnumwasm, most tokens are case-insensitive, so `FUNC ABC RESULT I32` is the same as `func abc result i32`. But to support case-sensitive language, import and export strings are case-sensitive.

## Note

Because I want to write this program quickly, the program doesn't validate the bytecodes, and does not check every syntax rules. It is possible to write a syntax error code that compiles.

Inspired by: https://github.com/WebAssembly/spec/tree/master/interpreter
