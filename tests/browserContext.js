// Helper function for testing pages with puppeteer
import webpack from 'webpack'
import puppeteer from 'puppeteer'

import path from 'path'
import fs from 'fs'

function compileApp(appDir) {
  return new Promise((resolve, reject) => {
    webpack(
      {
        entry: path.join(__dirname, appDir, 'index.js'),
        output: {
          path: path.join(__dirname, appDir),
          filename: 'bundle.js',
        },
        mode: 'development',
      },
      (err, stats) => {
        if (err) {
          console.error(err.stack || err)
          if (err.details) {
            console.error(err.details)
          }
          reject(err)
        }

        const info = stats.toJson('minimal')

        if (stats.hasErrors()) {
          console.error(info.errors)
        }

        if (stats.hasWarnings()) {
          console.warn(info.warnings)
        }

        console.log(stats.toString('normal'))
        resolve()
      }
    )
  })
}

function cleanup(appDir) {
  return new Promise((resolve, reject) => {
    fs.unlink(path.join(__dirname, appDir, 'bundle.js'), err => {
      if (err) return reject(err)
      resolve()
    })
  })
}
const wrapPage = page => {
  return {
    async run(testFn) {
      console.log('Running\n', testFn.toString())
      await page.evaluate(testFunctionSrc => {
        // re-creating function in browser context
        window.__TEST_FUNCTION__ = new Function(' return (' + testFunctionSrc + ').apply(null, arguments)')
      }, testFn.toString())

      return await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          window.__TEST_FUNCTION__.call(null, resolve, reject)
        })
      })
    },
  }
}
export default appDir => {
  let browser = null
  const indexPage = `file://${path.resolve(path.join(__dirname, appDir, 'index.html'))}`

  return {
    start: () => async () => {
      await compileApp(appDir)
      browser = await puppeteer.launch({
        // ignoreHTTPSErrors: true,
        // devtools: true
      })
    },
    shutdown: () => async () => {
      await cleanup(appDir)
      await browser.close()
    },
    withPage: pageTestFn => async () => {
      const page = await browser.newPage()
      const log = [] // keep track of all console calls
      page.on('console', msg => {
        log.push({ type: msg.type(), text: msg.text() })
      })
      const consoleEntries = index => {
        if (index || index === 0) {
          return log[index]
        } else {
          return log
        }
      }
      await page.goto(indexPage)
      try {
        await pageTestFn(page, consoleEntries)
      } catch (e) {
        console.error('Unexpected failure evaluating script')
        console.error(e)
      }
    },
  }
}
