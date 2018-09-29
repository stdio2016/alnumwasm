var knightModule;
function testKnight() {
var env = {};
function loadScript() {
  var xhr = new XMLHttpRequest();
  xhr.onload = gotScript;
  xhr.responseType = 'text';
  xhr.open('GET', 'test/knight.txt');
  xhr.send();
}

function gotScript(e) {
  var b = new AlnumWasmCompiler(e.target.response);
  var buf = b.compile();
  WebAssembly.compile(buf).then(asm => {
    env.mem = new WebAssembly.Memory({initial: 1});
    env.root = 0;
    return WebAssembly.instantiate(asm, {env: env});
  }).then(inst => {
    knightModule = inst;
    console.time('Knight tour');
    knightModule.exports.knight(0, 0, 1);
    console.timeEnd('Knight tour');
    var sol = new Int32Array(knightModule.exports.solution.buffer, 0, 64);
    console.log(sol);
    var tb = document.createElement('table');
    for (var i = 0; i < 8; i++) {
      var r = tb.insertRow();
      for (var j = 0; j < 8; j++) {
        var c = r.insertCell();
        c.innerHTML = sol[i*8 + j];
      }
    }
    document.body.append(tb);
  }).catch(e => {
    console.error(e);
    console.log(buf);
  });
}

loadScript();
};
