import polarService from './polar.js';
import windService from './wind.js';
const moment = require('moment')

class Vmc {
  constructor() {
    this.π = Math.PI
  }

  static get instance() {
      return (Vmc._instance == null) ? Vmc._instance = new Vmc() : Vmc._instance;
  }

  twa(heading, wind) {
    var twa = wind - heading
    if (twa <= -180) {
      twa += 360
    }
    if (twa > 180) {
      twa -= 360
    }

    return twa
  }

  heading(twa, wind) {
    var heading = wind - twa
    if (heading < 0) {
      heading += 360
    }
    if (heading >= 360) {
      heading -= 360
    }

    return heading
  }

  toRadians(a) {
    return a * this.π / 180.0
  }

  toDegrees(a) {
    return a * 180.0 / this.π
  }

  bearingTo(from, to) {
    let φ1 = this.toRadians(from.lat)
    let φ2 = this.toRadians(to.lat)

    var Δλ = this.toRadians(to.lon - from.lng)
    if (Math.abs(Δλ) > this.π) {
      if (Δλ > 0) {
        Δλ = -(2*this.π - Δλ)
      } else {
        Δλ = (2*this.π + Δλ)
      }
    }

    let Δψ = Math.log(Math.tan(φ2/2+this.π/4) / Math.tan(φ1/2+this.π/4))

    let θ = Math.atan2(Δλ, Δψ)

    let b = this.toDegrees(θ)

    return this.wrap360(b)
  }

  wrap360(d) {
    if (0.0 <= d && d < 360.0) {
      return d
    }

    //d1 := d - float64(int(d / 360.0) * 360) + 360.0
    let d1 = d + 360.0
    let d2 = d1%360
    return d2
  }

  async vmc(options, from, to) {

    let bearingTo = this.bearingTo(from, to);

    var winds = await windService.findWinds(moment().utc())
    let wind = windService.interpolate(winds[0], winds[1], from.lat, from.lng, winds[2])

    let β = bearingTo - wind[0]

    var max_vmc_twa_f = 0
    var max_vmc_f = 0

    for (var twa = 0; twa < 90 ; twa++) {

      //let heading = this.heading(twa, wind[0])

      let α = twa - β

      const polarRes = polarService.getBoatSpeed(options, twa, wind[1], false)

      let vmc = Math.abs(polarRes.boatSpeed * Math.cos(this.toRadians(α)))

      if (vmc > max_vmc_f) {
        max_vmc_f = vmc
        max_vmc_twa_f = twa
      }
    }

    var max_vmc_twa_b = 0
    var max_vmc_b = 0

    for (twa = 90; twa < 180 ; twa++) {

      //let heading = this.heading(twa, wind[0])

      let α = twa - β

      const polarRes = polarService.getBoatSpeed(options, twa, wind[1], false)

      let vmc = Math.abs(polarRes.boatSpeed * Math.cos(this.toRadians(α)))

      if (vmc > max_vmc_b) {
        max_vmc_b = vmc
        max_vmc_twa_b = twa
      }
    }

    return {front: {twa: max_vmc_twa_f, vmc: max_vmc_f}, back: {twa: max_vmc_twa_b, vmc: max_vmc_b}}
  }

}

export default Vmc.instance
