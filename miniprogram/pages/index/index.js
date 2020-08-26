//index.js
import {
  getOneGuassionArray,
  genCombines,
  trilateral,
  getAccuracy,
  toRadin,
  kalmanSmoothing
} from '../../utils/algorithm'
import StepManager from '../../utils/step_algorithm'
const app = getApp()
const mapWidth = 1735
const mapHeight = 2305
const stepManager = new StepManager()
const meIconWidth = 50
const meIconHeight = 50
Page({
  data: {
    config: {
      rssi: -59,
      n: 2,
      radius: 5,
      buildingColor: '#000',
      meColor: 'red',
      lineColor: 'red',
      widthRatio: 0,
      heightRatio: 0,
      canvasHeight: 0,
      canvasWidth: 0
    },
    rssis: {

    },
    x: 0,
    y: 0,
    baeconMap: {
      1: {
        x: 102.4,
        y: 369.1,
      },
      7: {
        x: 780.4,
        y: 336.1,
      },
      9: {
        x: 1164.0,
        y: 505.0
      },
      2: {
        x: 47.6,
        y: 810.8,
      },
      3: {
        x: 269.2,
        y: 1203.9,
      },
      6: {
        x: 761.7,
        y: 1206.4
      },
      8: {
        x: 1291.7,
        y: 1203.9
      },
      10: {
        x: 1656.8,
        y: 336.4
      },
      11: {
        x: 1661.8,
        y: 1203.9
      },
      4: {
        x: 1656.8,
        y: 336.4
      },
      5: {
        x: 779.2,
        y: 812.8
      },
      12: {
        x: 1164.0,
        y: 825.2
      },
      13: {
        x: 1737.1,
        y: 815.3
      }
    },
    step: 0,
    direction: 0,
    lastStep: 0,
    accuracys: [],
    isNavigation: false,
    lines: [],
    resetLocation: {
      x: 1312,
      y: 1829
    },
    buildings: [
      {
        x: 761.7,
        y: 1206.4,
        text: '李同学',
        buildingId: 1
      },
      {
        x: 779.2,
        y: 812.8,
        text: '周同学',
        buildingId: 2
      },
      {
        x: 215,
        y: 691,
        text: '张同学',
        buildingId: 3
      },
      {
        x: 505,
        y: 931,
        text: '陈同学',
        buildingId: 4
      },
      {
        x: 1100,
        y: 811,
        text: '孙同学',
        buildingId: 5
      }
    ]
  },
  test: function() {
    setInterval(() => {
      this.render()
    }, 1000)
  },
  onLoad: function () {
    this.initAccelerometer()
    this.initBeacon()
    this.initCanvas()
    this.initCompas()
    this.initImu()
  },
  initAccelerometer(){
    wx.startAccelerometer({
      interval: 'game',
      success: () => {
        wx.onAccelerometerChange((res) => {
          this.data.step = stepManager.calcStep([res.x, res.y, res.z])
        })
      },
      fail: function(err) {
        console.log("startAccelerometer err:" + err)
      }
    })
  },
  initCompas () {
    wx.startCompass({
      success: () => {
        wx.onCompassChange((res) => {
          this.setData({
            direction: (res.direction - 90 < 0) ? (270 + res.direction) : res.direction - 90
          })
        })
      },
    })
  },
  initCanvas() {
    var query = wx.createSelectorQuery();
    query.select('#canvas-container').boundingClientRect().exec( (res) => {
      let height = res[0].height
      let width = res[0].width
      this.setData({
        config: {
          ...this.data.config,
          heightRatio: height / mapHeight,
          widthRatio: width / mapWidth,
          canvasHeight: height,
          canvasWidth: width,
        }
      })

      // this.test()
    })
  },
  initImu() {
    setInterval(() => {
      if(this.data.step == 0){
        //this.render()
        return
      }
      let _step = this.data.step - this.data.lastStep
      let x = this.data.x
      let y = this.data.y
      let stepCm = _step * 70
      this.data.lastStep = this.data.step
      y += stepCm * Math.cos(toRadin(this.data.direction))
      x += stepCm * Math.sin(toRadin(this.data.direction))
      if(x < meIconWidth / 2 || y < meIconHeight/ 2){
        return
      }
      this.data.y = y
      this.data.x = x
      this.setData({
        x,
        y
      })
      this.render()
    }, 10)
  },
  initBeacon() {
    wx.startBeaconDiscovery({
      uuids: ["fda50693-a4e2-4fb1-afcf-c6eb07647821"],
      success: () => {
        console.log("startBeaconDiscovery success")
        wx.onBeaconUpdate(() => {
          wx.getBeacons({
            success: (res) => {
              if (res.beacons.length == 0) {
                return
              }
              for (var beacon of res.beacons) {
    
                if (beacon.rssi == 0) {
                  continue
                }
                this.pushRssi(beacon.minor, beacon.rssi)
              }
            },
          })
        })
      },
      fail: (res) => {
        console.log("startBeaconDiscovery err: " + res.errMsg)
      }
    })
  },
  handleLocation() {
    wx.showLoading({
      title: '正在收集信号',
      mask: true,
      success: () => {
        setTimeout(() => {
          wx.hideLoading()
          let positions = this.getPosition()
          if(positions.x < meIconWidth / 2 || positions.y < meIconHeight / 2 || positions.x > mapWidth || positions.y > mapHeight){
            return
          }

          stepManager.clearStep()
          this.data.lastStep = 0
          this.data.step = 0

          this.setData({
            ...positions
          })
          this.data.x = positions.x
          this.data.y = positions.y

          this.render()
        }, 2000)
      },
    })
    
  },
  pushRssi(id, rssi) {
    let rssis = this.data.rssis
    if (!rssis[id]) {
      rssis[id] = []
    }
    rssis[id].unshift(rssi)
    if (rssis[id].length > 10) {
      rssis[id].pop() 
    }
    this.setData({
      rssis: rssis
    })
  },
  calcPoint({x, y}){
    x = x * this.data.config.widthRatio
    y = y * this.data.config.heightRatio
    y = this.data.config.canvasHeight - y
    return {
      x, 
      y 
    }
  },
  render() {
    let {
      x, y
    } = this.calcPoint({
      x: this.data.x,
      y: this.data.y
    })
    this.renderCanvas(x, y)
  },
  renderCanvas(x, y){
    var ctx = wx.createCanvasContext('container')
    ctx.save();
    this.drawMap(ctx)
    this.drawPosition(ctx, x, y)
    this.drawLine(ctx)
    this.drawBuildings(ctx)
    ctx.restore();
    ctx.draw();
  },
  drawBuildings(ctx){
    for(let building of this.data.buildings){
      ctx.beginPath()
      ctx.setFillStyle(this.data.config.buildingColor)
      let {
        x, y
      } = this.calcPoint({
        x: building.x,
        y: building.y
      })
      ctx.translate(x, y)
      ctx.rotate(toRadin(270))
      ctx.arc(0, 0, this.data.config.radius, 0, Math.PI * 2)
      ctx.fillText(building.text,  - (0),  - this.data.config.radius - 2)
      ctx.fill()
      ctx.rotate(toRadin(-270))
      ctx.translate(-x, -y)
    }
  },
  drawMap(ctx) {
    ctx.drawImage('../../images/map.jpg', 0, 0, this.data.config.canvasWidth, this.data.config.canvasHeight)
  },
  drawPosition(ctx, x, y){
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(270 * Math.PI / 180)
    ctx.drawImage('../../images/myperson1.png',  -meIconWidth / 2, -meIconHeight / 2, meIconWidth, meIconHeight)
    ctx.translate(-x, -y)
    ctx.restore()
  },
  drawLine(ctx){
    ctx.beginPath()
    ctx.setStrokeStyle(this.data.config.lineColor)  // 线条颜色
    ctx.setLineWidth(2)  // 线条宽度
    for(var i = 0; i < this.data.lines.length - 1; i++){
      let a = this.calcPoint(this.data.lines[i])
      let b = this.calcPoint(this.data.lines[i + 1])
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
    }
    ctx.stroke()
  },
  getPosition(){
    let accuracys = this.getAccuracys(this.data.rssis).sort((a, b) => {
      return a.accuracy - b.accuracy
    }).filter(find => find.id != "4")
    console.log("去除同线前数据", accuracys)
    accuracys = this.solveSameLine(accuracys)
    console.log("去除同线后数据", accuracys)
    accuracys = accuracys.filter(find => {
      return find.accuracy <  600
    }).slice(0, 4)
    console.log("最终数据", accuracys)
    this.setData({
      accuracys
    })
    if(accuracys.length < 3){
      wx.showToast({
        title: '暂无足够信号！',
        icon: 'none'
      })
      return {
        x: -1,
        y: -1
      }
    }
    
    let combines = genCombines(accuracys.length, 3)
    let sumX = 0
    let sumY = 0
    let N = 0
    for (var i = 0; i < combines.length; i++) {
      let bases = combines[i].map(j => {
        let find = accuracys[j]
        let beacon = this.data.baeconMap[find.id]
        return {
          x: beacon.x,
          y: beacon.y,
          r: find.accuracy
        }
      })
      try {
        let nBases = trilateral(bases)
        sumX += nBases.x;
        sumY += nBases.y;
        N ++
      } catch {
        // console.log("?")
      }
    }
    return {
      x: sumX / N,
      y: sumY / N,
    }
  },
  solveSameLine(accuracys){
   let res = []
   for(var i = 0; i < accuracys.length; i++){
     var a = this.data.baeconMap[accuracys[i].id]
     let xCnt = 0; let yCnt = 0;
      for(var j = 0; j < res.length; j++){
        var b = this.data.baeconMap[res[j].id]
        // 小于两米
        if(Math.abs(a.x - b.x) <= 280) {
          xCnt ++
        }
        if(Math.abs(a.y - b.y) <= 300){
          yCnt ++
        }
        if(xCnt == 2 || yCnt == 2){
          if(accuracys[i].accuracy < res[j].accuracy){
            res[j] = accuracys[i]
          }
          break
        }
      }
      if(xCnt == 2 || yCnt == 2){
        continue
      }

      res.push(accuracys[i])
   }
   return res
  },
  getAccuracys(rssis) {
    let res = []
    for (var id in rssis) {
      let accuracys = rssis[id].slice(0).map(rssi => getAccuracy(rssi, this.data.config.rssi, this.data.config.n))
      
      
      accuracys = accuracys.sort((a, b) => a.accuracy - b.accuracy)
      // 高斯模糊
      accuracys = this.guassion(accuracys)
      
      // 卡尔曼滤波器
      accuracys = kalmanSmoothing(accuracys)

      // 时间加权
      let accuracysAvg = accuracys.slice(0, parseInt(accuracys.length / 2)).concat(accuracys).reduce((acc, val) => acc + val, 0) / (accuracys.length * 1.5)
      res.push({
        id,
        accuracy: accuracysAvg
      })
    }
    return res
  },
  guassion(accuracys) {
    let accuracysAvg = accuracys.reduce((acc, val) => acc + val, 0) / accuracys.length;
    let res = []
    for (var i in accuracys) {
      if (accuracys[i] === accuracysAvg) {
        res.push(accuracys[i])
        continue
      }

      let guassions = getOneGuassionArray(accuracys.length, i, Math.abs(accuracys[i] - accuracysAvg))
      let sum = 0.0
      for (var j in guassions) {
        sum += accuracys[j] * guassions[j]
      }
      res.push(sum)
    }
    
    return res
  },
  handleInputMinor: (e) => {
    this.setData({
      config: {
        ...this.data.config,
        minor: parseInt(e.detail.value),
      }
    })
  },
  handleInputRssi: (e) => {
    this.setData({
      config: {
        ...this.data.config,
        rssi: parseFloat(e.detail.value),
      }
    })
  },
  handleInputN: (e) => {
    this.setData({
      config: {
        ...this.data.config,
        n: parseFloat(e.detail.value),
      }
    })
  },
  handleBuildingClick() {
    wx.showActionSheet({
      itemList: this.data.buildings.map(building => building.text),
      success: (res) => {
        this.handleNavigation(res.tapIndex)
      }
    })
  },
  handleNavigation(index) {
    let building = this.data.buildings[index]
    wx.showLoading({
      title: '正在寻路中',
    })
    wx.request({
      url: 'https://ykdh.sexybeast.cn/waymo/navigation',
      method: 'POST',
      data: {
        "tx_co": parseInt(building.x * 10),
        "ty_co": parseInt(building.y * 10),
        "fx_co": parseInt(this.data.x * 10),
        "fy_co": parseInt(this.data.y * 10)
      },
      dataType: 'json',
      success: (res => {
        wx.hideLoading()
        if(res.data && res.data.status === 'success'){
          console.log(res.data.result.data.map(v => {
            return {
              x: v.x / 10,
              y: v.y / 10
            }
          }))
          this.setData({
            isNavigation: true,
            lines: res.data.result.data.map(v => {
              return {
                x: v.x / 10,
                y: v.y / 10
              }
            })
          })
          this.render()
        }
      }),
      fail: (res) => {
        wx.showToast({
          title: res.errMsg,
          icon: 'none'
        })
      }
    })
    console.log("当前点击的建筑物id: " + building)
  },
  handleCancelNavigation() {
    this.setData({
      isNavigation: false,
      lines: []
    })
    this.render()
  },
  handleReset() {
    stepManager.clearStep()
    this.setData({
      ...this.data.resetLocation,
      lastStep: 0,
      step: 0
    })
    this.render()
  },
  handleMoreAction() {
    wx.showActionSheet({
      itemList: ["复位", "定位"],
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.handleReset()
            break
          case 1:
            this.handleLocation()
            break
        }
      }
    })
  },
  
})