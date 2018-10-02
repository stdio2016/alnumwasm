var dlxModule;
var env = {};
document.getElementById('btnTestDlxWasm').disabled = true;
function loadScript() {
  var xhr = new XMLHttpRequest();
  xhr.onload = gotScript;
  xhr.responseType = 'text';
  xhr.open('GET', 'test/dlx.txt');
  xhr.send();
}

function gotScript(e) {
  var code = e.target.response;
  var c = document.getElementById('code');
  var txt = c.childNodes[0];
  txt.textContent = code;

  var b = new AlnumWasmCompiler(code);
  var buf = b.compile();
  WebAssembly.compile(buf).then(asm => {
    env.mem = new WebAssembly.Memory({initial: 1});
    env.root = 0;
    return WebAssembly.instantiate(asm, {env: env});
  }).then(inst => {
    dlxModule = inst;
    document.getElementById('btnTestDlxWasm').disabled = false;
  });
}

loadScript();

function testDlx(lv) {
  throw Error('unimplemented');
}
