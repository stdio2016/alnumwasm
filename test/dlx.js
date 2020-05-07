// inspired by https://github.com/jlaire/dlx.js
function MatrixNode(row, col) {
  this.u = this;
  this.d = this;
  this.l = this;
  this.r = this;
  this.row = row;
  this.col = col;
}

MatrixNode.prototype.setR = function (right) {
  this.r = right;
  right.l.r = this;
  this.l = right.l;
  right.l = this;
};

MatrixNode.prototype.setD = function (down) {
  this.d = down;
  down.u.d = this;
  this.u = down.u;
  down.u = this;
};

function MatrixColumn(id, min, max) {
  this.first = new MatrixNode(-1, this);
  this.l = this;
  this.r = this;
  this.size = 0;
  this.value = 0;
  this.min = min;
  this.max = max;
  this.id = id;
}

MatrixColumn.prototype.setR = function (right) {
  this.r = right;
  right.l.r = this;
  this.l = right.l;
  right.l = this;
};

function Matrix() {
  this.root = new MatrixColumn(-1);
  this.rows = [];
  this.cols = [];
  this.choice = [];
  this.solution = [];
  this.tried = 0;
}

Matrix.prototype.addColumn = function (min, max) {
  var col = new MatrixColumn(this.cols.length, min, max);
  this.cols.push(col);
  if (min > 0) {
    col.setR(this.root);
  }
  return col.id;
};

Matrix.prototype.addRow = function (row, cols) {
  var col = this.cols[cols[0]];
  var n = new MatrixNode(row, col);
  n.setD(col.first);
  col.size += 1;
  var n1 = n;
  for (var i = 1; i < cols.length; i++) {
    col = this.cols[cols[i]];
    var n2 = new MatrixNode(row, col);
    n2.setD(col.first);
    col.size += 1;
    n1.r = n2;
    n2.l = n1;
    n1 = n2;
  }
  n1.r = n;
  n.l = n1;
  this.rows.push(n);
};

Matrix.prototype.unlinkRow = function (n, includeN) {
  var e = n;
  n = includeN ? n : n.r;
  while (n !== e) {
    n.u.d = n.d;
    n.d.u = n.u;
    n.col.size -= 1;
    n = n.r;
  }
};

Matrix.prototype.unlinkColumn = function (n) {
  n.l.r = n.r;
  n.r.l = n.l;
};

Matrix.prototype.relinkRow = function (n, includeN) {
  var e = n;
  n = includeN ? n : n.r;
  while (n !== e) {
    n.u.d = n;
    n.d.u = n;
    n.col.size += 1;
    n = n.r;
  }
};

Matrix.prototype.relinkColumn = function (n) {
  n.l.r = n;
  n.r.l = n;
};

Matrix.prototype.dlx = function () {
  this.choice = [];
  this.solution = [];
  this.tried = 0;
  
  this.dlxRunner(0);
};

Matrix.prototype.dlxRunner = function (lv) {
  this.tried++;
  var c = this.root;
  var minfit = -1;
  for (var col = c.r; col !== this.root; col = col.r) {
    // satisfied
    if (col.value <= col.max  && col.value >= col.min) continue;
    // unusable
    if (col.value > col.max || col.value + col.size < col.min) {
      return;
    }
    // min fit
    if (col.size < minfit || minfit === -1) {
      c = col;
      minfit = col.size;
    }
  }
  if (minfit === -1) {
    // solved!
    this.solution.push(this.choice.slice(0));
    return;
  }
  
  var n = c.first.d;
  do {
    // try a row
    var n2 = n;
    this.choice[lv] = n.row;
    
    // increase value and remove rows/columns
    do {
      var c2 = n2.col;
      c2.value += 1;
      if (c2.value === c2.max) {
        this.unlinkColumn(c2);
        var n3 = c2.first.d;
        while (n3 !== c2.first) {
          this.unlinkRow(n3, false);
          n3 = n3.d;
        }
      }
      n2 = n2.r;
    } while (n2 !== n) ;

    this.dlxRunner(lv+1);
    
    // recover deleted rows/columns
    n2 = n;
    do {
      n2 = n2.l;
      var c2 = n2.col;
      if (c2.value === c2.max) {
        var n3 = c2.first.u;
        while (n3 !== c2.first) {
          this.relinkRow(n3, false);
          n3 = n3.u;
        }
        this.relinkColumn(c2);
      }
      c2.value -= 1;
    } while (n2 !== n) ;
    this.unlinkRow(n, true);
    
    // go next
    n = n.d;
  } while (n !== c.first) ;
  
  // recover tried rows
  n = c.first.u;
  while (n !== c.first) {
    this.relinkRow(n, true);
    n = n.u;
  }
};

function testDlxJs() {
  var m = new Matrix();
  var n = 12;
  var t = new Date();
  for (var i = 0; i < n*2; i++) {
    m.addColumn(1, 1);
  }
  for (var i = 0; i < (2*n-1)*2; i++) {
    m.addColumn(0, 1);
  }
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      m.addRow(i*n+j, [i, n + j, n*2 + i+j, n*4-1 + (i-j+n-1)]);
    }
  }
  m.dlx();
  jsResult.innerHTML = ('solution count:' + m.solution.length +
    ', tried: ' + m.tried + ', cost: ' + (new Date() - t)/1000 + 's');
}
