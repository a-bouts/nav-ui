module.exports = {
  devServer: {
    proxy: {
      '^/route': {
        target: 'http://localhost:8888'
        // target: 'https://route.phtheirichthys.fr'
      },
      '^/debug': {
        // target: 'http://localhost:8888'
        target: 'https://route.phtheirichthys.fr'
      },
      '^/private': {
        target: 'http://localhost:8888'
        // target: 'https://route.phtheirichthys.fr'
      },
      '^/winds': {
        // target: 'http://localhost:8090'
        target: 'https://route.phtheirichthys.fr'
      },
      '^/polars': {
        // target: 'http://localhost:7777'
        target: 'https://route.phtheirichthys.fr'
      }
    }
    // proxy: 'https://route.phtheirichthys.fr'
  }
}
