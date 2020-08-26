//存放三轴数据
let valueNum = 5;
//用于存放计算阈值的波峰波谷差值
let tempValue = new Array(valueNum);
let tempCount = 0;
//是否上升的标志位
let isDirectionUp = false;
//持续上升次数
let continueUpCount = 0;
//上一点的持续上升的次数，为了记录波峰的上升次数
let continueUpFormerCount = 0;
//上一点的状态，上升还是下降
let lastStatus = false;
//波峰值
let peakOfWave = 0.0;
//波谷值
let valleyOfWave = 0.0;
//此次波峰的时间
let timeOfThisPeak = 0;
//上次波峰的时间
let timeOfLastPeak = 0;
//当前的时间
let timeOfNow = 0;
//当前传感器的值
let gravityNew = 0.0;
//上次传感器的值
let gravityOld = 0.0;
//动态阈值需要动态的数据，这个值用于这些动态数据的阈值
let initialValue = 0.8;
//初始阈值
let ThreadValue = 0.7;

//初始范围
let minValue = 9.0;
let maxValue = 18.6;

let currentStep = 0

export default class StepManager{
  calcStep(accelerometers){
    accelerometers = accelerometers.map(accelerometer => accelerometer * 9.81)
    let average =  Math.sqrt(Math.pow(accelerometers[0], 2)
                + Math.pow(accelerometers[1], 2) + Math.pow(accelerometers[2], 2));
    this.detectorNewStep(average);
    return currentStep
  }

  clearStep(){
    currentStep = 0
  }

