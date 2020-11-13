<template>
  <div class="leaflet-control-layers leaflet-control forecast-times" :class="{expanded: !colapsed}">
    <div class="stamp">{{ lastStamp.slice(-2) }}h {{ Math.round(progress * 100 / (forecasts.length - 2)) }}%</div>
    <div v-show="colapsed" class="columns m-0 is-clickable is-unselectable">
      <div class="column p-0 has-text-centered px-1" v-bind:class="forecastClass(mergedForecasts[0])" @click="loadMergedWind(mergedForecasts[0])">
        {{ mergedForecasts[0].display }}
      </div>
    </div>
    <div class="has-text-centered is-clickable" @click="colapsed = !colapsed">
      <span v-show="colapsed"><i class="fas fa-caret-down"></i></span>
      <span v-show="!colapsed"><i class="fas fa-caret-up"></i></span>
    </div>
    <div v-show="!colapsed" class="columns m-0 is-clickable is-unselectable" v-for="forecast in mergedForecasts" :key="forecast.hour">
      <div class="column p-0 has-text-centered px-1" v-bind:class="forecastClass(forecast)" @click="loadMergedWind(forecast)">
        {{ forecast.display }}
      </div>
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
    map: Object
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
    now.setHours(now.getHours() - 1)

    return {
      velocityLayer: null,
      forecasts: [
      ],
      forecastsData: {},
      selectedForecast: "",
      lastForecast: now,
      lastStamp: now.getUTCFullYear() + ("00" + (now.getUTCMonth() + 1)).slice(-2) + ("00" + now.getUTCDate()).slice(-2) + ("00" + (now.getUTCHours() - now.getUTCHours()%6)).slice(-2),
      progress: 0,
      colapsed: true,
      mergedForecasts: mergedForecasts
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

      this.loadMergedWind(this.mergedForecasts[0])

    }, () => {
      console.log("Error loading winds")
    });

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
          item.data.push(w1[i].data[j]*h + w2[i].data[j]*(1-h))
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
    loadMergedWind: function(mergedForecast) {
      const it = this

      if(mergedForecast.data) {
        this.velocityLayer.setData(mergedForecast.data)
        this.selectedForecast = mergedForecast.hour
      } else {
        // il va falloir merger. deja on regarde si on a les vents pour...
        var i = 0
        for(i = 0 ; i < this.forecasts.length - 1 ; i++) {
          var d1 = this.getDateFromForecast(this.forecasts[i].forecast)
          var d2 = this.getDateFromForecast(this.forecasts[i + 1].forecast)

          if(mergedForecast.date >= d1 && mergedForecast.date < d2) {
            mergedForecast.w1 = this.forecasts[i].forecast
            mergedForecast.w2 = this.forecasts[i + 1].forecast
            mergedForecast.h = (mergedForecast.date.getTime() - d1.getTime()) / (d2.getTime() - d1.getTime())
            break
          }
        }

        if(!mergedForecast.w1) {
          mergedForecast.w1 = this.forecasts[this.forecasts.length - 1].forecast
          mergedForecast.w2 = this.forecasts[this.forecasts.length - 1].forecast
          mergedForecast.h = 1
        }

        this.loadWindAsync(mergedForecast.w1, 0).then(w1 => {
          it.loadWindAsync(mergedForecast.w2, 0).then(w2 => {
            mergedForecast.data = it.mergeWinds(w1, w2, mergedForecast.h)
            this.velocityLayer.setData(mergedForecast.data)
            this.selectedForecast = mergedForecast.hour
          })
        })
      }
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
