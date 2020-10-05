<template>
  <div>
    <svg id="polar" :width="width" :height="height">
      <g>
      </g>
    </svg>
    <input id="windSpeed" class="slider has-output is-fullwidth" step="0.1" min="0" max="70" v-model="ws" type="range">
    <output for="windSpeed">{{ws}}</output>
  </div>
</template>

<script>
import * as d3 from 'd3';
import bulmaSlider from 'bulma-slider/dist/js/bulma-slider.min.js'

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
  },
  data: function() {
    return {
      width: 0,
      height: 0,
      ws: 20,
      polar: {},
      radialLineGenerator: d3.radialLine()
    }
  },
  mounted: function() {
    window.addEventListener('resize', this.onResize);
    this.onResize()
    bulmaSlider.attach();
  },
  created: function() {
    this.$http.get('polars/arctic.json').then(response => {
      this.polar = response.body
      this.onResize()
    }, () => {
      console.log("Error loading polars")
    })
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
    }
  },
  methods: {
    onResize() {
      this.width = this.$el.parentElement.parentElement.clientWidth - 10
      this.height = this.$el.parentElement.parentElement.clientHeight - 80
      this.update()
    },
    update() {

      const it = this

      console.log("update")

      const size = Math.min(this.height / 2 - 50, this.width - 50)

      const polar = d3.select("#polar")

      polar.selectAll("*").remove()

      for(var i = 0 ; i < 181 ; i += 10) {
        polar.append("line")
          .attr("transform", "translate(25," + this.height / 2 + ") rotate(" + i + ")")
          .style("stroke", "grey")
          .style("stroke-width", 0.33)
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", 0)
          .attr("y2", -size - 5)
        polar.append("text")
          .attr("transform", "translate(" + Math.round(25 + (size + 12) * Math.sin(Math.PI * i / 180) - 4) + "," + Math.round(this.height / 2 - (size + 12) * Math.cos(Math.PI * i / 180) + 4) + ")")
          .text(i + "°")
          .attr("font-size", "12px")
          .attr("fill", "grey")

      }

      var previousSail = -1

      var points = []
      var paths = []

      var max = 0

      var upwind = 0
      var upwindVmg = 0

      var downwind = 180
      var downwindVmg = 0

      for(var a = 0.0 ; a <= 180 ; a+=0.1) {
        const tws = it.interpolationIndex(it.polar.tws, it.ws)
        const twa = it.interpolationIndex(it.polar.twa, a)

        var maxBs = 0
        var maxS = 0
        this.polar.sail.forEach((sail, s) => {
          const bs = (sail.speed[twa.i0][tws.i0]*tws.p0 + sail.speed[twa.i0][tws.i1]*(1-tws.p0))*twa.p0
            + (sail.speed[twa.i1][tws.i0]*tws.p0 + sail.speed[twa.i1][tws.i1]*(1-tws.p0))*(1-twa.p0)

          if(bs > maxBs) {
            maxBs = bs
            maxS = s
          }
          if(bs > max) {
            max = bs
          }
        });

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

        if(previousSail == -1) {
          previousSail = maxS
        } else if(maxS != previousSail || a == 180) {
          paths.push({sail: previousSail, points: points})
          points = []
          previousSail = maxS
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

      for(var s = step ; s <= max ; s += step) {
        polar.append("path")
          .attr("transform", "translate(25," + this.height / 2 + ")")
          .attr("d", d3.arc()
            .innerRadius( s * size / max )
            .outerRadius( s * size / max )
            .startAngle( 0 )     // It's in radian, so Pi = 3.14 = bottom.
            .endAngle( Math.PI )       // 2*Pi = 6.28 = top
            )
          .attr('stroke', 'grey')
          .style("stroke-width", 0.5)

        polar.append("text")
          .attr("transform", "translate(0," + Math.round(this.height / 2 - (s * size / max) + 2) + ")")
          .text(s + "kt")
          .attr("font-size", "12px")
          .attr("fill", "grey")

        polar.append("text")
          .attr("transform", "translate(0," + Math.round(this.height / 2 + (s * size / max) + 3) + ")")
          .text(s + "kt")
          .attr("font-size", "12px")
          .attr("fill", "grey")

      }

      polar.append("path")
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
      polar.append("text")
        .attr("transform", "translate(" + Math.round(25 + (size + 25) * Math.sin(Math.PI * upwind / 180) - 4) + "," + Math.round(this.height / 2 - (size + 25) * Math.cos(Math.PI * upwind / 180) + 4) + ")")
        .text(upwind.toFixed(1) + "°")
        .attr("font-size", "12px")
        .attr("fill", "red")

      polar.append("path")
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
      polar.append("text")
        .attr("transform", "translate(" + Math.round(25 + (size + 25) * Math.sin(Math.PI * downwind / 180) - 4) + "," + Math.round(this.height / 2 - (size + 25) * Math.cos(Math.PI * downwind / 180) + 4) + ")")
        .text(downwind.toFixed(1) + "°")
        .attr("font-size", "12px")
        .attr("fill", "red")


      paths.forEach(path => {
        path.points.forEach(point => {
          point[1] = point[1] * size / max
        });

        it.drawSailPath(polar, path.points, path.sail)
      });


    },
    drawSailPath(polar, points, sail) {
      const colors = ["red", "pink", "blue", "green", "yellow", "orange", "black"]
      console.log(sail)
      polar.append("path")
        .attr("transform", "translate(25," + this.height / 2 + ")")
        .attr('d', this.radialLineGenerator(points))
        .style("stroke", colors[sail])
        .style("stroke-width", 2)
        .style("fill", "none")
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
    }
  }
}
</script>

<style scoped>
input[type="range"].slider:not([orient="vertical"]).has-output + output {
  padding-left: 3px;
  padding-right: 3px;
}
</style>
