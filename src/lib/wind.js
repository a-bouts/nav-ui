const moment = require('moment');

class Stamp {
  constructor(ref_time, forecast_time) {
    this.ref_time = moment.utc(ref_time)
    this.forecast_time = moment.utc(forecast_time)
  }

  id() {
    return this.ref_time.format("YYYYMMDDHH") + "-" + this.forecast_time.format("YYYYMMDDHH")
  }

  fromNow() {
    return moment.duration(this.forecast_time - moment().utc()).asSeconds() / 3600
  }

  forecastHour() {
    return moment.duration(this.forecast_time.diff(this.ref_time)).asHours()
  }

  fileName() {
    return this.ref_time.format("YYYYMMDDHH") + ".f" + String(this.forecastHour()).padStart(3, '0')
  }
}


class Wind {
  constructor() {
    this.infos = null
    this.forecasts = null
    this.forecastsData = []
    this.loadingForecasts = null
    this.loadingForecastsData = {}
  }

  static get instance() {
      return (Wind._instance == null) ? Wind._instance = new Wind() : Wind._instance;
  }

  loadWinds() {
    if (this.loadingForecasts) {
      return this.loadingForecasts
    }

    const self = this
    this.loadingForecasts = new Promise(function(resolve, reject) {

      fetch('/winds/api/v2/winds?provider=noaa')
        .then(response => response.json())
        .then(response => {

          self.infos = {
            provider: response.provider,
            provider_name: response.provider_name,
            current_ref_time: moment.utc(response.current_ref_time),
            last: {
              forecast_time: moment.utc(response.last.forecast_time),
              ref_time: moment.utc(response.last.ref_time)
            },
            progress: response.progress
          }

          self.forecasts = []
          for (var forecast of response.forecasts) {
            var stamp = new Stamp(forecast.ref_times[0], forecast.forecast_time)
            self.forecasts.push({
              from_now: stamp.fromNow(),
              forecast_time: moment.utc(forecast.forecast_time).format("YYYYMMDDHH"),
              stamp: stamp,
              stamp2: forecast.ref_times.length > 1 ? new Stamp(forecast.ref_times[1], forecast.forecast_time) : null
            })
          }

          self.forecasts.sort((a, b) => a.from_now - b.from_now)

          var forecastsData = {}
          for (forecast of self.forecasts) {
            if (self.forecastsData[forecast.stamp.id()]) {
              forecastsData[forecast.stamp.id()] = self.forecastsData[forecast.stamp.id()]
            }
          }
          self.forecastsData = forecastsData

          resolve({infos: self.infos, forecasts: self.forecasts})
        })
        .catch((error) => {
          console.error('Error:', error)
          reject()
        }).finally(function() {
          self.loadingForecasts = null
        })
    })

    return this.loadingForecasts
  }

  loadWindAsync(w, n) {
    const self = this

    var stamp = w.stamp
    if (n === true && w.stamp2) {
      stamp = w.stamp2
    }

    if (this.loadingForecastsData[stamp.id()]) {
      return this.loadingForecastsData[stamp.id()]
    }

    if(self.forecastsData[stamp.id()]) {
      return new Promise(function(resolve) {
        resolve(self.forecastsData[stamp.id()])
      })
    }

    this.loadingForecastsData[stamp.id()] = new Promise(function(resolve, reject) {

      self.loadingForecastsData[stamp.id()] = this
      //fetch('/winds/api/v2/winds/'+stamp.forecast_time.format("YYYYMMDDHH")+'/'+stamp.ref_time.format("YYYYMMDDHH"))
      fetch('https://winds.phtheirichthys.fr/'+stamp.fileName())
        .then(response => response.json())
        .then(response => {
          self.forecastsData[stamp.id()] = response
          resolve(response)
          delete self.loadingForecastsData[stamp.id()]
        })
        .catch(error => {
          console.log("Error loading winds", error)
          reject()
          delete self.loadingForecastsData[stamp.id()]
        })
    })

    return this.loadingForecastsData[stamp.id()]
  }

  async loadWindAsync2(w) {
    if (w.stamp2) {
        return [await this.loadWindAsync(w, false), await this.loadWindAsync(w, true)]
    } else {
      return [await this.loadWindAsync(w, false)]
    }
  }

  loadAll(from, to) {
    let res = []

    const fromStamp = from.format("YYYYMMDDHH")
    const toStamp = to.format("YYYYMMDDHH")

    for (var i in this.forecasts) {
      if (this.forecasts[i].forecast < fromStamp) {
        if (i < this.forecasts.length - 1 && this.forecasts[i - -1].forecast > fromStamp) {
          res.push(this.loadWindAsync2(this.forecasts[i]))
        }
        continue
      }
      if (this.forecasts[i].forecast > toStamp) {
        if (i > 0 && this.forecasts[i - 1].forecast < toStamp) {
          res.push(this.loadWindAsync2(this.forecasts[i]))
        }
        break
      }

      res.push(this.loadWindAsync2(this.forecasts[i]))
    }

    return Promise.all(res)
  }

