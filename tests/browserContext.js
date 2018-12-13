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

  const noopInit = (page) => (page)
  const noopEval = () => new Promise(resolve => resolve(true))
  const noopCheck = () => {}

  const createTestFn = ({ init = noopInit, evaluate = noopEval, check = noopCheck }) => {

    const fn = async () => {
      const page = await browser.newPage()
      const log = [] // keep track of all console calls
      page.on('console', msg => log.push({ type: msg.type(), text: msg.text() }))
      await page.goto(indexPage)
      init(page)
      const evalResult = await page.evaluate(evaluate)
      check(evalResult, log)
    }
    fn.evaluate = (newEvaluate) => createTestFn({ init: init, evaluate: newEvaluate, check: check })
    fn.check = (newCheck) => createTestFn({ init: init, evaluate: evaluate, check: newCheck })
    return fn
  }
  return {
    start: () => async () => {
      await compileApp(appDir)
      browser = await puppeteer.launch({
        ignoreHTTPSErrors: true,
      })
    },
    shutdown: () => async () => {
      await cleanup(appDir)
      await browser.close()
    },
    init: pageSetupFn => createTestFn({ init: pageSetupFn }),
    evaluate: browserFn => createTestFn({ evaluate: browserFn }),
    check: testFn => createTestFn({ check: testFn })
  }
}
