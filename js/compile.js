function AlnumWasmCompiler(str) {
  this.parser = new AlnumWasmParser(str);
  this.code = [];
  this.types = [];
  this.typeHash = {};
}

AlnumWasmCompiler.getMangleName = function (type) {
  var typeNames = "ILFD";
  var str = "p";
  var params = type[1];
  for (var i = 0; i < params.length; i++) {
    str += typeNames[0x7f - params[i][1]];
  }
  str += "_r";
  var rets = type[2];
  for (var i = 0; i < rets.length; i++) {
    str += typeNames[0x7f - rets[i]];
  }
  return str;
};

AlnumWasmCompiler.prototype.addTypeSig = function (type) {
  if (type[0] === 'param') {
    var str = AlnumWasmCompiler.getMangleName(type);
    type.push(str);
    if (!this.typeHash[str]) {
      this.typeHash[str] = true;
      this.types.push(["", type[1], type[2], str]);
    }
  }
};

AlnumWasmCompiler.prototype.collectTypes = function () {
  // type can be found in type def, func def, func body, and import func
  var types = this.parser.types;
  for (var i = 0; i < types.length; i++) {
    var m = AlnumWasmCompiler.getMangleName(types[i]);
    types[i].push(m);
    this.typeHash[m] = true;
    this.types.push(types[i]);
  }

  var funs = this.parser.functions;
  for (var i = 0; i < funs.length; i++) {
    var f = funs[i];
    // function signature
    this.addTypeSig(f[1]);
    // function code
    var code = f[3];
    for (var j = 0; j < code.length; j++) {
      if (code[j] instanceof Array) {
        this.addTypeSig(code[j]);
      }
    }
  }
  var imp = this.parser.imports;
  for (var i = 0; i < imp.length; i++) {
    // import function
    if (imp[i][2] === "FUNC") {
      this.addTypeSig(imp[i][4]);
    }
  }
};

AlnumWasmCompiler.prototype.assignTypeId = function () {
  var newTable = new Array(this.types.length);
  var rem = 0;
  // 1. assign number name
  for (var i = 0; i < this.types.length; i++) {
    var name = this.types[i][0];
    if (/^\d+/.test(name)) {
      var id = parseInt(name);
      if (id >= newTable.length || newTable[id]) {
        while (newTable[rem]) rem++;
        id = rem;
        newTable[rem++] = this.types[i];
      }
      else {
        newTable[id] = this.types[i];
      }
      this.typeHash[this.types[i][3]] = id;
      this.types[i][0] = null;
    }
  }
  // 2. assign non empty name
  for (var i = 0; i < this.types.length; i++) {
    var name = this.types[i][0];
    if (name) {
      while (newTable[rem]) rem++;
      this.typeHash['type_' + name] = rem;
      this.typeHash[this.types[i][3]] = rem;
      newTable[rem] = this.types[i];
      rem++;
    }
  }
  // 3. assign empty name
  for (var i = 0; i < this.types.length; i++) {
    var name = this.types[i][0];
    if (name === "") {
      while (newTable[rem]) rem++;
      newTable[rem] = this.types[i];
      this.typeHash[this.types[i][3]] = rem;
      rem++;
    }
  }
  this.types = newTable;
};

AlnumWasmCompiler.prototype.magic = function () {
  this.code = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
};

AlnumWasmCompiler.prototype.typeSecton = function () {
  var code = [];
  AlnumWasmParser.writeUint(this.types.length, code);
  for (var i = 0; i < this.types.length; i++) {
    var type = this.types[i];
    code.push(0x60);
    AlnumWasmParser.writeUint(type[1].length, code);
    for (var j = 0; j < type[1].length; j++) {
      code.push(type[1][j][1]);
    }
    AlnumWasmParser.writeUint(type[2].length, code);
    for (var j = 0; j < type[2].length; j++) {
      code.push(type[2][j]);
    }
  }
  this.code.push(1);
  AlnumWasmParser.writeUint(code.length, this.code);
  this.code.push(code);
};

AlnumWasmCompiler.prototype.assemble = function () {
  var sum = 0;
  for (var i = 0; i < this.code.length; i++) {
    if (this.code[i] instanceof Array)
      sum += this.code[i].length;
    else sum += 1;
  }
  var buf = new Uint8Array(sum);
  sum = 0;
  for (var i = 0; i < this.code.length; i++) {
    if (this.code[i] instanceof Array) {
      buf.set(this.code[i], sum);
      sum += this.code[i].length;
    }
    else buf[sum++] = this.code[i];
  }
  return buf;
};

AlnumWasmCompiler.prototype.compile = function () {
  this.parser.parse();
  this.collectTypes();
  this.assignTypeId();
  this.magic();
  this.typeSecton();
  return this.assemble();
};

var b = new AlnumWasmCompiler(a.lexer.str);
WebAssembly.compile(b.compile()).then(function (r) {
  window.hello = r;
  console.log('hello webassembly');
}).catch(function (e) {
  console.log(e);
});
