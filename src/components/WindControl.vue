<template>
  <div class="leaflet-control-layers leaflet-control forecast-times" :class="{expanded: !colapsed}">
    <div v-show="!colapsed" class="has-text-centered is-clickable" @click="colapsed = !colapsed">
      <i class="fas fa-caret-up"></i>
    </div>
    <div class="stamp" :class="windStatus"><i class="fas fa-wind"></i><span v-if="progress > 0">{{ Math.round(progress * 100 / (forecasts.length - 2)) }}%</span></div>
    <div v-show="colapsed" class="columns m-0 is-clickable is-unselectable">
      <div class="column p-0 has-text-centered px-1" v-bind:class="forecastClass(mergedForecasts[0])" @click="loadMergedWind(mergedForecasts[0])">
        {{ mergedForecasts[0].display }}
      </div>
    </div>
    <div v-show="!colapsed" class="columns m-0 is-clickable is-unselectable" v-for="forecast in mergedForecasts" :key="forecast.hour">
      <div class="column p-0 has-text-centered px-1" v-bind:class="forecastClass(forecast)" @click="loadMergedWind(forecast)">
        {{ forecast.display }}
      </div>
    </div>
    <div v-show="colapsed" class="has-text-centered is-clickable" @click="colapsed = !colapsed">
      <i class="fas fa-caret-down"></i>
    </div>
    <!--<div v-show="!colapsed" class="columns m-0 is-clickable is-unselectable" v-for="(forecast, index) in forecasts" :key="forecast.hour">
      <div v-if="forecast.stamp2 != ''" v-bind:class="forecastOldClass(forecast)" @click="loadWind(forecast.forecast, 0)" class="column p-0 has-text-left pl-1">
        <i class="fas fa-history"></i>
      </div>
      <div v-if="index == 0" class="column p-0 has-text-centered px-1" v-bind:class="forecastClass(forecast)" @click="loadWind(forecast.forecast, forecast.stamp2 == '' ? 0 : 1)">
        {{ forecast.time }}h00
      </div>
      <div v-if="index > 0" class="column p-0 has-text-centered px-1" v-bind:class="forecastClass(forecast)" @click="loadWind(forecast.forecast, forecast.stamp2 == '' ? 0 : 1)">
        <span v-if="forecast.hour - forecasts[0].hour >= 24 && (forecast.hour - forecasts[0].hour) % 24 < 3">+{{ Math.floor((forecast.hour - forecasts[0].hour)/24) }}j</span>
        <span v-else>+{{ (forecast.hour - forecasts[0].hour)%24 }}h</span>
      </div>
    </div>-->
  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet-velocity'
const moment = require('moment');

