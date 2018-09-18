function AlnumWasmCompiler(str) {
  this.parser = new AlnumWasmParser(str);
  this.code = [];
  this.types = [];
}

AlnumWasmCompiler.prototype.collectTypes = function () {
  // type can be found in type def, func def, func body, table offset,
  // import func, and table offset
};

AlnumWasmCompiler.prototype.magic = function () {
  this.code = [0x00, 0x61, 0x73, 0x6d, 0x0d, 0x00, 0x00, 0x00];
};

AlnumWasmCompiler.prototype.compile = function () {
  this.parser.parse();
  this.collectTypes();
  this.magic();
};
