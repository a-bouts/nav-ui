import { compress as lzStringCompress, decompress as lzStringDecompress } from 'lz-string'

class Data {
  constructor() {
    this.SETTINGS = "_settings_"
    this.EXPES = "_expes_"
    this.BOATS = "_boats_"

    this.EMPTY = ""
    this.LAST_ISOCHRONES = "_last_isochrones_"
    this.LAST = "_last_"
    this.PREVIOUS = "_previous_"

    this.BUOYS = "_buoys_"
    this.VALIDATED = "_validated_"

    this.PAN = "_pan_"
    this.ZOOM = "_zoom_"

    this.models = [
      {model: this.SETTINGS, context: {boat: false, race: false}},
      {model: this.EXPES, context: {boat: false, race: false}},
      {model: this.BOATS, context: {boat: false, race: false}},
      {model: this.LAST_ISOCHRONES, context: {boat: true, race: true}},
      {model: this.LAST, context: {boat: true, race: true}},
      {model: this.PREVIOUS, context: {boat: true, race: true}},
      {model: this.BUOYS, context: {boat: false, race: true}},
      {model: this.VALIDATED, context: {boat: true, race: true}},
      {model: this.PAN, context: {boat: true, race: true}},
      {model: this.ZOOM, context: {boat: true, race: true}},
      {model: this.EMPTY, context: {boat: true, race: true}},
    ]
  }

  static get instance() {
    return (Data._instance == null) ? Data._instance = new Data() : Data._instance;
  }

  suffix(boat, race) {
    return ((boat && boat != "-") ? boat + "_" : "") + race
  }

  getInfoFromKey(key) {
    let res = {
      model: null,
      boat: null,
      race: null,
      context: false
    }
    for(var m in this.models) {
      if (key.startsWith(this.models[m].model)) {
        res.model = this.models[m].model
        res.context = this.models[m].context
        var infos = key.substr(res.model.length).split("_")

        if (infos.length > 0) {
          res.race = infos[infos.length - 1]

          for (var i = 0 ; i < infos.length - 1 ; i++) {
            if (i > 0)
              res.boat += "_"
            else
              res.boat = ""
            res.boat += infos[i]
          }
        }
        return res
      }
    }

    return res
  }

  clean(races) {
    let boats = this.getBoats()

    for(var i = 0 ; i < localStorage.length ; i++) {
      let key = localStorage.key(i)
      let infos = this.getInfoFromKey(key)
      if (infos.model === null) {
        console.log("should delete (unknown model)", key)
        localStorage.removeItem(key)
        continue
      }
      if (infos.context === false) {
        continue
      }

      if(infos.context.race) {
        if (!races || !races[infos.race] || races[infos.race].archived === true) {
          console.log("should delete (old race)", infos.race, key)
          localStorage.removeItem(key)
          continue
        }
      }
      if(infos.context.boat) {
        if (!boats && infos.boat || boats && boats.length > 0 && !infos.boat) {
          console.log("should delete (unknown boat)", infos.boat, key)
          localStorage.removeItem(key)
          continue
        }
        var found = false
        for(var b in boats) {
          if (boats[b].name == infos.boat) {
            found = true
          }
        }
        if (!found) {
          console.log("should delete (unknown boat)", infos.boat, key)
          localStorage.removeItem(key)
          continue
        }
      }
    }
  }

  // ***************
  // ** SETTINGS
  // ***************

  getSettings() {
    return JSON.parse(localStorage.getItem(this.SETTINGS))
  }

  saveSettings(settings) {
    localStorage.setItem(this.SETTINGS, JSON.stringify(settings))
  }

  // ***************
  // ** EXPES
  // ***************

  getExpes() {
    return JSON.parse(localStorage.getItem(this.EXPES))
  }

  saveExpes(expes) {
    localStorage.setItem(this.EXPES, JSON.stringify(expes))
  }

  // ***************
  // ** BOATS
  // ***************

  getBoats() {
    return JSON.parse(localStorage.getItem(this.BOATS))
  }

  saveBoats(boats) {
    localStorage.setItem(this.BOATS, JSON.stringify(boats))
  }

  // ***************
  // ** BUOYS
  // ***************

  getBuoys(race) {
    return JSON.parse(localStorage.getItem(this.BUOYS + race))
  }

  saveBuoys(race, buoys) {
    localStorage.setItem(this.BUOYS + race, JSON.stringify(buoys))
  }

  cleanBuoys(race) {
    localStorage.removeItem(this.BUOYS + race)
  }

  // ***************
  // ** OPTIONS
  // ***************

  getOptions(boat, race) {
    return JSON.parse(localStorage.getItem(this.EMPTY + this.suffix(boat, race)))
  }

  saveOptions(boat, race, options) {
    localStorage.setItem(this.EMPTY + this.suffix(boat, race), JSON.stringify(options))
  }

  // ***************
  // ** PAN
  // ***************

  getPan(boat, race) {
    return JSON.parse(localStorage.getItem(this.PAN + this.suffix(boat, race)))
  }

  savePan(boat, race, pan) {
    localStorage.setItem(this.PAN + this.suffix(boat, race), JSON.stringify(pan))
  }

  // ***************
  // ** ZOOM
  // ***************

  getZoom(boat, race) {
    return localStorage.getItem(this.ZOOM + this.suffix(boat, race))
  }

  saveZoom(boat, race, zoom) {
    localStorage.setItem(this.ZOOM + this.suffix(boat, race), zoom)
  }

  // ***************
  // ** VALIDATED
  // ***************

  getValidated(boat, race) {
    return JSON.parse(localStorage.getItem(this.VALIDATED + this.suffix(boat, race)))
  }

  saveValidated(boat, race, validated) {
    localStorage.setItem(this.VALIDATED + this.suffix(boat, race), JSON.stringify(validated))
  }

  // ***************
  // ** ROUTE
  // ***************

  getLast(boat, race) {
    let last = JSON.parse(localStorage.getItem(this.LAST + this.suffix(boat, race)))
    if (last) {
      last.date = new Date(last.date)
    }
    return last
  }

  getPrevious(boat, race) {
    var previous = null
    let prev = localStorage.getItem(this.PREVIOUS + this.suffix(boat, race))
    try {
      previous = JSON.parse(prev)
    } catch (e) {
      console.log("TODO : remove this after few days")
      previous = JSON.parse(lzStringDecompress(prev))
    }

    if (previous) {
      previous.forEach(p => {
        p.date = new Date(p.date)
      })
    }
    return previous
  }

  getIsochrones(boat, race) {
    var isochrones = null
    try {
      isochrones = JSON.parse(lzStringDecompress(localStorage.getItem(this.LAST_ISOCHRONES + this.suffix(boat, race))))
    } catch (e)  {
      console.log("error loading isochrones")
    }
    return isochrones
  }

  saveLast(boat, race, last) {
    var previous = this.getLast(boat, race)

    if(previous) {
      try {
        localStorage.setItem(this.PREVIOUS + this.suffix(boat, race), lzStringCompress(JSON.stringify([previous])))
      } catch (e)  {
        console.log("Error saving previous route")
      }
    }

    localStorage.setItem(this.LAST + this.suffix(boat, race), JSON.stringify(last))

    return previous
  }

  saveIsochrones(boat, race, isochrones) {
    try {
      localStorage.setItem(this.LAST_ISOCHRONES + this.suffix(boat, race), lzStringCompress(JSON.stringify(isochrones)))
    } catch (e)  {
      console.log("Error saving isochrones")
    }
  }
}

export default Data.instance
