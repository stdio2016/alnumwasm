var dlxModule;
var env = {};
var solbuf;
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
    solbuf = new Int32Array(env.mem.buffer);
    env.root = 0;
    env.debug = (i,j) => console.debug('wasm', i,j);
    return WebAssembly.instantiate(asm, {env: env});
  }).then(inst => {
    dlxModule = inst;
    document.getElementById('btnTestDlxWasm').disabled = false;
  }).catch(err => {
    console.error(err);
  });
}

loadScript();

function testDlx(lv) {
  var m = new Matrix();
  var n = 12;
  var t = new Date();
  dlxModule.exports.setroot(0);
  for (var i = 0; i < n*2; i++) {
    dlxModule.exports.addcolumn(0, (i+1)*40, i, 1, 1);
  }
  for (var i = 0; i < (2*n-1)*2; i++) {
    dlxModule.exports.addcolumn(0, (i+1+n*2)*40, i+n*2, 0, 1);
  }
  var rowaddr = (1 + n*2 + (2*n-1)*2)*40;
  for (var i = 0; i < n*n; i++) {
    //dlxModule.exports.addrow(0, rowaddr + i * 24, i);
  }
  var celladdr = rowaddr + n*n*24;
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      //var row = rowaddr + (i*n+j) * 24;
      var addr = celladdr + (i*n+j) * 96;
      dlxModule.exports.addfirstcell(addr, (i+1)*40, i*100+j);
      dlxModule.exports.addcell(addr + 24, addr, (n+j+1)*40, i*100+j);
      dlxModule.exports.addcell(addr + 48, addr + 24, (n*2+i+j+1)*40, i*100+j);
      dlxModule.exports.addcell(addr + 72, addr + 48, (n*4-1+(i-j+n-1)+1)*40, i*100+j);
    }
  }
  var stack = celladdr + n*n*96;
  console.log('stack: ' + stack);
  dlxModule.exports.setstack(stack);
  var r = 0;
  var cnt = 0;
  dlxModule.exports.settry(0, 1000000);
  do {
    r = dlxModule.exports.dlx(0);
    cnt++;
  } while (r === 2) ;
  cnt--;
  wasmResult.innerHTML = ('solution count:' + cnt +
    ', tried: ' + dlxModule.exports.gettried() + ', cost: ' + (new Date() - t)/1000 + 's');
}
