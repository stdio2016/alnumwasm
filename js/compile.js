function AlnumWasmCompiler(str) {
  this.parser = new AlnumWasmParser(str);
  this.code = [];
  this.types = [];
  this.typeHash = {};
  this.itemLookup = {};
  this.functions = [];
  this.memories = [];
  this.tables = [];
  this.globals = [];
}

AlnumWasmCompiler.writeString = function (str, code) {
  var size = 0;
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c >= 0xd800 && c < 0xdc00) {
      i++; size += 4;
    }
    else if (c >= 0x800) size += 3;
    else if (c >= 0x80) size += 2;
    else size += 1;
  }
  AlnumWasmParser.writeUint(size, code);
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c >= 0xd800 && c < 0xdc00) {
      var c2 = str.charCodeAt(str, i+1);
      c = ((c & 0x3ff) << 10 | (c2 & 0x3ff)) + 0x10000;
      code.push(0xf0 | c>>18, 0x80 | c>>12 & 0x3f, 0x80 | c>>6 & 0x3f, 0x80 | c & 0x3f);
      i++;
    }
    else if (c >= 0x800) {
      code.push(0xe0 | c>>12, 0x80 | c>>6 & 0x3f, 0x80 | c & 0x3f);
    }
    else if (c >= 0x80) {
      code.push(0xc0 | c>>6, 0x80 | c & 0x3f);
    }
    else {
      code.push(c);
    }
  }
};

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

AlnumWasmCompiler.prototype.writeType = function (type, code) {
  var id;
  if (type[0] === 'type') {
    if (onlyDigits(type[1])) {
      id = parseInt(type[1]);
      if (id >= this.types.length) throw ReferenceError('type id ' + id + ' too big');
    }
    else {
      id = this.typeHash['type_' + type[1]];
      if (id === void 0) throw ReferenceError('type ' + type[1] + ' is undefined');
    }
  }
  else {
    id = this.typeHash[type[3]];
  }
  AlnumWasmParser.writeUint(id, code);
};

