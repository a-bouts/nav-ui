class Utils {
  constructor() {
  }

  static get instance() {
      return (Utils._instance == null) ? Utils._instance = new Utils() : Utils._instance;
  }

  dms2dd(p, d, m, s, wrap) {
    var res = Number(p) * (Number(d) + Number(m)/60 + Number(s)/3600)
    if (wrap === true) {
      res += 360
    }
    return res
  }

  dd2dms(D) {
    const res = {}
    if (D > 180) {
      res.wrap = true
      D -= 360
    } else {
      res.wrap = false
    }

    res.p = D<0?-1:1
    res.d = 0|(D<0?D=-D:D)
    res.m = 0|D%1*60
    res.s = Math.round((0|D*60%1*6000)/100)

    return res
  }

  lat2string(dms) {
    return String(dms.d).padStart(2, "0") + "°" + (dms.p > 0 ? "N" : "S") + " " + String(dms.m).padStart(2, "0") + "'" + String(dms.s).padStart(2, "0") + "\""
  }

  lon2string(dms) {
    return String(dms.d).padStart(3, "0") + "°" + (dms.p > 0 ? "E" : "W") + " " + String(dms.m).padStart(2, "0") + "'" + String(dms.s).padStart(2, "0") + "\""
  }

}

export default Utils.instance