export default {
  name: 'WindControl',
  props: {
    map: Object,
    layerControl: Object
  },
  data: function () {

    const mergedForecasts = []
    var now = new Date()
    mergedForecasts.push({
      hour: 0,
      display: now.getHours() + ":" + ("00" + now.getMinutes()).slice(-2),
      date: now
    })
    for(var i = 1 ; i <= 24 ; i++) {
      var date = new Date(now.getTime())
      date.setHours(date.getHours() + i)
      mergedForecasts.push({
        hour: i,
        display: "+ " + i + "h",
        date: date
      })
    }
    for(i = 30 ; i <= 48 ; i+=6) {
      date = new Date(now.getTime())
      date.setHours(date.getHours() + i)
      mergedForecasts.push({
        hour: i,
        display: "+ " + i + "h",
        date: date
      })
    }
    for(i = 72 ; i <= 360 ; i+=24) {
      date = new Date(now.getTime())
      date.setHours(date.getHours() + i)
      mergedForecasts.push({
        hour: i,
        display: i % 24 == 0 ? "+ " + Math.round(i/24) + "j" : "+ " + i + "h",
        date: date
      })
    }

    now = new Date()

    const h0 = new Date()
    h0.setUTCHours(-3)
    h0.setUTCMinutes(30)
    h0.setUTCSeconds(0)
    h0.setUTCMilliseconds(0)
    const h1 = new Date()
    h1.setUTCHours(3)
    h1.setUTCMinutes(30)
    h1.setUTCSeconds(0)
    h1.setUTCMilliseconds(0)
    const h2 = new Date()
    h2.setUTCHours(9)
    h2.setUTCMinutes(30)
    h2.setUTCSeconds(0)
    h2.setUTCMilliseconds(0)
    const h3 = new Date()
    h3.setUTCHours(15)
    h3.setUTCMinutes(30)
    h3.setUTCSeconds(0)
    h3.setUTCMilliseconds(0)
    const h4 = new Date()
    h4.setUTCHours(21)
    h4.setUTCMinutes(30)
    h4.setUTCSeconds(0)
    h4.setUTCMilliseconds(0)

    var lastStamp = ""
    if(now >= h4) {
      lastStamp = h4.getUTCFullYear() + ("00" + (h4.getUTCMonth() + 1)).slice(-2) + ("00" + h4.getUTCDate()).slice(-2) + "18"
    } else if(now >= h3) {
      lastStamp = h3.getUTCFullYear() + ("00" + (h3.getUTCMonth() + 1)).slice(-2) + ("00" + h3.getUTCDate()).slice(-2) + "12"
    } else if(now >= h2) {
      lastStamp = h2.getUTCFullYear() + ("00" + (h2.getUTCMonth() + 1)).slice(-2) + ("00" + h2.getUTCDate()).slice(-2) + "06"
    } else if(now >= h1) {
      lastStamp = h1.getUTCFullYear() + ("00" + (h1.getUTCMonth() + 1)).slice(-2) + ("00" + h1.getUTCDate()).slice(-2) + "00"
    } else {
      lastStamp = h0.getUTCFullYear() + ("00" + (h0.getUTCMonth() + 1)).slice(-2) + ("00" + h0.getUTCDate()).slice(-2) + "18"
    }
    now.setHours(now.getHours() - 1)

    return {
      windIsOnTime: undefined,
      velocityLayer: null,
      forecasts: [
      ],
      forecastsData: {},
      selectedForecast: "",
      lastForecast: now,
      lastStamp: lastStamp,
      progress: 0,
      colapsed: true,
      mergedForecasts: mergedForecasts,
      atDate: null
    }
  },
  mounted: function() {
    const it = this
    this.velocityLayer = L.velocityLayer({
            displayValues: true,
            displayOptions: {
                    velocityType: 'Global Wind',
                    position: 'bottomleft',
                    displayPosition: 'bottomleft',
                    displayEmptyString: 'No wind data',
                    angleConvention: 'meteoCW',
                    speedUnit: 'kt'
            },
            maxVelocity: 15
    }).addTo(this.map);
    this.layerControl.addOverlay(this.velocityLayer, "Wind");

    this.$http.get('/winds').then(response => {
      this.forecasts = response.body
      this.forecasts.sort((a, b) => a.hour - b.hour)

      var d = new Date()
      d.setUTCFullYear(this.forecasts[0].forecast.substr(0, 4))
      d.setUTCMonth(this.forecasts[0].forecast.substr(4, 2) - 1)
      d.setUTCDate(this.forecasts[0].forecast.substr(6, 2))
      d.setUTCHours(this.forecasts[0].forecast.substr(8, 2))
      d.setUTCMinutes(0)
      d.setUTCSeconds(0)
      d.setUTCMilliseconds(0)

      this.forecasts[0].time = d.getHours()

      var maxForecast
      for(var i = 2 ; i < this.forecasts.length ; i++) {
        var forecast = this.forecasts[i]
        if (forecast.stamp == it.lastStamp) {
          maxForecast = forecast.forecast
          it.progress++
        }
      }
      if(maxForecast) {
        it.lastForecast = this.getDateFromForecast(maxForecast)
      }
      it.windIsOnTime = it.progress > 0

      this.loadMergedWind(this.mergedForecasts[0])

    }, () => {
      console.log("Error loading winds")
    });

  },
  computed: {
    windStatus: function() {
      return {
        'has-text-danger': this.windIsOnTime === false,
        'has-text-success': this.windIsOnTime === true
      }
    },
  },
  methods: {
    forecastClass: function(forecast) {
      return {
        last: forecast.date <= this.lastForecast,
        selected: forecast.hour == this.selectedForecast
      }
    },
    forecastOldClass: function(forecast) {
      return {
        last: forecast.stamp == this.lastStamp,
        selected: forecast.hour == this.selectedForecast
      }
    },
    loadWind: function(forecast, stamp) {

      if(this.forecastsData[forecast + (stamp != undefined ? "-" + stamp : "")]) {
        this.velocityLayer.setData(this.forecastsData[forecast + (stamp ? "-" + stamp : "")])
        this.selectedForecast = forecast + (stamp != undefined ? "-" + stamp : "")
      } else {
        this.$http.get('/winds/'+forecast + (stamp != undefined ? "/" + stamp : "")).then(response => {
          this.forecastsData[forecast] = response.body
          this.velocityLayer.setData(response.body)
          this.selectedForecast = forecast + (stamp != undefined ? "-" + stamp : "")
        }, () => {
          console.log("Error loading winds")
        })
      }
    },
    loadWindAsync: function(forecast, stamp) {
      const it = this

      return new Promise(function(resolve, reject) {
        if(it.forecastsData[forecast + (stamp != undefined ? "-" + stamp : "")]) {
          resolve(it.forecastsData[forecast + (stamp ? "-" + stamp : "")])
        } else {
          it.$http.get('/winds/'+forecast + (stamp != undefined ? "/" + stamp : "")).then(response => {
            it.forecastsData[forecast] = response.body
            resolve(response.body)
          }, () => {
            console.log("Error loading winds")
            reject()
          })
        }
      })
    },
    findWinds: function(now) {
      const stamp = now.format("YYYYMMDDHH")

      var keys = []
      for(var i in this.forecasts) {
        keys.push(this.forecasts[i].forecast)
      }
      keys.sort()
      if (keys[0] > stamp) {
        return [this.getWind(keys[0]), null, 0]
      }
      for (i in keys) {
        if (keys[i] > stamp) {
          const m_i_1 = moment(keys[i-1], "YYYYMMDDHH")
          const m_i = moment(keys[i], "YYYYMMDDHH")
          const h = moment.duration(now.diff(m_i_1)).asMinutes();
          const delta = moment.duration(m_i.diff(m_i_1)).asMinutes();
          return [this.getWind(keys[i-1]), this.getWind(keys[i]), h / delta]
        }
      }
      return [this.getWind(keys[length(keys)-1]), null, 0]

    },
    getWind: function(w) {
      for (var i in this.forecastsData[w]) {
        const h = this.forecastsData[w][i].header
        if(h.discipline == 0 && h.parameterCategory == 2) {
          const w = {
            Lat0: h.La1 / 1e6,
            Lon0: h.Lo1 / 1e6,
            ΔLat: h.Di / 1e6,
            ΔLon: h.Dj / 1e6,
            NLat: h.Nj,
            NLon: h.Ni
          }
          if(this.forecastsData[w][i].header.parameterNumber == 2)
            w.U = this.forecastsData[w][i].data
          else if(this.forecastsData[w][i].header.parameterNumber == 3)
            w.V = this.forecastsData[w][i].data
        }
      }
      return w
    },
    bilinearInterpolate: function(x, y, g00, g10, g01, g11) {
      const rx = (1 - x)
      const ry = (1 - y)

      const a = rx * ry
      const b = x * ry
      const c = rx * y
      const d = x * y

      const u = g00[0]*a + g10[0]*b + g01[0]*c + g11[0]*d
      const v = g00[1]*a + g10[1]*b + g01[1]*c + g11[1]*d

      return [u, v, Math.sqrt(u*u + v*v)]
    },
    floorMod: function(a, n) {
      return a - n*Math.floor(a/n)
    },
    locInterpolate: function(w, lat, lon) {
      const i = Math.abs((lat - w.Lat0) / w.ΔLat)
      const j = this.floorMod(lon-w.Lon0, 360.0) / w.ΔLon

      const fi = Math.floor(i)
      const fj = Math.floor(j)

      const u00 = w.U[fi][fj]
      const v00 = w.V[fi][fj]

      const u01 = w.U[fi+1][fj]
      const v01 = w.V[fi+1][fj]

      const u10 = w.U[fi][fj+1]
      const v10 = w.V[fi][fj+1]

      const u11 = w.U[fi+1][fj+1]
      const v11 = w.V[fi+1][fj+1]

      return this.bilinearInterpolate(j-fj, i-fi, [u00, v00], [u10, v10], [u01, v01], [u11, v11])
    },
    vectorToDegrees: function(u, v, d) {
      const velocityDir = Math.atan2(u/d, v/d)
      const velocityDirToDegrees = velocityDir*180/Math.PI + 180
      return velocityDirToDegrees
    },
    interpolate: function(w, w1, lat, lon, h) {
      const uvd = this.interpolate(w, lat, lon)
      var u = uvd[0]
      var v = uvd[1]
      var d = uvd[2]

      if (w1) {
        const uvd1 = this.interpolate(w1, lat, lon)
        const u1 = uvd1[0]
        const v1 = uvd1[1]

        u = u1*h + u*(1-h)
        v = v1*h + v*(1-h)
        d = Math.sqrt(u*u + v*v)
      }

      return [this.vectorToDegrees(u, v, d), d]
    },
    mergeWinds: function(w1, w2, h) {
      var w = []

      for(var i = 0 ; i < w1.length ; i++) {
        var item = {
          header: w1[i].header,
          data: []
        }

        for(var j = 0 ; j < w1[i].data.length ; j++) {
          item.data.push(w2[i].data[j]*h + w1[i].data[j]*(1-h))
        }

        w.push(item)
      }
      return w
    },
    getDateFromForecast(forecast) {
      var d = new Date()
      d.setUTCFullYear(forecast.substr(0, 4))
      d.setUTCMonth(forecast.substr(4, 2) - 1)
      d.setUTCDate(forecast.substr(6, 2))
      d.setUTCHours(forecast.substr(8, 2))
      d.setUTCMinutes(0)
      d.setUTCSeconds(0)
      d.setUTCMilliseconds(0)

      return d
    },
    loadWindAt: function(d) {
      if (this.mergedForecasts.length == 0 || d < this.mergedForecasts[0].date)
        return

      if (this.atDate) {
        this.mergedForecasts.splice(this.atDate, 1)
        this.atDate = null
      }

      var date = new Date(d.getTime())
      date.setSeconds(0)
      date.setMilliseconds(0)
      var forecast = {
        display: ("00" + date.getHours()).slice(-2) + ":" + ("00" + date.getMinutes()).slice(-2),
        hour: "z",
        date: date
      }
      var i
      for(i = 0 ; i < this.mergedForecasts.length - 1 ; i++) {
        var d1 = this.mergedForecasts[i].date
        var d2 = this.mergedForecasts[i + 1].date
        if (date == d1) {
          this.loadMergedWind(this.mergedForecasts[i])
          return
        }
        if (date == d2) {
          this.loadMergedWind(this.mergedForecasts[i+1])
          return
        }
        if (date > d1 && date < d2)
        {
          break
        }
      }
      this.mergedForecasts.splice(i + 1, 0, forecast)
      this.loadMergedWind(forecast).then(() => {
        this.atDate = i + 1
      })
    },
    loadMergedWind: function(mergedForecast) {
      const it = this

      if (it.atDate) {
        it.mergedForecasts.splice(it.atDate, 1)
        it.atDate = null
      }

      return new Promise(function(resolve) {

        if(mergedForecast.data) {
          it.selectedForecast = mergedForecast.hour
          it.velocityLayer.setData(mergedForecast.data)
          resolve()
        } else {
          var i = 0
          for(i = 0 ; i < it.forecasts.length - 1 ; i++) {
            var d1 = it.getDateFromForecast(it.forecasts[i].forecast)
            var d2 = it.getDateFromForecast(it.forecasts[i + 1].forecast)

            if(mergedForecast.date >= d1 && mergedForecast.date < d2) {
              mergedForecast.w1 = it.forecasts[i].forecast
              mergedForecast.w2 = it.forecasts[i + 1].forecast
              mergedForecast.h = (mergedForecast.date.getTime() - d1.getTime()) / (d2.getTime() - d1.getTime())
              break
            }
          }

          if(!mergedForecast.w1) {
            mergedForecast.w1 = it.forecasts[it.forecasts.length - 1].forecast
            mergedForecast.w2 = it.forecasts[it.forecasts.length - 1].forecast
            mergedForecast.h = 1
          }

          it.loadWindAsync(mergedForecast.w1, 0).then(w1 => {
            it.loadWindAsync(mergedForecast.w2, 0).then(w2 => {
              it.selectedForecast = mergedForecast.hour
              mergedForecast.data = it.mergeWinds(w1, w2, mergedForecast.h)
              it.velocityLayer.setData(mergedForecast.data)
              resolve()
            })
          })
        }
      })
    }
  }
}
</script>

<style>
div.leaflet-top.leaflet-right {
    height: 100%;
    display: flex;
    flex-flow: column;
}
div.leaflet-control-layers.leaflet-control.forecast-times.expanded {
  overflow-y: scroll;
}
div.leaflet-control-layers.leaflet-control.forecast-times.colapsed {
    height: 120px;
}
</style>

<style scoped>

div.leaflet-control-layers.leaflet-control.forecast-times {
    margin-bottom: 10px;
    -webkit-overflow-scrolling: touch;
    z-index: 25;
}

.stamp {
    text-align: center;
}

.days {
    display: inline-block;
    width: 15px;
    text-align: center;
}

.hours {
    display: inline-block;
    width: 25px;
    text-align: center;
}

.last {
  background-color: #bee5c1;
}

.selected {
    color: #fff;
    background-color: #3388ff;
    opacity: 0.5;
}
</style>
