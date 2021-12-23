<template>
  <div class="leaflet-control-layers leaflet-control forecast-times" :class="{expanded: !colapsed}">
    <div v-show="!colapsed" class="has-text-centered is-clickable" @click="colapsed = !colapsed">
      <i class="fas fa-caret-up"></i>
    </div>
    <div class="button is-small is-fullwidth is-white p-0" :class="windStatus"><i class="fas fa-wind"></i><span v-if="infos">{{ infos.progress }}%</span></div>
    <div class="columns m-0 is-clickable is-unselectable" v-for="(forecast, index) in mergedForecasts" :key="forecast.hour">
      <div v-show="!colapsed || index == 0 || forecast.hour == selectedForecast" class="column p-0 has-text-centered px-1" v-bind:class="forecastClass(forecast)" @click="loadMergedWind(forecast)">
        {{ forecast.display }}
      </div>
    </div>
    <div v-show="colapsed" class="has-text-centered is-clickable" @click="colapsed = !colapsed">
      <i class="fas fa-caret-down"></i>
    </div>
  </div>
</template>

<script>
import windService from '../lib/wind.js';
import L from 'leaflet'
import {EventBus} from '../event-bus.js';
import 'leaflet-velocity'

export default {
  name: 'WindControl',
  props: {
    settings: Object,
    map: Object,
    layerControl: Object
  },
  data: function () {

    const now = new Date()

    const whiteColorScale = ["rgb(255, 255, 255)"]
    const gradientColorScale = [
      "rgb(36,104, 180)",
      "rgb(60,157, 194)",
      "rgb(128,205,193 )",
      "rgb(151,218,168 )",
      "rgb(198,231,181)",
      "rgb(238,247,217)",
      "rgb(255,238,159)",
      "rgb(252,217,125)",
      "rgb(255,182,100)",
      "rgb(252,150,75)",
      "rgb(250,112,52)",
      "rgb(245,64,32)",
      "rgb(237,45,28)",
      "rgb(220,24,32)",
      "rgb(180,0,35)"
    ]

    return {
      windIsOnTime: undefined,
      options: {
        windHasBackgroundColor: false,
      },
      velocityLayerControl: null,
      velocityLayer: null,
      windTileLayerControl: null,
      windTileLayer: null,
      infos: null,
      forecasts: [],
      selectedForecast: "",
      lastStamp: this.initLastStamp(now),
      colapsed: true,
      mergedForecasts: this.initMergedForecasts(now),
      atDate: null,
      loading: false,
      whiteColorScale: whiteColorScale,
      gradientColorScale: gradientColorScale
    }
  },
  mounted: function() {
    const self = this

    EventBus.$on('settings', (settings) => {
      if (this.options.windHasBackgroundColor && !settings.windHasBackgroundColor) {
        this.map.removeLayer(this.windTileLayerControl)
      } else if (!this.options.windHasBackgroundColor && settings.windHasBackgroundColor) {
        this.windTileLayerControl.addTo(this.map)
      }
      if (settings && settings.windDisabled) {
        this.map.removeLayer(this.velocityLayerControl)
      }
      self.init(settings)
    })

    self.init(this.settings)

    this.velocityLayerControl = L.layerGroup()
    if (!this.settings || !this.settings.windDisabled) {
      this.velocityLayerControl.addTo(this.map)
    }
    this.layerControl.addOverlay(this.velocityLayerControl, "<i class='fas fa-wind'></i> Wind");

    this.windTileLayerControl = L.layerGroup()
    this.layerControl.addOverlay(this.windTileLayerControl, "<i class='fas fa-wind'></i> Wind 2");

    var colorScale = this.gradientColorScale
    if (this.options.windHasBackgroundColor) {
      this.windTileLayerControl.addTo(this.map)
      colorScale = this.whiteColorScale
    }

    this.velocityLayer = L.velocityLayer({
            displayValues: false,
            displayOptions: {
                    velocityType: 'Global Wind',
                    position: 'bottomleft',
                    displayPosition: 'bottomleft',
                    displayEmptyString: 'No wind data',
                    angleConvention: 'meteoCW',
                    speedUnit: 'kt'
            },
            maxVelocity: 15,
            zIndex: 20,
            colorScale: colorScale
    }).addTo(this.velocityLayerControl)

    this.loadWinds().then(() => {
      this.loadMergedWind(this.mergedForecasts[0])
    })

    var date1 = new Date()
    var date2 = new Date(date1)
    date1.setSeconds(0)
    date1.setMilliseconds(0)
    date1.setMinutes(date1.getMinutes() - date1.getMinutes()%10 + 10)
    window.setTimeout(() => { this.refresh()}, date1.getTime() - date2.getTime())

    date1 = new Date()
    date2 = new Date(date1)
    date1.setSeconds(0)
    date1.setMilliseconds(0)
    date1.setMinutes(date1.getMinutes() - date1.getMinutes()%5 + 6)
    window.setTimeout(() => { this.refreshWinds()}, date1.getTime() - date2.getTime())

    this.map.on("overlayremove", function(event) {
      if (event.layer === self.windTileLayerControl) {
        console.log("REMOVE WIND 2")
        self.velocityLayerControl.clearLayers()
        self.velocityLayer = L.velocityLayer({
                displayValues: false,
                displayOptions: {
                        velocityType: 'Global Wind',
                        position: 'bottomleft',
                        displayPosition: 'bottomleft',
                        displayEmptyString: 'No wind data',
                        angleConvention: 'meteoCW',
                        speedUnit: 'kt'
                },
                colorScale: self.gradientColorScale,
                maxVelocity: 15,
                zIndex: 20,
                data: self.velocityLayer.options.data
        }).addTo(self.velocityLayerControl)
      }
    })
    this.map.on("overlayadd", function(event) {
      if (event.layer === self.windTileLayerControl) {
        console.log("ADD WIND 2")
        self.velocityLayerControl.clearLayers()
        self.velocityLayer = L.velocityLayer({
                displayValues: false,
                displayOptions: {
                        velocityType: 'Global Wind',
                        position: 'bottomleft',
                        displayPosition: 'bottomleft',
                        displayEmptyString: 'No wind data',
                        angleConvention: 'meteoCW',
                        speedUnit: 'kt'
                },
                colorScale: self.whiteColorScale,
                maxVelocity: 15,
                zIndex: 20,
                data: self.velocityLayer.options.data
        }).addTo(self.velocityLayerControl)
      }
    })
  },
  computed: {
    windStatus: function() {
      return {
        'has-text-danger': this.windIsOnTime === false,
        'has-text-success': this.windIsOnTime === true,
        'is-loading': this.loading
      }
    },
  },
  methods: {
    init: function(settings) {
      this.options = {
        windHasBackgroundColor: settings ? settings.windHasBackgroundColor : false
      }
    },
    forecastClass: function(forecast) {
      return {
        last: this.infos ? forecast.date <= this.infos.last.forecast_time.toDate() : false,
        selected: forecast.hour == this.selectedForecast
      }
    },
    getWindAt: function(pos) {
      var gridValue
      if (this.velocityLayer._windy) {
        gridValue = this.velocityLayer._windy.interpolatePoint(pos.lng, pos.lat)
      }
      if (gridValue && !isNaN(gridValue[0]) && !isNaN(gridValue[1]) && gridValue[2]) {
        var velocityAbs = Math.sqrt(Math.pow(gridValue[0], 2) + Math.pow(gridValue[1], 2));
        var direction = windService.vectorToDegrees(gridValue[0], gridValue[1], velocityAbs)
        var speed = this.meterSec2Knots(velocityAbs)
        return {direction: direction, speed: speed}
      } else {
        return null
      }
    },
    meterSec2Knots: function(meters) {
      return meters / 0.514;
    },
    initMergedForecasts: function(now) {
      now = new Date(now.getTime())
      now.setUTCMinutes(now.getUTCMinutes() - now.getUTCMinutes()%10)
      now.setUTCSeconds(0)
      now.setUTCMilliseconds(0)

      const mergedForecasts = []
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
      return mergedForecasts
    },
    initLastStamp: function(now) {
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

      return lastStamp
    },
    loadWinds: function() {
      this.loading = true

      const it = this
      return new Promise(function(resolve, reject) {
        windService.loadWinds().then(forecasts => {
          it.infos = forecasts.infos
          it.forecasts = forecasts.forecasts

          var d = new Date()
          d.setUTCFullYear(it.forecasts[0].forecast_time.substr(0, 4))
          d.setUTCMonth(it.forecasts[0].forecast_time.substr(4, 2) - 1)
          d.setUTCDate(it.forecasts[0].forecast_time.substr(6, 2))
          d.setUTCHours(it.forecasts[0].forecast_time.substr(8, 2))
          d.setUTCMinutes(0)
          d.setUTCSeconds(0)
          d.setUTCMilliseconds(0)

          it.forecasts[0].time = d.getHours()

          it.windIsOnTime = it.infos.last.ref_time.isSame(it.infos.current_ref_time)

          it.loading = false
          resolve()

        }, () => {
          console.log("Error loading winds")
          it.loading = false
          reject()
        })
      })
    },
    refresh: function() {
      var dateToLoad
      if (this.atDate) {
        dateToLoad = this.mergedForecasts[this.atDate].date
        this.atDate = null
      } else if (this.selectedForecast > 0) {
        for (var i=0;i<this.mergedForecasts.length;i++) {
          if (this.mergedForecasts[i].hour === this.selectedForecast) {
            dateToLoad = this.mergedForecasts[i].date
            break
          }
        }
      }

      const now = new Date()
      this.lastStamp = this.initLastStamp(now)
      this.mergedForecasts = this.initMergedForecasts(now)
      if (this.selectedForecast === 0) {
        this.loadMergedWind(this.mergedForecasts[0])
      } else if (dateToLoad) {
        this.loadWindAt(dateToLoad, true)
      }
      var date1 = new Date()
      var date2 = new Date(date1)
      date1.setSeconds(0)
      date1.setMilliseconds(0)
      date1.setMinutes(date1.getMinutes() - date1.getMinutes()%10 + 10)
      window.setTimeout(() => { this.refresh()}, date1.getTime() - date2.getTime())
    },
    refreshWinds: function() {
      this.loadWinds()
      window.setTimeout(() => { this.refreshWinds()}, 300000)
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
    loadWindAt: function(d, doNotLoadWinds) {
      if (this.loading || this.mergedForecasts.length == 0 || d < this.mergedForecasts[0].date)
        return

      if (this.atDate) {
        this.mergedForecasts.splice(this.atDate, 1)
        this.atDate = null
      }

      var date = new Date(d.getTime())
      date.setMinutes(date.getMinutes() - date.getMinutes()%10)
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
          this.loadMergedWind(this.mergedForecasts[i], doNotLoadWinds)
          return
        }
        if (date == d2) {
          this.loadMergedWind(this.mergedForecasts[i+1], doNotLoadWinds)
          return
        }
        if (date > d1 && date < d2)
        {
          break
        }
      }
      this.mergedForecasts.splice(i + 1, 0, forecast)
      this.loadMergedWind(forecast, doNotLoadWinds).then(() => {
        this.atDate = i + 1
      })
    },
    loadMergedWind: function(mergedForecast, doNotLoadWinds) {
      const it = this

      if (it.loading) {
        return
      }

      if (doNotLoadWinds !== true) {
        const timestamp = mergedForecast.date.getUTCFullYear() + ("00" + (mergedForecast.date.getUTCMonth() + 1)).slice(-2) + ("00" + mergedForecast.date.getUTCDate()).slice(-2) + ("00" + mergedForecast.date.getUTCHours()).slice(-2) + ("00" + mergedForecast.date.getUTCMinutes()).slice(-2)

        this.windTileLayerControl.clearLayers()
        this.windTileLayer = L.tileLayer('/tiles/wind/' + timestamp + '/{z}/{x}/{y}', {
          opacity: 0.7,
          zIndex: 10
        }).addTo(this.windTileLayerControl)
      }

      it.loading = true

      if (it.atDate) {
        it.mergedForecasts.splice(it.atDate, 1)
        it.atDate = null
      }

      return new Promise(function(resolve) {

        if(mergedForecast.data) {
          it.selectedForecast = mergedForecast.hour
          if (doNotLoadWinds !== true) {
            it.velocityLayer.setData(mergedForecast.data)
          }
          it.loading = false
          resolve()
        } else {
          var i = 0
          for(i = 0 ; i < it.forecasts.length - 1 ; i++) {
            var d1 = it.getDateFromForecast(it.forecasts[i].forecast_time)
            var d2 = it.getDateFromForecast(it.forecasts[i + 1].forecast_time)

            if(mergedForecast.date >= d1 && mergedForecast.date < d2) {
              mergedForecast.w1 = {forecast_time: it.forecasts[i].forecast_time, stamp: it.forecasts[i].stamp, stamp2: it.forecasts[i].stamp2}
              mergedForecast.w2 = {forecast_time: it.forecasts[i + 1].forecast_time, stamp: it.forecasts[i + 1].stamp, stamp2: it.forecasts[i + 1].stamp2}
              mergedForecast.h = (mergedForecast.date.getTime() - d1.getTime()) / (d2.getTime() - d1.getTime())
              break
            }
          }

          if(!mergedForecast.w1) {
            mergedForecast.w1 = {forecast_time: it.forecasts[it.forecasts.length - 1].forecast_time, stamp: it.forecasts[it.forecasts.length - 1].stamp, stamp2: it.forecasts[it.forecasts.length - 1].stamp2}
            mergedForecast.w2 = {forecast_time: it.forecasts[it.forecasts.length - 1].forecast_time, stamp: it.forecasts[it.forecasts.length - 1].stamp, stamp2: it.forecasts[it.forecasts.length - 1].stamp2}
            mergedForecast.h = 1
          }

          if (doNotLoadWinds === true) {
            it.selectedForecast = mergedForecast.hour
            it.loading = false
            resolve()
          } else {
            windService.loadWindAsync(mergedForecast.w1, true).then(w1 => {
              windService.loadWindAsync(mergedForecast.w2, false).then(w2 => {
                it.selectedForecast = mergedForecast.hour
                mergedForecast.data = it.mergeWinds(w1, w2, mergedForecast.h)
                it.velocityLayer.setData(mergedForecast.data)
                it.loading = false
                resolve()
              })
            })
          }
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
