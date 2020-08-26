const { Matrix, inverse } = require('../modules/matrix.umd');
export function getOneGuassionArray (size, kerR, sigma) {
  if (size % 2 > 0) {
    size -= 1
  }
  if (!size) {
    return []
  }
  if (kerR > size-1){
    return []
  }
  let sum = 0;
  let arr = new Array(size);

  for (let i = 0; i < size; i++) {
    arr[i] = Math.exp(-((i - kerR) * (i - kerR)) / (2 * sigma * sigma));
    sum += arr[i];
  }

  return arr.map(e => e / sum);
}
function combine(src, start, size, res, arr){
  if(size == 0) {
    res.push(arr.slice(0))
    return
  }
  for(let i = start; i < src.length; i++) {
    arr.push(src[i]);
    combine(src, i + 1, size - 1, res, arr)
    arr.pop()
  }
}

export function genCombines(len, size){
  var src = []
  var res = []
  for(var i = 0; i < len; i++) {
    src.push(i)
  }
  combine(src, 0, size, res, [])
  return res
}

export function trilateral(rounds){
  let a = [];
  let b = [];
  /*数组a初始化*/
  for(let i = 0; i < 2; i ++ ) {
      a.push([
          2*(rounds[i].x-rounds[rounds.length-1].x),
          2*(rounds[i].y-rounds[rounds.length-1].y)
      ])
  }

  /*数组b初始化*/
  for(let i = 0; i < 2; i ++ ) {
      b.push([
          Math.pow(rounds[i].x, 2)
              - Math.pow(rounds[rounds.length-1].x, 2)
              + Math.pow(rounds[i].y, 2)
              - Math.pow(rounds[rounds.length-1].y, 2)
              + Math.pow(rounds[rounds.length-1].r, 2)
              - Math.pow(rounds[i].r,2)
      ])
  }

  /*将数组封装成矩阵*/
  let b1 = new Matrix(b);
  let a1 = new Matrix(a);

  /*求矩阵的转置*/
  let a2  = a1.transpose();
  /*求矩阵a1与矩阵a1转置矩阵a2的乘积*/
  let tmpMatrix1 = a2.mmul(a1);
  let reTmpMatrix1 = inverse(tmpMatrix1);
  let tmpMatrix2 = reTmpMatrix1.mmul(a2);
  /*中间结果乘以最后的b1矩阵*/
  let resultMatrix = tmpMatrix2.mmul(b1);
  return {
    x: resultMatrix.get(0, 0),
    y: resultMatrix.get(1, 0)
  }
}

export function getAccuracy(rssi, rrssi, n){
  let iRssi = Math.abs(rssi);
  let power = (iRssi + rrssi) / (10 * n);
  return Math.pow(10, power) * 100;
}

export function toRadin(degree){
  return 2*Math.PI/360*degree
}

export function getAccuracyByPoint(x1, y1, x2, y2){
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2))
}

export function kalmanSmoothing (data) {
  var prevData=0, p=10, q=0.0001, r=0.005, kGain=0;
  return data.map((inData) => {
    p = p+q; 
    kGain = p/(p+r);

    inData = prevData+(kGain*(inData-prevData)); 
    p = (1-kGain)*p;

    prevData = inData;

    return inData; 
  })
}