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
    var t = +new Date();
    knightModule.exports.knight(0, 0, 1);
    var cost = new Date() - t;
    var sol = new Int32Array(knightModule.exports.solution.buffer, 0, 64);
    
    var txt = document.createTextNode('alnumwasm took ' + cost + ' ms');
    var p = document.createElement('p');
    p.appendChild(txt);
    document.body.append(p);

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

var cnt = 0;
var steps = new Int32Array(64);
function knight(x, y, lv) {
  cnt += 1;
  // bound check
  if (x >= 8 || x < 0 || y >= 8 || y < 0) return 0;
  
  // get array index
  var pos = x + y * 8;
  
  // test if a square is visited
  if (steps[pos]) return 0;
  steps[pos] = lv;
  
  // test if finished
  if (lv >= 64) return 1;
  
  lv += 1;
  if (knight(x+1, y+2, lv)) return 1;
  if (knight(x+2, y+1, lv)) return 1;
  if (knight(x+2, y-1, lv)) return 1;
  if (knight(x+1, y-2, lv)) return 1;
  if (knight(x-1, y-2, lv)) return 1;
  if (knight(x-2, y-1, lv)) return 1;
  if (knight(x-2, y+1, lv)) return 1;
  if (knight(x-1, y+2, lv)) return 1;
  
  // no moves
  steps[pos] = 0;
  return 0;
}

function testKnightJs() {
  cnt = 0;
  steps.fill(0);
  var t = +new Date();
  knight(0, 0, 1);
  var cost = new Date() - t;
  
  var txt = document.createTextNode('javascript took ' + cost + ' ms');
  var p = document.createElement('p');
  p.appendChild(txt);
  document.body.append(p);

  var tb = document.createElement('table');
  for (var i = 0; i < 8; i++) {
    var r = tb.insertRow();
    for (var j = 0; j < 8; j++) {
      var c = r.insertCell();
      c.innerHTML = steps[i*8 + j];
    }
  }
  document.body.append(tb);
}
