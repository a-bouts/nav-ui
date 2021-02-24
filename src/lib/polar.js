class Polar {
  constructor() {
    this.boat = null
    this.polar = null
  }

  static get instance() {
      return (Polar._instance == null) ? Polar._instance = new Polar() : Polar._instance;
  }

  load(boat) {
    const self = this
    return new Promise(function(resolve, reject) {
      if (boat === self.boat) {
        resolve(self.polar)
        return
      }

      self.boat = boat
      fetch('/polars/' + boat + '.json')
        .then(response => response.json())
        .then(polar => {
          self.polar = polar
          resolve(self.polar)
        })
        .catch((error) => {
          console.error('Error:', error)
          reject()
        })
    })
  }

  interpolationIndex(values, value) {
    var i = 0
    while(values[i] < value) {
      i++
      if(i == values.length) {
        if(values[i-1] < value) {
          return {i0: i - 1, i1: 0, p0: 1}
        }
        return {i0: i - 1, i1: i, p0: (values[i] - value) / (values[i] - values[i-1])}
      }
    }

    if(i > 0) {
      return {i0: i - 1, i1: i, p0: (values[i] - value) / (values[i] - values[i-1])}
    }

    return {i0: 0, i1: 0, p0: 0}
  }

  foil(twa, ws) {
    var ct = 0.0
    var cv = 0.0
    if (twa <= this.polar.foil.twaMin-this.polar.foil.twaMerge) {
      return 1.0
    } else if (twa < this.polar.foil.twaMin) {
      ct = (twa-(this.polar.foil.twaMin-this.polar.foil.twaMerge)) / this.polar.foil.twaMerge
    } else if (twa < this.polar.foil.twaMax) {
      ct = 1
    } else if (twa < this.polar.foil.twaMax+this.polar.foil.twaMerge) {
      ct = (this.polar.foil.twaMax+this.polar.foil.twaMerge-twa) / this.polar.foil.twaMerge
    } else {
      return 1.0
    }
    if (ws <= this.polar.foil.twsMin-this.polar.foil.twsMerge) {
      return 1.0
    } else if (ws < this.polar.foil.twsMin) {
      cv = (ws - (this.polar.foil.twsMin - this.polar.foil.twsMerge)) / this.polar.foil.twsMerge
    } else if (ws < this.polar.foil.twsMax) {
      cv = 1
    } else if (ws < this.polar.foil.twsMax+this.polar.foil.twsMerge) {
      cv = (this.polar.foil.twsMax + this.polar.foil.twsMerge - ws) / this.polar.foil.twsMerge
    } else {
      return 1.0
    }
    return 1.0 + (this.polar.foil.speedRatio-1)*ct*cv
  }

  getBoatSpeed(options, t, ws, isInIceLimits) {
    // convert m/s to kts
    ws = ws * 1.9438444924406

    if (t < 0) {
      t = -1 * t
    }
    if (t > 180) {
      t = 360 - t
    }

    const tws = this.interpolationIndex(this.polar.tws, ws)
    const twa = this.interpolationIndex(this.polar.twa, t)

    var maxBs = 0
    var maxS = null
    this.polar.sail.forEach((sail, s) => {

      if((sail.name == "LIGHT_JIB" || sail.name == "LIGHT_GNK" || sail.name == "LightJib" || sail.name == "LightGnk") && (options.sail & 1) != 1) {
        return
      }
      if((sail.name == "STAYSAIL" || sail.name == "HEAVY_GNK" || sail.name == "Staysail" || sail.name == "HeavyGnk") && (options.sail & 4) != 4) {
        return
      }
      if((sail.name == "CODE_0" || sail.name == "Code0") && (options.sail & 2) != 2) {
        return
      }

      const bs = (sail.speed[twa.i0][tws.i0]*tws.p0 + sail.speed[twa.i0][tws.i1]*(1-tws.p0))*twa.p0
        + (sail.speed[twa.i1][tws.i0]*tws.p0 + sail.speed[twa.i1][tws.i1]*(1-tws.p0))*(1-twa.p0)

      if(bs > maxBs) {
        maxBs = bs
        maxS = s
      }
    });

    maxBs *= this.polar.globalSpeedRatio
    if (isInIceLimits) {
      maxBs *= this.polar.iceSpeedRatio
    }
    if(options.hull) {
      maxBs *= this.polar.hull.speedRatio
    }

    var foil = this.foil(t, ws)
    if(options.foil) {
      maxBs *= foil
    }

    return { boatSpeed: maxBs, sail: maxS, foil: Math.round((foil - 1.0) * 100 / (this.polar.foil.speedRatio - 1)).toFixed(0) }
  }
}

export default Polar.instance
