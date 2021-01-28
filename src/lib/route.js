import polarService from './polar.js';
import windService from './wind.js';
const moment = require('moment')

class Route {
  constructor() {
    this.R = 6371e3
    this.π = Math.PI

    this.deltas = {
      6:    1.0 / 6.0,
      12:   0.5,
      48:   1.0,
      72:   3.0,
      9999: 6.0
    }
  }

  static get instance() {
    return (Route._instance == null) ? Route._instance = new Route() : Route._instance;
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

  destination(from, heading, distance) {

    let φ1 = this.toRadians(from.lat)
    let λ1 = this.toRadians(from.lon)
    let θ = this.toRadians(heading)

    let δ = distance / this.R

    let Δφ = δ * Math.cos(θ)
    var φ2 = φ1 + Δφ

    if (Math.abs(φ2) > this.π/2) {
      if (φ2 > 0) {
        φ2 = this.π - φ2
      } else {
        φ2 = -this.π - φ2
      }
    }

    let Δψ = Math.log(Math.tan(φ2/2+this.π/4) / Math.tan(φ1/2+this.π/4))
    var q = Δφ / Δψ
    if (Math.abs(Δψ) <= 10e-12) {
      q = Math.cos(φ1)
    }

    let Δλ = δ * Math.sin(θ) / q
    let λ2 = λ1 + Δλ

    let lat = this.toDegrees(φ2)
    let lon = this.toDegrees(λ2)

    return {lat: lat, lon: lon}
  }

  jump(options, src, b, wb, ws, d) {
    var change = false

    var winchMalus = 5
    if (options.winch) {
      winchMalus = 1.25
    }

    const twa = this.twa(b, wb)

    const bearing = Math.round(b)

    const polarRes = polarService.getBoatSpeed(options, twa, ws, src.isInIceLimits)

    var dist = polarRes.boatSpeed * 1.852 * d * 1000.0
    if (twa*src.twa < 0 || polarRes.sail != src.sail) {

      // changement de voile = vitesse / 2 pendant 5 minutes : on enlève 2 minutes et demi
      dist = polarRes.boatSpeed * 1.852 * (d*60.0 - winchMalus/2) / 60 * 1000.0
      change = true
    }

    const to = this.destination(src.latlon, b, dist)

    const res = {
      latlon: to,
      bearing: bearing,
      twa: twa,
      wind: wb,
      windSpeed: ws * 1.943844,
      boatSpeed: polarRes.boatSpeed,
      sail: polarRes.sail,
      foil: polarRes.foil,
      isInIceLimits: false, //TODO
      duration: d + src.duration,
      change: change
    }

    return res
  }

  async init(params) {
    if (!windService.providers) {
      await windService.loadProviders()
    }
    if (!windService.winds) {
      await windService.loadWinds()
    }

    await windService.loadAll(moment(params.startTime).utc(), moment(params.startTime).add(params.params.maxDuration*60.0, 'm').utc())
  }

  async evalSneak(params, heading) {

    return {
      startTime: params.startTime,
      twa: await this.twaSneak(params, heading),
      bearing: await this.bearingSneak(params, heading)
    }
  }

  async bearingSneak(params, b) {
    var hops = []

    const result = {}

    let now = moment(params.startTime).utc()

    var winds = await windService.findWinds(now)

    let wind = windService.interpolate(winds[0], winds[1], params.start.lat, params.start.lon, winds[2])

    var duration = 0

    var pos = {
      latlon:  params.start,
      bearing: b,
      sail:    params.currentSail,
      duration: 0}
    pos.twa = this.twa(b, wind[0])
    result[b] = [{
      lat:      params.start.lat,
      lon:      params.start.lon,
      twa:      pos.twa,
      bearing:  b,
      duration: 0,
    }]
    hops[b] = pos

    while (duration < params.params.maxDuration) {

      var delta = 1

      for (var ke in this.deltas) {
        if (duration < ke) {
          delta = this.deltas[ke]
          break
        }
      }

      let src = result[b][result[b].length-1]

      wind = windService.interpolate(winds[0], winds[1], src.lat, src.lon, winds[2])

      let pos = this.jump(params.options, hops[b], b, wind[0], wind[1], delta)

      result[b].push({
        lat:      pos.latlon.lat,
        lon:      pos.latlon.lon,
        duration: pos.duration,
      })
      src.bearing = b
      src.twa = pos.twa
      src.wind = pos.wind
      src.windSpeed = pos.windSpeed
      src.boatSpeed = pos.boatSpeed
      src.sail = pos.sail
      src.foil = pos.foil
      src.ice = pos.isInIceLimits
      hops[b] = pos

      duration += delta
      now = now.add(delta*60.0, 'm')
      winds = await windService.findWinds(now)
    }

    return result
  }

  async twaSneak(params, b) {
    var hops = []

    const result = {}

    let now = moment(params.startTime).utc()

    var winds = await windService.findWinds(now)

    let wind = windService.interpolate(winds[0], winds[1], params.start.lat, params.start.lon, winds[2])

    let t = Math.round(this.twa(b, wind[0]))

    var duration = 0

    var pos = {
      latlon:  params.start,
      sail:    params.currentSail,
      duration: 0}
    pos.twa = this.twa(b, wind[0])
    result[b] = [{
      lat:      params.start.lat,
      lon:      params.start.lon,
      duration: 0,
    }]
    hops[b] = pos

    while (duration < params.params.maxDuration) {

      var delta = 1

      for (var ke in this.deltas) {
        if (duration < ke) {
          delta = this.deltas[ke]
          break
        }
      }

      let src = result[b][result[b].length-1]

      wind = windService.interpolate(winds[0], winds[1], src.lat, src.lon, winds[2])

      var heading = this.heading(t, wind[0])

      let pos = this.jump(params.options, hops[b], heading, wind[0], wind[1], delta)

      result[b].push({
        lat:      pos.latlon.lat,
        lon:      pos.latlon.lon,
        duration: pos.duration,
      })
      src.bearing = heading
      src.twa = pos.twa
      src.wind = pos.wind
      src.windSpeed = pos.windSpeed
      src.boatSpeed = pos.boatSpeed
      src.sail = pos.sail
      src.foil = pos.foil
      src.ice = pos.isInIceLimits
      hops[b] = pos

      duration += delta
      now = now.add(delta*60.0, 'm')
      winds = await windService.findWinds(now)
    }

    return result
  }
}

export default Route.instance
