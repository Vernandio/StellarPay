// ──────────────────────────────────────────────────
// StellarPay Entry Point
// ──────────────────────────────────────────────────
// CRITICAL: This file uses require() exclusively — NOT import.
// Babel hoists import statements above all other code, which would
// cause expo-router to load every route file BEFORE our polyfills
// have a chance to execute. require() is NOT hoisted, so the
// execution order below is guaranteed.
// ──────────────────────────────────────────────────

// 1. Crypto polyfill (must be first)
require("react-native-get-random-values");

// 2. Buffer polyfill
var Buffer = require("buffer").Buffer;
if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

// 3. DOM API polyfills required by the `eventsource` package (used by @stellar/stellar-sdk)
//    React Native's Hermes engine does not provide EventTarget, Event, or MessageEvent.
if (typeof global.EventTarget === "undefined") {
  function EventTarget() {
    this._listeners = {};
  }
  EventTarget.prototype.addEventListener = function (type, cb) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(cb);
  };
  EventTarget.prototype.removeEventListener = function (type, cb) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(function (fn) {
      return fn !== cb;
    });
  };
  EventTarget.prototype.dispatchEvent = function (event) {
    var list = this._listeners[event.type];
    if (list) list.forEach(function (cb) { cb(event); });
    return true;
  };
  global.EventTarget = EventTarget;
}

if (typeof global.Event === "undefined") {
  function Event(type) {
    this.type = type;
    this.defaultPrevented = false;
    this.cancelable = false;
    this.timeStamp = Date.now();
  }
  Event.prototype.preventDefault = function () {
    this.defaultPrevented = true;
  };
  global.Event = Event;
}

if (typeof global.MessageEvent === "undefined") {
  function MessageEvent(type, init) {
    this.type = type;
    this.data = init && init.data !== undefined ? init.data : null;
    this.origin = init && init.origin ? init.origin : "";
    this.lastEventId = init && init.lastEventId ? init.lastEventId : "";
  }
  global.MessageEvent = MessageEvent;
}

// 4. Boot Expo Router (this triggers route scanning and module evaluation)
require("expo-router/entry");