  findWinds(now) {
    const self = this

    const stamp = now.format("YYYYMMDDHH")

    return new Promise(function(resolve) {

      if (self.forecasts[0].forecast_time > stamp) {
        self.loadWindAsync2(self.forecasts[0]).then(() => {
          resolve([self.getWinds(self.forecasts[0]), null, 0])
        })
        return
      }
      for (var i in self.forecasts) {
        if (self.forecasts[i].forecast_time > stamp) {
          const m_i_1 = moment.utc(self.forecasts[i-1].forecast_time, "YYYYMMDDHH")
          const m_i = moment.utc(self.forecasts[i].forecast_time, "YYYYMMDDHH")
          const h = moment.duration(now.diff(m_i_1)).asMinutes();
          const delta = moment.duration(m_i.diff(m_i_1)).asMinutes();
          self.loadWindAsync2(self.forecasts[i-1]).then(() => {
            self.loadWindAsync2(self.forecasts[i]).then(() => {
              resolve([self.getWinds(self.forecasts[i-1]), self.getWinds(self.forecasts[i]), h / delta])
            })
          })
          return
        }
      }
      self.loadWindAsync2(self.forecasts[i-1]).then(() => {
        resolve([self.getWinds(self.forecasts[self.forecasts.length-1]), null, 0])
      })
    })
  }

  getWinds(forecast) {
    let res = []

    res.push(this.getWind(forecast, false))
    if (forecast.stamp2) {
      res.push(this.getWind(forecast, true))
    }

    return res
  }

  getWind(forecast, n) {
    var key = forecast.stamp.id()

    if (n === true && forecast.stamp2) {
      key = forecast.stamp2.id()
    }

    var w = {}
    for (var i in this.forecastsData[key]) {
      const h = this.forecastsData[key][i].header
      if(h.discipline == 0 && h.parameterCategory == 2) {
        w.Lat0 = h.la1// / 1e6
        w.Lon0 = h.lo1// / 1e6
        w.ΔLat = h.dy// / 1e6
        w.ΔLon = h.dx// / 1e6
        w.NLat = h.ny
        w.NLon = h.nx
        if(this.forecastsData[key][i].header.parameterNumber == 2)
          w.U = this.forecastsData[key][i].data
        else if(this.forecastsData[key][i].header.parameterNumber == 3)
          w.V = this.forecastsData[key][i].data
      }
    }
    return w
  }
  bilinearInterpolate(x, y, g00, g10, g01, g11) {
    const rx = (1 - x)
    const ry = (1 - y)

    const a = rx * ry
    const b = x * ry
    const c = rx * y
    const d = x * y

    const u = g00[0]*a + g10[0]*b + g01[0]*c + g11[0]*d
    const v = g00[1]*a + g10[1]*b + g01[1]*c + g11[1]*d

    return [u, v, Math.sqrt(u*u + v*v)]
  }
  floorMod(a, n) {
    return a - n*Math.floor(a/n)
  }
  locInterpolate(w, lat, lon) {
    const i = Math.abs((lat - w.Lat0) / w.ΔLat)
    const j = this.floorMod(lon-w.Lon0, 360.0) / w.ΔLon

    const fi = Math.floor(i)
    const fj = Math.floor(j)
    const fi_plus_1 = fi + 1
    var fj_plus_1 = fj + 1
    if (fj_plus_1 == 360) {
      fj_plus_1 = 0
    }

    const u00 = w.U[fi * w.NLon + fj]
    const v00 = w.V[fi * w.NLon + fj]

    const u01 = w.U[fi_plus_1 * w.NLon + fj]
    const v01 = w.V[fi_plus_1 * w.NLon + fj]

    const u10 = w.U[fi * w.NLon + fj_plus_1]
    const v10 = w.V[fi * w.NLon + fj_plus_1]

    const u11 = w.U[fi_plus_1 * w.NLon + fj_plus_1]
    const v11 = w.V[fi_plus_1 * w.NLon + fj_plus_1]

    return this.bilinearInterpolate(j-fj, i-fi, [u00, v00], [u10, v10], [u01, v01], [u11, v11])
  }
  vectorToDegrees(u, v, d) {
    const velocityDir = Math.atan2(u/d, v/d)
    const velocityDirToDegrees = velocityDir*180/Math.PI + 180
    return velocityDirToDegrees
  }
  midInterpolate(w, lat, lon, h) {

    if (w.length == 1) {
      return this.locInterpolate(w[0], lat, lon)
    }

    let uv1 = this.locInterpolate(w[0], lat, lon)
    let uv2 = this.locInterpolate(w[1], lat, lon)
    let u = uv2[0] * h + uv1[0] * (1 - h)
    let v = uv2[1] * h + uv1[1] * (1 - h)

    return [u, v]
  }
  interpolate(w1, w2, lat, lon, h) {
    const uv1 = this.midInterpolate(w1.slice(w1.length - 1, w1.length), lat, lon, 1-h)
    var u = uv1[0]
    var v = uv1[1]

    if (w2) {
      const uv2 = this.midInterpolate(w2, lat, lon, h)
      const u2 = uv2[0]
      const v2 = uv2[1]

      u = u2*h + u*(1-h)
      v = v2*h + v*(1-h)
    }
    let d = Math.sqrt(u*u + v*v)

    if (d < 1.028888888888891) {
      d = 1.028888888888891
    }

    return [this.vectorToDegrees(u, v, d), d]
  }

}

export default Wind.instance
