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

// 2. TextEncoder/TextDecoder polyfill (required by @stellar/stellar-sdk for
//    hashing the network passphrase during transaction signing on Hermes/iOS)
require("text-encoding-polyfill");

// 3. Buffer polyfill (always override — Hermes may expose a broken partial Buffer)
var Buffer = require("buffer").Buffer;
global.Buffer = Buffer;

// 4. Base64 polyfills — the XDR library uses atob/btoa for envelope serialisation.
//    CRITICAL: Always override these because React Native's native atob/btoa
//    fail on raw binary strings (they only support ASCII/UTF-8), corrupting the transaction XDR.
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
global.btoa = function (input) {
  let str = String(input);
  let output = '';
  for (let block = 0, charCode, i = 0, map = chars;
       str.charAt(i | 0) || (map = '=', i % 1);
       output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = str.charCodeAt(i += 3 / 4);
    if (charCode > 0xFF) {
      throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
    }
    block = block << 8 | charCode;
  }
  return output;
};
global.atob = function (input) {
  let str = String(input).replace(/[=]+$/, '');
  let output = '';
  if (str.length % 4 == 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  for (let bc = 0, bs = 0, r_buffer, i = 0;
       r_buffer = str.charAt(i++);
       ~r_buffer && (bs = bc % 4 ? bs * 64 + r_buffer : r_buffer,
         bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    r_buffer = chars.indexOf(r_buffer);
  }
  return output;
};

// 5. AbortSignal.timeout polyfill (required by newer HTTP clients in Hermes/iOS)
if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "undefined") {
  AbortSignal.timeout = function (ms) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

// 6. DOM API polyfills required by the `eventsource` package (used by @stellar/stellar-sdk)
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

// 7. Boot Expo Router (this triggers route scanning and module evaluation)
require("expo-router/entry");
