'use strict'

/**
 * This file is extracted from the 'shimmer' project copyright by Forrest L
 * Norvell. It have been modified slightly to be used in the current context.
 *
 * https://github.com/othiym23/shimmer
 *
 * Original file:
 *
 * https://github.com/othiym23/shimmer/blob/master/index.js
 *
 * License:
 *
 * BSD-2-Clause, http://opensource.org/licenses/BSD-2-Clause
 */

var symbols = require('../symbols')

var isWrappedSym = Symbol('elasticAPMIsWrapped')

exports.wrap = wrap
exports.massWrap = massWrap
exports.unwrap = unwrap
exports.isWrapped = isWrapped

// Do not load agent until used to avoid circular dependency issues.
var _agent
function logger () {
  if (!_agent) _agent = require('../../')
  return _agent.logger
}

function isFunction (funktion) {
  return funktion && {}.toString.call(funktion) === '[object Function]'
}

function wrap (nodule, name, wrapper) {
  if (!nodule || !nodule[name]) {
    logger().debug('no original function %s to wrap', name)
    return
  }

  if (!wrapper) {
    logger.debug('no wrapper function')
    logger().debug((new Error()).stack)
    return
  }

  if (!isFunction(nodule[name]) || !isFunction(wrapper)) {
    logger().debug('original object and wrapper must be functions')
    return
  }

  if (nodule[name][isWrappedSym]) {
    logger().debug('function %s already wrapped', name)
    return
  }

  var desc = Object.getOwnPropertyDescriptor(nodule, name)
  if (desc && !desc.writable) {
    logger().debug('function %s is not writable', name)
    return
  }

  var original = nodule[name]
  var wrapped = wrapper(original, name)

  wrapped[isWrappedSym] = true
  wrapped[symbols.unwrap] = function elasticAPMUnwrap () {
    if (nodule[name] === wrapped) {
      nodule[name] = original
      wrapped[isWrappedSym] = false
    }
  }

  nodule[name] = wrapped

  return wrapped
}

function massWrap (nodules, names, wrapper) {
  if (!nodules) {
    logger().debug('must provide one or more modules to patch')
    logger().debug((new Error()).stack)
    return
  } else if (!Array.isArray(nodules)) {
    nodules = [nodules]
  }

  if (!(names && Array.isArray(names))) {
    logger().debug('must provide one or more functions to wrap on modules')
    return
  }

  nodules.forEach(function (nodule) {
    names.forEach(function (name) {
      wrap(nodule, name, wrapper)
    })
  })
}

function unwrap (nodule, name) {
  if (!nodule || !nodule[name]) {
    logger().debug('no function to unwrap.')
    logger().debug((new Error()).stack)
    return
  }

  if (!nodule[name][symbols.unwrap]) {
    logger().debug('no original to unwrap to -- has %s already been unwrapped?', name)
  } else {
    return nodule[name][symbols.unwrap]()
  }
}

function isWrapped (wrapped) {
  return wrapped && wrapped[isWrappedSym]
}
