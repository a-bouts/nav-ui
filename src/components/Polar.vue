<template>
  <div>
    <label id="label" class="label" v-if="polar">{{ polar.label }}</label>
    <svg id="polar" :width="width" :height="height" v-on:click="setTwa" @mousedown="startDragTwa" @mouseup="stopDragTwa" @mousemove="dragTwa">
      <g id="degrees"></g>
      <g id="speed"></g>
      <g id="path"></g>
      <g id="vmg"></g>
      <g id="foil"></g>
      <g id="current"></g>
    </svg>
    <input id="windSpeed" class="slider has-output is-fullwidth" step="0.1" min="0" max="70" v-model="ws" type="range">
    <output for="windSpeed">{{ws}}</output>
  </div>
</template>

<script>
import * as d3 from 'd3';
import bulmaSlider from 'bulma-slider/dist/js/bulma-slider.min.js'
import polarService from '../lib/polar.js';
import dataService from '../lib/data.js';

export default {
  name: 'Polar',
  props: {
    margin: {
      type: Object,
      default: () => ({
        left: 0,
        right: 0,
        top: 10,
        bottom: 10,
      }),
    },
    race: String,
    current: Object,
  },
  data: function() {
    return {
      width: 0,
      height: 0,
      ws: 20,
      polar: undefined,
      radialLineGenerator: d3.radialLine(),
      twa: 70,
      bs: []
    }
  },
  created: function() {
    polarService.load(dataService.getRace(this.race).boat).then(polar => {
      this.polar = polar
      this.onResize()
    })
  },
  mounted: function() {
    window.addEventListener('resize', this.onResize)
    this.onResize()
    bulmaSlider.attach()
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize);
  },
  watch: {
    width: function widthChanged() {
      this.update()
    },
    ws: function () {
      this.update()
    },
    race: function() {
      polarService.load(dataService.getRace(this.race).boat).then(polar => {
        this.polar = polar
        this.onResize()
      })
    }
  },
  methods: {
    onResize() {
      this.width = this.$el.parentElement.parentElement.clientWidth - 10
      this.height = this.$el.parentElement.parentElement.clientHeight - 80
      this.update()
    },
    drawDegrees() {
      const degrees = d3.select("#polar").select("#degrees")
      const size = Math.min(this.height / 2 - 50, this.width - 80)

      degrees.selectAll("*").remove()

      for(var i = 0 ; i < 181 ; i += 10) {
        degrees.append("line")
          .attr("transform", "translate(25," + this.height / 2 + ") rotate(" + i + ")")
          .style("stroke", "grey")
          .style("stroke-width", 0.33)
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", 0)
          .attr("y2", -size - 5)
        degrees.append("text")
          .attr("transform", "translate(" + Math.round(25 + (size + 12) * Math.sin(Math.PI * i / 180) - 4) + "," + Math.round(this.height / 2 - (size + 12) * Math.cos(Math.PI * i / 180) + 4) + ")")
          .text(i + "°")
          .attr("font-size", "12px")
          .attr("fill", "grey")
      }
    },
    update() {
      if(!this.polar) {
        return
      }

      const it = this

      const size = Math.min(this.height / 2 - 50, this.width - 80)

      const polar = d3.select("#polar")

      this.drawDegrees()

      var previousSail = null

      var points = []
      var paths = []

      var max = 0

      var upwind = 0
      var upwindVmg = 0

      var downwind = 180
      var downwindVmg = 0

      for(var a = 0 ; a <= 180 ; a+=0.1) {
        const tws = it.interpolationIndex(it.polar.tws, it.ws)
        const twa = it.interpolationIndex(it.polar.twa, a)

        var maxBs = 0
        var maxS = null
        this.polar.sail.forEach((sail) => {

          if((sail.name == "LightJib" || sail.name == "LightGnk" || sail.name == "LIGHT_JIB" || sail.name == "LIGHT_GNK") && (this.current.sails & 1) != 1) {
            return
          }
          if((sail.name == "Staysail" || sail.name == "HeavyGnk" || sail.name == "STAYSAIL" || sail.name == "HEAVY_GNK") && (this.current.sails & 4) != 4) {
            return
          }
          if((sail.name == "Code0" || sail.name == "CODE_0") && (this.current.sails & 2) != 2) {
            return
          }

          const bs = (sail.speed[twa.i0][tws.i0]*tws.p0 + sail.speed[twa.i0][tws.i1]*(1-tws.p0))*twa.p0
            + (sail.speed[twa.i1][tws.i0]*tws.p0 + sail.speed[twa.i1][tws.i1]*(1-tws.p0))*(1-twa.p0)

          if(bs > maxBs) {
            maxBs = bs
            maxS = sail
          }
          if(bs > max) {
            max = bs
          }
        });

        var foil = this.foil(a)
        if(this.current.foil) {
          maxBs *= foil
        }
        if(this.current.hull) {
          maxBs *= this.polar.hull.speedRatio
        }

        const vmg = maxBs * Math.cos(a * Math.PI/180)

        if(vmg > upwindVmg) {
          upwind = a
          upwindVmg = vmg
        }
        if(vmg <= downwindVmg) {
          downwind = a
          downwindVmg = vmg
        }

        points.push([Math.PI * a / 180, maxBs])

        if(!previousSail) {
          previousSail = maxS
        } else if(maxS != previousSail || a == 180) {
          paths.push({sail: previousSail, points: points})
          points = []
          previousSail = maxS
        }

        if((a*10).toFixed(0)%10 == 0) {
          this.bs[Math.round(a)] = maxBs
        }
      }
      paths.push({sail: previousSail, points: points})

      var step = 5

      if(max < 6) {
        max = Math.round(max) + 1
        step = 1
      } else if(max < 12) {
        max = Math.round(max / 2) * 2 + 2
        step = 2
      } else if(max < 18) {
        max = Math.round(max / 3) * 3 + 3
        step = 3
      } else if(max < 20) {
        max = Math.round(max / 4) * 4 + 4
        step = 4
      } else {
        max = Math.round(max / 5) * 5 + 5
        step = 5
      }

      polar.select("#speed").selectAll("*").remove()

      for(var s = step ; s <= max ; s += step) {
        polar.select("#speed").append("path")
          .attr("transform", "translate(25," + this.height / 2 + ")")
          .attr("d", d3.arc()
            .innerRadius( s * size / max )
            .outerRadius( s * size / max )
            .startAngle( 0 )     // It's in radian, so Pi = 3.14 = bottom.
            .endAngle( Math.PI )       // 2*Pi = 6.28 = top
            )
          .attr('stroke', 'grey')
          .style("stroke-width", 0.5)

        polar.select("#speed").append("text")
          .attr("transform", "translate(0," + Math.round(this.height / 2 - (s * size / max) + 2) + ")")
          .text(s + "kt")
          .attr("font-size", "12px")
          .attr("fill", "grey")

        polar.select("#speed").append("text")
          .attr("transform", "translate(0," + Math.round(this.height / 2 + (s * size / max) + 3) + ")")
          .text(s + "kt")
          .attr("font-size", "12px")
          .attr("fill", "grey")

      }

      polar.select("#vmg").selectAll("*").remove()

      polar.select("#vmg").append("path")
        .attr("transform", "translate(25," + this.height / 2 + ")")
        .attr("d", d3.arc()
          .innerRadius( 0 )
          .outerRadius( size )
          .startAngle( 0 )     // It's in radian, so Pi = 3.14 = bottom.
          .endAngle( upwind * Math.PI / 180 )       // 2*Pi = 6.28 = top
          )
        .attr('stroke', 'red')
        .style("stroke-width", 0.5)
        .attr('fill', 'red')
        .style("opacity", 0.2)
      polar.select("#vmg").append("text")
        .attr("transform", "translate(" + Math.round(25 + (size + 25) * Math.sin(Math.PI * upwind / 180) - 4) + "," + Math.round(this.height / 2 - (size + 25) * Math.cos(Math.PI * upwind / 180) + 4) + ")")
        .text(upwind.toFixed(1) + "°")
        .attr("font-size", "12px")
        .attr("fill", "red")

      polar.select("#vmg").append("path")
        .attr("transform", "translate(25," + this.height / 2 + ")")
        .attr("d", d3.arc()
          .innerRadius( 0 )
          .outerRadius( size )
          .startAngle( downwind * Math.PI / 180 )     // It's in radian, so Pi = 3.14 = bottom.
          .endAngle( Math.PI )       // 2*Pi = 6.28 = top
          )
        .attr('stroke', 'red')
        .style("stroke-width", 0.5)
        .attr('fill', 'red')
        .style("opacity", 0.2)
      polar.select("#vmg").append("text")
        .attr("transform", "translate(" + Math.round(25 + (size + 25) * Math.sin(Math.PI * downwind / 180) - 4) + "," + Math.round(this.height / 2 - (size + 25) * Math.cos(Math.PI * downwind / 180) + 4) + ")")
        .text(downwind.toFixed(1) + "°")
        .attr("font-size", "12px")
        .attr("fill", "red")

      this.drawFoil()

      polar.select("#path").selectAll("*").remove()

      paths.forEach(path => {
        path.points.forEach(point => {
          point[1] = point[1] * size / max
        });

        it.drawSailPath(polar.select("#path"), path.points, path.sail)
      });

      this.drawCurrent()
    },
    drawFoil() {
      const size = Math.min(this.height / 2 - 50, this.width - 80)

      var opacity = 1
      const minRadius = size - 2
      const maxRadius = size + 2

      const polar = d3.select("#polar")

      if(this.ws <= this.polar.foil.twsMin - this.polar.foil.twsMerge || this.ws >= this.polar.foil.twsMax + this.polar.foil.twsMerge) {
        polar.select("#foil").selectAll("*").remove()
        return
      }

      const foil = this.foil(this.polar.foil.twaMin + 1)
      opacity = opacity * (foil - 1) / (this.polar.foil.speedRatio - 1)

      polar.select("#foil").selectAll("*").remove()

      const step = 0.3
      for(var i = 0 ; i < this.polar.foil.twaMerge ; i += step) {
        polar.select("#foil").append("path")
          .attr("transform", "translate(25," + this.height / 2 + ")")
          .attr("d", d3.arc()
            .innerRadius( minRadius )
            .outerRadius( maxRadius )
            .startAngle( (this.polar.foil.twaMin - i) * Math.PI / 180 )     // It's in radian, so Pi = 3.14 = bottom.
            .endAngle( (this.polar.foil.twaMin - i - step) * Math.PI / 180 )       // 2*Pi = 6.28 = top
            )
          .style("stroke-width", 0)
          .attr('fill', 'black')
          .style("opacity", opacity * ((10 - i) / 10))
        polar.select("#foil").append("path")
          .attr("transform", "translate(25," + this.height / 2 + ")")
          .attr("d", d3.arc()
            .innerRadius( minRadius )
            .outerRadius( maxRadius )
            .startAngle( (this.polar.foil.twaMax + i) * Math.PI / 180 )     // It's in radian, so Pi = 3.14 = bottom.
            .endAngle( (this.polar.foil.twaMax + i + step) * Math.PI / 180 )       // 2*Pi = 6.28 = top
            )
          .style("stroke-width", 0)
          .attr('fill', 'black')
          .style("opacity", opacity * ((10 - i) / 10))
      }
      polar.select("#foil").append("path")
        .attr("transform", "translate(25," + this.height / 2 + ")")
        .attr("d", d3.arc()
          .innerRadius( minRadius )
          .outerRadius( maxRadius )
          .startAngle( (this.polar.foil.twaMin) * Math.PI / 180 )     // It's in radian, so Pi = 3.14 = bottom.
          .endAngle( (this.polar.foil.twaMax) * Math.PI / 180 )       // 2*Pi = 6.28 = top
          )
        .style("stroke-width", 0)
        .attr('fill', 'black')
        .style("opacity", opacity)
    },
    drawSailPath(polar, points, sail) {
      if(!sail) return

      const colors = {
        "Jib"      : "#cd0342",
        "Spi"      : "#00ff00",
        "Staysail"    : "#0000ff",
        "LightJib"    : "#f67876",
        "Code0"    : "#00a000",
        "HeavyGnk"    : "#b00000",
        "LightGnk"    : "#d77900",
        "JIB"      : "#cd0342",
        "SPI"      : "#00ff00",
        "STAYSAIL"    : "#0000ff",
        "LIGHT_JIB"    : "#f67876",
        "CODE_0"    : "#00a000",
        "HEAVY_GNK"    : "#b00000",
        "LIGHT_GNK"    : "#d77900"
      }

      polar.append("path")
        .attr("transform", "translate(25," + this.height / 2 + ")")
        .attr('d', this.radialLineGenerator(points))
        .style("stroke", colors[sail.name])
        .style("stroke-width", 2)
        .style("fill", "none")
    },
    drawCurrent() {
      const current = d3.select("#polar").select("#current")
      const size = Math.min(this.height / 2 - 50, this.width - 80)

      current.selectAll("*").remove()

      current.append("line")
        .attr("transform", "translate(25," + this.height / 2 + ") rotate(" + this.twa + ")")
        .style("stroke", "blue")
        .style("stroke-width", 2)
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 0)
        .attr("y2", -size - 5)
      current.append("text")
        .attr("transform", "translate(" + Math.round(25 + (size + 40) * Math.sin(Math.PI * this.twa / 180) - 4) + "," + Math.round(this.height / 2 - (size + 40) * Math.cos(Math.PI * this.twa / 180) + 4) + ")")
        .text(this.twa + "° " + this.bs[this.twa].toFixed(2) + "kt")
        .attr("font-size", "12px")
        .attr("fill", "blue")
    },
    interpolationIndex: function(values, value) {
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
    },
    selectPoint(point) {
      this.ws = point.windSpeed.toFixed(1)
      this.twa = Math.abs(Math.round(point.twa))
    },
    setTwa() {
      // const dx = e.layerX - 25
      // const dy = e.layerY - this.height / 2
      //
      // this.twa = 180 - Math.round(Math.acos(dy / Math.sqrt(dx * dx + dy * dy)) * 180 / Math.PI)
      // this.update()
    },
    startDragTwa(e) {
      const dx = e.layerX - 25
      const dy = e.layerY - this.height / 2

      const drag = (180 - Math.round(Math.acos(dy / Math.sqrt(dx * dx + dy * dy)) * 180 / Math.PI))
      this.twa = drag
      this.dragStart = drag
      this.drawCurrent()
    },
    dragTwa(e) {
      if(this.dragStart == null) return

      const dx = e.layerX - 25
      const dy = e.layerY - this.height / 2

      const drag = (180 - Math.round(Math.acos(dy / Math.sqrt(dx * dx + dy * dy)) * 180 / Math.PI))
      this.twa = this.twa - (this.dragStart - drag)
      this.dragStart = drag
      this.drawCurrent()
    },
    stopDragTwa(e) {
      e.stopPropagation()
      this.dragStart = null
    },
    foil(twa) {
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
      if (this.ws <= this.polar.foil.twsMin-this.polar.foil.twsMerge) {
        return 1.0
      } else if (this.ws < this.polar.foil.twsMin) {
        cv = (this.ws - (this.polar.foil.twsMin - this.polar.foil.twsMerge)) / this.polar.foil.twsMerge
      } else if (this.ws < this.polar.foil.twsMax) {
        cv = 1
      } else if (this.ws < this.polar.foil.twsMax+this.polar.foil.twsMerge) {
        cv = (this.polar.foil.twsMax + this.polar.foil.twsMerge - this.ws) / this.polar.foil.twsMerge
      } else {
        return 1.0
      }
      return 1.0 + (this.polar.foil.speedRatio-1)*ct*cv
    }
  }
}
</script>

<style scoped>

#label {
  margin-bottom: -25px;
  text-align: right;
  padding-right: 10px;
}

input[type="range"].slider:not([orient="vertical"]).has-output + output {
  padding-left: 3px;
  padding-right: 3px;
}
</style>
