function Tokenizer(str) {
  this.str = str;
  this.pos = 0;
  this.word = "";
  this.token = "";
  this.lineno = 1;
  this.lineStart = 0;
  this.prevLineStart = 0;
  this.type = 0;
  this.rewinded = false;
}

Tokenizer.prototype.getChar = function getChar() {
  var ch = this.str.charAt(this.pos);
  this.pos++;
  if (ch === '\n') {
    this.line++;
    this.prevLineStart = this.lineStart;
    this.lineStart = this.pos;
  }
  return ch;
};

Tokenizer.prototype.rewind = function rewind() {
  this.pos--;
  var ch = this.str.charAt(this.pos);
  if (ch === '\n') {
    this.line--;
    this.lineStart = this.prevLineStart;
  }
};

Tokenizer.TOKEN_CHAR = /^[0-9A-Za-z]/;
Tokenizer.NO_TOKEN = 0;
Tokenizer.WORD_TOKEN = 1;
Tokenizer.STR_TOKEN = 2;
Tokenizer.COMMENT = 3;

Tokenizer.prototype.readWord = function readWord() {
  // skip space
  var ch;
  do {
    ch = this.getChar();
  }
  while (/^\s/.test(ch)) ;
  this.type = Tokenizer.NO_TOKEN;

  // at end
  if (this.pos >= this.str.length) return "";
  
  if (Tokenizer.TOKEN_CHAR.test(ch)) {
    // token
    this.type = Tokenizer.WORD_TOKEN;
    var i = this.pos - 1;
    while (Tokenizer.TOKEN_CHAR.test(this.getChar())) ;
    this.rewind();
    return this.str.substring(i, this.pos);
  }
  else if (ch === '"' || ch === "'") {
    // string
    this.type = Tokenizer.STR_TOKEN;
    return this.readQuoted(ch);
  }
  else {
    // comment
    do {
      ch = this.getChar();
    } while (ch !== '' && ch !== '\n') ;
  }
  this.type = Tokenizer.COMMENT;
  return "";
};

Tokenizer.prototype.readQuoted = function readQuoted(endChar) {
  var ch , out = "";
  while ((ch = this.getChar()) !== endChar) {
    if (ch === '') return out;
    if (ch === '\\') {
      ch = this.getChar();
      switch (ch) {
        case 'n': out += '\n'; break;
        case 't': out += '\t'; break;
        case 'r': out += '\r'; break;
        case 'b': out += '\b'; break;
        case 'f': out += '\f'; break;
        case 'v': out += '\v'; break;
        case 'x':
          ch = this.getChar() + this.getChar();
          out += String.fromCharCode(parseInt(ch, 16));
          break;
        case 'u':
          ch = this.getChar() + this.getChar() + this.getChar() + this.getChar();
          out += String.fromCharCode(parseInt(ch, 16));
          break;
        case '0': out += '\0'; break;
        default: out += ch;
      }
    }
    else out += ch;
  }
  return out;
};

Tokenizer.prototype.next = function () {
  if (this.rewinded) {
    this.rewinded = false;
    return this.token;
  }
  var t = this.readWord();
  while (this.type === Tokenizer.COMMENT) {
    t = this.readWord();
  }
  this.word = t;
  this.token = t.toUpperCase();
  return this.token;
};

Tokenizer.prototype.backtrack = function () {
  this.rewinded = true;
};
