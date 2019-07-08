(function (){
  var code = `; intractable problems
from env import mem as memory 0
global hamcount as mut i64

func hamcount export hamcount param n as i32
local i as i32 and ans as i64 and a as i32 and j as i32 and k as i32 and b as i32
  and t as i32 and sum as i64
code
  iconst 1 set i
  Lconst 0 set ans
  loop block
    get i iconst 1 get n ishl iges brif 0

    iconst 0 set a
    iconst 1 set j
    loop
      get i get j ishrs iconst 1 iand if
        get a iconst 3 ishl get j iconst 7 ishl iload align 4 si2l Lstore align 8 offset 8448
        iconst 0 set b
        iconst 1 set k
        loop
          get i get k ishrs iconst 1 iand if
            get a iconst 5 ishl get b iadd iconst 2 ishl
              get j iconst 5 ishl get k iadd iconst 2 ishl iload align 4
            istore align 4 offset 4096
            get b iconst 1 iadd set b
          end
          get k iconst 1 iadd set k
          get k get n ilts brif 0
        end
        get a iconst 1 iadd set a
      end
      get j iconst 1 iadd set j
      get j get n ilts brif 0
    end

    iconst 1 set t
    loop block
      get t get n iconst 1 isub iges brif 0

      iconst 0 set j
      loop block
        get j get a iges brif 0
        Lconst 0 set sum
        iconst 0 set k
        loop block
          get k get a iges brif 0
          get sum
            get t iconst 5 ishl get k iadd iconst 3 ishl Lload align 8 offset 8192
            get j iconst 5 ishl get k iadd iconst 2 ishl iload align 4 offset 4096 si2l
          Lmul Ladd set sum
          get k iconst 1 iadd set k br 1
        end end
        
        get t iconst 1 iadd iconst 5 ishl get j iadd iconst 3 ishl get sum Lstore align 8 offset 8192
        get j iconst 1 iadd set j br 1
      end end

      get t iconst 1 iadd set t br 1
    end end

    Lconst 0 set sum
    iconst 0 set b
    iconst 1 set j
    loop block
      get j get n iges brif 0
      get i get j ishrs iconst 1 iand if
        get sum
          get n iconst 1 isub iconst 5 ishl get b iadd iconst 3 ishl Lload align 8 offset 8192
          get j iconst 2 ishl iload align 4 si2l
        Lmul Ladd set sum
        get b iconst 1 iadd set b
      end
      get j iconst 1 iadd set j br 1
    end end

    get i ipopcnt iconst 1 iand if
      get ans get sum Lsub set ans
    else
      get ans get sum Ladd set ans
    end

    get i iconst 2 iadd set i br 1
  end end

  get n iconst 1 iand if Lconst 0 get ans Lsub set ans end
  get ans setglobal hamcount
end

func xx export hamcountlo result i32
code
  getglobal hamcount Lconst 10000000 Lrems l2i
end

func xx2 export hamcountmid result i32
code
  getglobal hamcount Lconst 10000000 Ldivs Lconst 10000000 Lrems l2i
end

func xx3 export hamcounthi result i32
code
  getglobal hamcount Lconst 100000000000000 Ldivs l2i
end

func makelong export makelong
code
  Lconst 1234567890123456789 setglobal hamcount
end
`;

var b = new AlnumWasmCompiler(code);
var buf = b.compile();
WebAssembly.compile(buf).then(function (r) {
  window.hello = r;
  window.mem = new WebAssembly.Memory({initial: 1});
  window.tbl = new WebAssembly.Table({element: 'anyfunc', initial: 1});
  console.log('hello webassembly');
  return WebAssembly.instantiate(hello, {
    Math: Math,
    env: {mem: mem, winsize: 4, tbl: tbl}
  });
}).catch(function (e) {
  console.log(e);
}).then(function (y) {
  window.hello2 = y;
  console.log('instantiated!');
}).catch(function (e) {
  console.log(e);
});
})()

function changeTable(){
  var n = +txtN.value, oldN = tblGraph.rows.length;
  if (!n || n < 3) n = 3;
  if (n > 17) n = 17;
  for (var i = 0; i < n; i++) {
    if (i >= oldN) tblGraph.insertRow(i);
    var row = tblGraph.rows[i];
    for (var j = 0; j < n; j++) {
      if (j >= row.cells.length) {
        var col = row.insertCell(j);
        col.appendChild(new Text('0'));
      }
    }
    while (row.cells.length > n) {
      row.deleteCell(row.cells.length - 1);
    }
  }
  while (tblGraph.rows.length > n) {
    tblGraph.deleteRow(tblGraph.rows.length - 1);
  }
}

function toggleCell(target) {
  if (target.tagName == 'TD') {
    var n = target.innerHTML;
    target.innerHTML = 1 - n;
  }
}

function getLongToStr() {
  var lo = hello2.exports.hamcountlo();
  var mi = hello2.exports.hamcountmid();
  var hi = hello2.exports.hamcounthi();
  var s = +1;
  if (lo < 0) s = -1;
  lo = lo*s;
  mi = mi*s;
  hi = hi*s;
  var str = s > 0 ? "" : "-";
  if (hi) str = str+hi+(mi+10000000).toString().substring(1)+(lo+10000000).toString().substring(1);
  else if (mi) str = str+mi+(lo+10000000).toString().substring(1);
  else str = str+lo;
  return str;
}

function testHamPath() {
  var n = +txtN.value;
  if (!n || n < 3) n = 3;
  if (n > 17) n = 17;
  var buf = new Int32Array(mem.buffer);
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      buf[i<<5|j] = +tblGraph.rows[i].cells[j].innerHTML;
    }
  }
  hello2.exports.hamcount(n);
  lblAns.innerHTML = "Count = " + getLongToStr();
}

changeTable();