  detectorNewStep(values) {
    if (gravityOld === undefined) {
        gravityOld = values;
    } else {
      // 判断是不是过了一个顶峰
      if (this.detectorPeak(values, gravityOld)) {
        timeOfLastPeak = timeOfThisPeak;
        let timeOfNow = Date.parse(new Date());
        if (timeOfNow - timeOfLastPeak >= 50
                && (peakOfWave  - valleyOfWave >= ThreadValue) && (timeOfNow - timeOfLastPeak) <= 2000) {
            timeOfThisPeak = timeOfNow;
            this.preStep();
        }
        if (timeOfNow - timeOfLastPeak >= 50
                && (peakOfWave - valleyOfWave >= initialValue)) {
            timeOfThisPeak = timeOfNow;
            // ThreadValue = this.peakValleyThread(peakOfWave - valleyOfWave);
        }
      }
    }
    gravityOld = values;
  }
  detectorPeak(newValue, oldValue) {
      lastStatus = isDirectionUp;
      if (newValue >= oldValue) {
          isDirectionUp = true;
          continueUpCount++;
      } else {
          continueUpFormerCount = continueUpCount;
          continueUpCount = 0;
          isDirectionUp = false;
      }
      if (!isDirectionUp && lastStatus
              && (continueUpFormerCount >= 2 && (oldValue >= minValue && oldValue < maxValue))) {
          peakOfWave = oldValue;
          return true;
      } else if (!lastStatus && isDirectionUp) {
          valleyOfWave = oldValue;
          return false;
      } else {
          return false;
      }
  }
  peakValleyThread(value) {
    let tempThread = ThreadValue;
    if (tempCount < valueNum) {
        tempValue[tempCount] = value;
        tempCount++;
    } else {
        tempThread = this.averageValue(tempValue, valueNum);
        for (let i = 1; i < valueNum; i++) {
            tempValue[i - 1] = tempValue[i];
        }
        tempValue[valueNum - 1] = value;
    }
    return tempThread;
  }
  averageValue(value, n) {
    let ave = 0;
    for (let i = 0; i < n; i++) {
        ave += value[i];
    }
    ave = ave / valueNum;
    // if (ave >= 8) {
    //     ave = 4.3;
    // } else if (ave >= 7 && ave < 8) {
    //     ave = 3.3;
    // } else if (ave >= 4 && ave < 7) {
    //     ave = 2.3;
    // } else if (ave >= 3 && ave < 4) {
    //     ave = 2.0;
    // } else {
    //     ave = 1.7;
    // }
    return ave;
  }
  preStep() {
    currentStep++;
  }
  toDegrees(angrad) {
    return angrad * 180.0 / Math.PI;
  }
  getRotationMatrix(R, I, gravity, geomagnetic) {
        // TODO: move this to native code for efficiency
        let Ax = gravity[0];
        let Ay = gravity[1];
        let Az = gravity[2];
        let Ex = geomagnetic[0];
        let Ey = geomagnetic[1];
        let Ez = geomagnetic[2];
        let Hx = Ey*Az - Ez*Ay;
        let Hy = Ez*Ax - Ex*Az;
        let Hz = Ex*Ay - Ey*Ax;
        let normH = Math.sqrt(Hx*Hx + Hy*Hy + Hz*Hz);
        if (normH < 0.1) {
            // device is close to free fall (or in space?), or close to
            // magnetic north pole. Typical values are  > 100.
            return false;
        }
        let invH = 1.0 / normH;
        Hx *= invH;
        Hy *= invH;
        Hz *= invH;
        let invA = 1.0 / Math.sqrt(Ax*Ax + Ay*Ay + Az*Az);
        Ax *= invA;
        Ay *= invA;
        Az *= invA;
        let Mx = Ay*Hz - Az*Hy;
        let My = Az*Hx - Ax*Hz;
        let Mz = Ax*Hy - Ay*Hx;
        if (R != null) {
            if (R.length == 9) {
                R[0] = Hx;     R[1] = Hy;     R[2] = Hz;
                R[3] = Mx;     R[4] = My;     R[5] = Mz;
                R[6] = Ax;     R[7] = Ay;     R[8] = Az;
            } else if (R.length == 16) {
                R[0]  = Hx;    R[1]  = Hy;    R[2]  = Hz;   R[3]  = 0;
                R[4]  = Mx;    R[5]  = My;    R[6]  = Mz;   R[7]  = 0;
                R[8]  = Ax;    R[9]  = Ay;    R[10] = Az;   R[11] = 0;
                R[12] = 0;     R[13] = 0;     R[14] = 0;    R[15] = 1;
            }
        }
        if (I != null) {
            // compute the inclination matrix by projecting the geomagnetic
            // vector onto the Z (gravity) and X (horizontal component
            // of geomagnetic vector) axes.
            let invE = 1.0 / Math.sqrt(Ex*Ex + Ey*Ey + Ez*Ez);
            let c = (Ex*Mx + Ey*My + Ez*Mz) * invE;
            let s = (Ex*Ax + Ey*Ay + Ez*Az) * invE;
            if (I.length == 9) {
                I[0] = 1;     I[1] = 0;     I[2] = 0;
                I[3] = 0;     I[4] = c;     I[5] = s;
                I[6] = 0;     I[7] =-s;     I[8] = c;
            } else if (I.length == 16) {
                I[0] = 1;     I[1] = 0;     I[2] = 0;
                I[4] = 0;     I[5] = c;     I[6] = s;
                I[8] = 0;     I[9] =-s;     I[10]= c;
                I[3] = I[7] = I[11] = I[12] = I[13] = I[14] = 0;
                I[15] = 1;
            }
        }
        return true;
  }
  getOrientation(R, values) {
      /*
        * 4x4 (length=16) case:
        *   /  R[ 0]   R[ 1]   R[ 2]   0  \
        *   |  R[ 4]   R[ 5]   R[ 6]   0  |
        *   |  R[ 8]   R[ 9]   R[10]   0  |
        *   \      0       0       0   1  /
        *
        * 3x3 (length=9) case:
        *   /  R[ 0]   R[ 1]   R[ 2]  \
        *   |  R[ 3]   R[ 4]   R[ 5]  |
        *   \  R[ 6]   R[ 7]   R[ 8]  /
        *
        */
      if (R.length == 9) {
          values[0] = Math.atan2(R[1], R[4]);
          values[1] = Math.asin(-R[7]);
          values[2] = Math.atan2(-R[6], R[8]);
      } else {
          values[0] = Math.atan2(R[1], R[5]);
          values[1] = Math.asin(-R[9]);
          values[2] = Math.atan2(-R[8], R[10]);
      }
      return values;
  }
}