AlnumWasmCompiler.prototype.writeMemSize = function (memsize, code) {
  if (memsize.max === Infinity) {
    code.push(0);
    AlnumWasmParser.writeUint(memsize.min, code);
  }
  else {
    code.push(1);
    AlnumWasmParser.writeUint(memsize.min, code);
    AlnumWasmParser.writeUint(memsize.max, code);
  } 
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

AlnumWasmCompiler.prototype.assignImportId = function (kind, myItems) {
  var imps = this.parser.imports;
  var impItems = [];
  for (var i = 0; i < imps.length; i++) {
    if (imps[i][2] === kind) {
      impItems.push(imps[i]);
    }
  }
  var newImp = new Array(impItems.length);
  var lookup = this.itemLookup;
  var rem = 0;
  // first assign id to imported items
  // 1. assign number name
  for (var i = 0; i < impItems.length; i++) {
    var name = impItems[i][3];
    if (onlyDigits(name)) {
      var id = parseInt(name);
      if (id >= impItems.length || newImp[id]) {
        while (newImp[rem]) rem++;
        id = rem;
        newImp[rem++] = impItems[i];
      }
      else {
        newImp[id] = impItems[i];
      }
      lookup[kind + '_' + name] = id;
    }
  }
  // 2. assign non empty name
  for (var i = 0; i < impItems.length; i++) {
    var name = impItems[i][3];
    if (!onlyDigits(name)) {
      while (newImp[rem]) rem++;
      lookup[kind + '_' + name] = rem;
      newImp[rem] = impItems[i];
      rem++;
    }
  }
  
  // then assign id to module items
  var newTable = new Array(myItems.length);
  rem = 0;
  // 1. assign number name
  for (var i = 0; i < myItems.length; i++) {
    var name = myItems[i][0];
    if (onlyDigits(name)) {
      var id = parseInt(name);
      if (id < impItems.length || id >= impItems.length + myItems.length
      || newTable[id - impItems.length]) {
        while (newTable[rem]) rem++;
        id = rem + impItems.length;
        newTable[rem++] = myItems[i];
      }
      else {
        newTable[id - impItems.length] = myItems[i];
      }
      lookup[kind + '_' + name] = id;
    }
  }
  // 2. assign non empty name
  for (var i = 0; i < myItems.length; i++) {
    var name = myItems[i][0];
    if (!onlyDigits(name)) {
      while (newTable[rem]) rem++;
      lookup[kind + '_' + name] = rem + impItems.length;
      newTable[rem] = myItems[i];
      rem++;
    }
  }
  return [newImp, newTable];
};

AlnumWasmCompiler.prototype.writeCode = function (code, args, locals, out) {
  var scope = {};
  if (args && locals) {
    for (var i = 0; i < args.length; i++) {
      var name = args[i][0];
      scope["v_"+name] = i;
    }
    for (var i = 0; i < locals.length; i++) {
      var name = locals[i][0];
      scope["v_" + name] = args.length + i;
    }
  }
  for (var i = 0; i < code.length; i++) {
    if (code[i] instanceof Array) {
      if (code[i][0] === 'type') {
        this.writeType(code[i], out);
      }
      else if (code[i][0] === 'local') {
        var id = scope["v_" + code[i][1]];
        if (id === void 0)
          throw ReferenceError('undefined local ' + code[i][1]);
        AlnumWasmParser.writeUint(id, out);
      }
      else if (code[i][0] === 'global') {
        var id = this.itemLookup["GLOBAL_" + code[i][1]];
        if (id === void 0)
          throw ReferenceError('undefined global ' + code[i][1]);
        AlnumWasmParser.writeUint(id, out);
      }
      else if (code[i][0] === 'func') {
        var id = this.itemLookup["FUNC_" + code[i][1]];
        if (id === void 0)
          throw ReferenceError('undefined function ' + code[i][1]);
        AlnumWasmParser.writeUint(id, out);
      }
    }
    else {
      out.push(code[i]);
    }
  }
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

AlnumWasmCompiler.prototype.importSection = function () {
  var code = [];
  var imp = this.parser.imports;
  AlnumWasmParser.writeUint(imp.length, code);
  var ids = this.assignImportId("FUNC", this.parser.functions);
  this.functions = ids[1];
  for (var i = 0; i < ids[0].length; i++) {
    AlnumWasmCompiler.writeString(ids[0][i][0], code);
    AlnumWasmCompiler.writeString(ids[0][i][1], code);
    code.push(0);
    this.writeType(ids[0][i][4], code);
  }
  ids = this.assignImportId("TABLE", this.parser.tables);
  this.tables = ids[1];
  for (var i = 0; i < ids[0].length; i++) {
    AlnumWasmCompiler.writeString(ids[0][i][0], code);
    AlnumWasmCompiler.writeString(ids[0][i][1], code);
    code.push(1);
    code.push(0x70); // anyfunc
    this.writeMemSize(ids[0][i][4], code);
  }
  ids = this.assignImportId("MEMORY", this.parser.memories);
  this.memories = ids[1];
  for (var i = 0; i < ids[0].length; i++) {
    AlnumWasmCompiler.writeString(ids[0][i][0], code);
    AlnumWasmCompiler.writeString(ids[0][i][1], code);
    code.push(2);
    this.writeMemSize(ids[0][i][4], code);
  }
  ids = this.assignImportId("GLOBAL", this.parser.globals);
  this.globals = ids[1];
  for (var i = 0; i < ids[0].length; i++) {
    AlnumWasmCompiler.writeString(ids[0][i][0], code);
    AlnumWasmCompiler.writeString(ids[0][i][1], code);
    code.push(3);
    code.push(ids[0][i][4].type);
    code.push(ids[0][i][4].mut ? 1 : 0);
  }

  this.code.push(2);
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

AlnumWasmCompiler.prototype.funcSection = function () {
  var code = [];
  var funcs = this.functions;
  AlnumWasmParser.writeUint(funcs.length, code);
  for (var i = 0; i < funcs.length; i++) {
    this.writeType(funcs[i][1], code);
  }

  this.code.push(3);
  AlnumWasmParser.writeUint(code.length, this.code);
  this.code.push(code);
};

AlnumWasmCompiler.prototype.tableSection = function () {
  var code = [];
  var tbls = this.tables;
  AlnumWasmParser.writeUint(tbls.length, code);
  for (var i = 0; i < tbls.length; i++) {
    code.push(0x70);
    this.writeMemSize(tbls[i][1], code);
  }

  this.code.push(4);
  AlnumWasmParser.writeUint(code.length, this.code);
  this.code.push(code);
};

AlnumWasmCompiler.prototype.memSection = function () {
  var code = [];
  var mems = this.memories;
  AlnumWasmParser.writeUint(mems.length, code);
  for (var i = 0; i < mems.length; i++) {
    this.writeMemSize(mems[i][1], code);
  }

  this.code.push(5);
  AlnumWasmParser.writeUint(code.length, this.code);
  this.code.push(code);
};

AlnumWasmCompiler.prototype.globalSection = function () {
  var code = [];
  var globs = this.globals;
  AlnumWasmParser.writeUint(globs.length, code);
  for (var i = 0; i < globs.length; i++) {
    code.push(globs[i][1].type);
    code.push(globs[i][1].mut ? 1 : 0);
    this.writeCode(globs[i][2], null, null, code);
  }

  this.code.push(6);
  AlnumWasmParser.writeUint(code.length, this.code);
  this.code.push(code);
};

AlnumWasmCompiler.prototype.exportSection = function () {
  var code = [];
  var exps = this.parser.exports;
  AlnumWasmParser.writeUint(exps.length, code);
  for (var i = 0; i < exps.length; i++) {
    var name = exps[i][2];
    var kind = exps[i][1];
    AlnumWasmCompiler.writeString(exps[i][0], code);
    if (kind === "FUNC") {
      code.push(0);
      var id = this.itemLookup["FUNC_" + name];
      if (id === void 0)
        throw ReferenceError('undefined function ' + name);
    }
    else if (kind === "TABLE") {
      code.push(1);
      var id = this.itemLookup["TABLE_" + name];
      if (id === void 0)
        throw ReferenceError('undefined table ' + name);
    }
    else if (kind === "MEMORY") {
      code.push(2);
      var id = this.itemLookup["MEMORY_" + name];
      if (id === void 0)
        throw ReferenceError('undefined memory ' + name);
    }
    else if (kind === "GLOBAL") {
      code.push(3);
      var id = this.itemLookup["GLOBAL_" + name];
      if (id === void 0)
        throw ReferenceError('undefined global ' + name);
    }
    AlnumWasmParser.writeUint(id, code);
  }

  this.code.push(7);
  AlnumWasmParser.writeUint(code.length, this.code);
  this.code.push(code);
};

AlnumWasmCompiler.prototype.codeSection = function () {
  var funcs = this.functions;
  var totalLen = 0;
  var codes = [];
  AlnumWasmParser.writeUint(funcs.length, codes);
  for (var i = 0; i < funcs.length; i++) {
    var fun = funcs[i];
    var code = [];
    var locals = fun[2];
    var localcnt = 0, locallen = 0;
    // count local type changes
    for (var j = 0; j < locals.length; j++) {
      // type change
      if (j === locals.length-1 || locals[j+1][1] !== locals[j][1]) {
        locallen++;
      }
    }
    AlnumWasmParser.writeUint(locallen, code);
    // write local types
    for (var j = 0; j < locals.length; j++) {
      // type change
      localcnt++;
      if (j === locals.length-1 || locals[j+1][1] !== locals[j][1]) {
        AlnumWasmParser.writeUint(localcnt, code);
        code.push(locals[j][1]);
        localcnt = 0;
      }
    }
    var args;
    if (fun[1][0] === "type") {
      var name = fun[1][1];
      var id;
      if (onlyDigits(name)) {
        id = parseInt(name);
        if (id >= this.types.length) throw ReferenceError('type id ' + name + ' too big');
      }
      else {
        id = this.typeHash['type_' + name];
        if (id === void 0) throw ReferenceError('type ' + name + ' is undefined');
      }
      args = this.types[id][1];
    }
    else {
      args = fun[1][1];
    }
    this.writeCode(fun[3], args, fun[2], code);
    
    AlnumWasmParser.writeUint(code.length, codes);
    codes.push(code);
    totalLen += code.length-1;
  }

  this.code.push(10);
  AlnumWasmParser.writeUint(totalLen + codes.length, this.code);
  for (var i = 0; i < codes.length; i++) {
    this.code.push(codes[i]);
  }
};

AlnumWasmCompiler.prototype.compile = function () {
  try {
    this.parser.parse();
  } catch (e) {
    if (e instanceof SyntaxError || e instanceof ReferenceError) {
      var lex = this.parser.lexer;
      e.message += ' at line ' + lex.lineno + ' col ' + 
        (lex.pos - lex.lineStart - lex.token.length + 1);
    }
    throw e;
  }
  this.collectTypes();
  this.assignTypeId();
  this.magic();
  this.typeSecton();
  this.importSection();
  this.funcSection();
  this.tableSection();
  this.memSection();
  this.globalSection();
  this.exportSection();
  this.codeSection();
  return this.assemble();
};
