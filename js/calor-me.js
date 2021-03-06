/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// The (global) calorie counter object
var counter;

// We define three levels
//
//  good - Consumed calories less than spent calories
//  ok   - Consumed calories roughly equal to spent calories
//  bad  - Consumed calories greater than spent calories
//
// The cutoffs for these levels are defined below in terms of the ratio of
// consumed calories to spent calories:
var OK_CUTOFF  = 0.95;
var BAD_CUTOFF = 1.2;

function init() {
  counter = new CalorieCounter();

  // Update once it is ready
  counter.oninit = function() {
    document.querySelector("input[name=weight]").value = counter.weight;
    document.querySelector("input[name=height]").value = counter.height;
    document.querySelector("input[name=dob]").value    = counter.dob;
    if (counter.gender) {
      var genderRadios =
        document.querySelectorAll("input[type=radio][name=gender]");
      for (var i = 0; i < genderRadios.length; i++) {
        var radio = genderRadios[i];
        var value = radio.value.trim().toLowerCase();
        radio.checked = !!(value === counter.gender);
      }
      setDiagramGender(counter.gender);
    }
    updateSummary();
    updateLog();
  };

  // Add event handlers to the buttons.
  //
  // Although it is possible to attach the event handlers in the HTML using
  // attributes such as "onclick" this makes the HTML harder to read.
  //
  // Instead we are using an approach called "unobtrusive javascript" to add the
  // event handlers later.
  initTabs();
  initSummary();
  initLog();
  initSettings();
  initPreFillData();
}
window.addEventListener("load", init, false);

function initTabs() {
  // Tab navigation
  var tablinks = document.querySelectorAll("a[aria-role=tab]");
  for (var i = 0; i < tablinks.length; i++) {
    tablinks[i].addEventListener("click",
      function(e) {
        // Update tabs
        var tabs = document.querySelectorAll("a[aria-role=tab]");
        for (var j = 0; j < tabs.length; j++) {
          var tab = tabs[j];
          tab.setAttribute("aria-selected",
                           tab === e.target ? "true" : "false");
        }

        // Update panels
        var selectedId = e.target.getAttribute("aria-controls");
        var panels = document.querySelectorAll("section[aria-role=tabpanel]");
        for (var j = 0; j < panels.length; j++) {
          var panel = panels[j];
          panel.setAttribute("aria-hidden",
                             panel.id === selectedId ? "false" : "true");
        }

        // Don't follow the link
        e.preventDefault();

        // Play tab switch sound if available
        // TASK(e-1): Read the value from localStorage to see if mute is set or
        // not. If it is, don't play the sound below.
        var sfx = document.getElementById('tabSwitchSound');
        if (sfx && sfx.currentSrc)
          sfx.play();
      },
      false
    );
  }
}

/* --------------------------------------
 *
 * SUMMARY
 *
 * --------------------------------------*/

function initSummary() {
  updateSummary();

  document.getElementById("showFoodForm").addEventListener("click",
    function(e) {
      launchDialogById('add-food');
      e.preventDefault();
    }, false);
  document.getElementById("showActivityForm").addEventListener("click",
    function(e) {
      launchDialogById('add-activity');
      e.preventDefault();
    }, false);

  // Set up handler for the "Cancel" button on the little forms that pop up
  //
  // This is complicated because we are doing it in a generic fashion where we
  // first search for the buttons and then try to determine the "dialog" they
  // belong too.
  //
  // First, search for the buttons using the Selectors API
  var cancelButtons =
    document.querySelectorAll("section[aria-role=dialog] button.cancel");
  for (var i = 0; i < cancelButtons.length; i++) {
    cancelButtons[i].addEventListener("click",
      function(e) {
        // We have the button, now we search upwards to find the first <section>
        // element with the attribute aria-role="dialog"
        var dialog = e.target;
        while(dialog &&
              (dialog.tagName !== "SECTION" ||
               dialog.getAttribute("aria-role").toLowerCase() !== "dialog")) {
          dialog = dialog.parentNode;
        }
        // If we found the dialog, hide it
        if (dialog) {
          hideDialog(dialog);
          e.preventDefault();
        }
      }, false);
  }

  // Handle changes to weight
  document.querySelector("input[name=weight]").addEventListener("change",
    onChangeWeight, false);

  // Handle submitting the different forms
  document.querySelector('#add-food form').addEventListener("submit",
      function(e) {
        addFood();
        e.preventDefault();
      }, false
    );
  document.querySelector('#add-activity form').addEventListener("submit",
      function(e) {
        addActivity();
        e.preventDefault();
      }, false
    );
}

function launchDialogById(id) {
  var dialog = document.getElementById(id);
  console.assert(dialog, "Dialog not found");
  resetDialog(dialog);
  showDialog(dialog);
}

function showDialog(dialog) {
  showOrHideDialog(dialog, "show");
}

function hideDialog(dialog) {
  showOrHideDialog(dialog, "hide");
}

function showOrHideDialog(dialog, action) {
  var overlay = document.querySelector(".overlay-container");
  overlay.style.display = action == "show" ? "block" : "none";
  dialog.setAttribute("aria-hidden", action == "show" ? "false" : "true");
}

function resetDialog(dialog) {
  var forms = dialog.getElementsByTagName("form");
  for (var i = 0; i < forms.length; i++ ) {
    forms[i].reset();
  }
}

function onChangeWeight(event) {
  var weight = parseFloat(event.target.value);
  if (!weight)
    return;
  counter.weight = weight;
  updateSummary();
}

function addFood() {
  var foodForm = document.forms.food;
  var food = foodForm.food.value;
  var quantity = parseFloat(foodForm.quantity.value) || null;
  var calories = parseFloat(foodForm['calorie-count'].value);
  counter.addFood(food, quantity, calories, "kcal",
    function(item) {
      // XXX This should just add the item to the table
      // Currently we're regenerating the entire table every time just for
      // demonstration purposes.
      updateLog();
    });
  hideDialog(document.getElementById('add-food'));
  updateSummary();
  // TASK(e-2): Read the value from localStorage to see if mute is set or
  // not. If it is, don't play the sound below.
  var rise = document.getElementById('riseSound');
  if (rise.currentSrc)
    rise.play();
}

function addActivity() {
  // TODO
  counter.addActivity(2000, "kcal");
  hideDialog(document.getElementById('add-activity'));
  updateSummary();
  // TASK(e-3): Read the value from localStorage to see if mute is set or
  // not. If it is, don't play the sound below.
  //
  // NOTE: Using localStorage can be slow. Since the state of the checkbox
  // should match what is stored in localStorage, perhaps you could just check
  // if the checkbox is ticked or not?
  var fall = document.getElementById('fallSound');
  if (fall.currentSrc)
    fall.play();
}

function updateSummary() {
  // Update figure
  var figure = document.getElementById("figure");
  var level = counter.kjIn / counter.kjOut;
  figure.contentDocument.setLevel(level, getClassLevel(level));
  // Update text summary
  var text = document.getElementById("text-summary");
  text.querySelector('.net-summary').textContent =
    (counter.kcalIn - counter.kcalOut).toFixed(0) + "cal";
  text.querySelector('.consumed-summary').textContent =
    counter.kcalIn.toFixed(0) + "cal consumed";
  text.querySelector('.spent-summary').textContent =
    counter.kcalOut.toFixed(0) + "cal spent";
}

function getClassLevel(level) {
  return level < OK_CUTOFF
    ? "good"
    : level < BAD_CUTOFF
    ? "ok" : "bad";
}

function setDiagramGender(gender) {
  document.getElementById("figure").contentDocument.setGender(gender);
}

/* --------------------------------------
 *
 * LOG
 *
 * --------------------------------------*/

function initLog() {
  // Register one event listener on the log container and use it to detect
  // clicks on the summary elements (which are dynamically added).
  // This works so long as we turn off pointer-events on all child content
  // which is certainly not very presentational.
  document.getElementById("log").addEventListener("click",
      function (evt) {
        if (evt.target.tagName === "DETAILS") {
          var details = evt.target;
          if (details.hasAttribute("open")) {
            details.removeAttribute("open");
          } else {
            details.setAttribute("open", "open");
          }
        }
      }, false
    );
}

function updateLog() {
  var logSection = document.getElementById("log");
  // Clear log
  var logs = document.querySelectorAll("#log > details");
  for (var i = 0; i < logs.length; i++) {
    logs[i].parentNode.removeChild(logs[i]);
  }
  // Get log
  counter.getLast7DaysLog(function(log) {
    log = log.reverse();
    for (var i = 0; i < log.length; i++) {
      var entry = log[i];
      if (entry.activities.length === 0)
        continue;

      var details = document.createElement("details");

      // Create summary element
      var summary = document.createElement("summary");
      var overallClass = getLogLevelClass(entry.kjIn / entry.kjOut);
      summary.classList.add(overallClass);
      summary.appendChild(getTimeElementForDate(new Date(entry.date)));
      summary.appendChild(document.createTextNode(", "));
      var data = getDataElementForKj(entry.total, "kcal");
      data.classList.add("calorie-balance");
      data.classList.add(overallClass);
      summary.appendChild(data);
      details.appendChild(summary);

      // Add the entries
      for (var j = 0; j < entry.activities.length; j++) {
        details.appendChild(getActivityElement(entry.activities[j]));
      }

      logSection.appendChild(details);
    }
  });
}

function getLogLevelClass(level) {
  return level < OK_CUTOFF
    ? "under"
    : level < BAD_CUTOFF
    ? "equal" : "over";
}

function getTimeElementForDate(utcdate) {
  function pad(n){return n<10 ? '0'+n : n}
  var time    = document.createElement("time");
  var shortDate = utcdate.getUTCFullYear() + '-' +
                  pad(utcdate.getUTCMonth() + 1) + '-' +
                  pad(utcdate.getUTCDate());
  time.setAttribute("datetime", shortDate);
  time.textContent = utcdate.toLocaleDateString();
  return time;
}

function getDataElementForKj(kj, unit) {
  var kcal = !!(typeof unit !== "undefined" && unit.toLowerCase() === "kcal");
  var amount = Math.round(kcal ? kj / counter.KJ_PER_KCAL : kj);
  var units  = kcal ? "kCal" : "kJ";
  var data = document.createElement("data");
  data.setAttribute("value", amount);
  data.textContent = amount + " " + units;
  return data;
}

function getActivityElement(activity) {
  var div = document.createElement("div");
  div.classList.add("log-entry");
  var plusMinusClass = activity.kj >= 0 ? "plus" : "minus";
  div.classList.add(plusMinusClass);

  // Activity name
  var span = document.createElement("span");
  span.classList.add(activity.type);
  var name = activity.type === "food" ? activity.food : activity.activity;
  if (!name)
    name = "(Something)";
  span.textContent = name;
  div.appendChild(span);
  div.appendChild(document.createTextNode(" "));

  // Quantity
  /* Skipping for now until we decide how to handle this
  if (activity.type === "food") {
    var quantity = document.createElement("data");
    quantity.setAttribute("value", activity.quantity);
    quantity.textContent = activity.quantity;
    div.appendChild(quantity);
  }
  */

  // kJ
  var data = getDataElementForKj(activity.kj, "kcal");
  data.classList.add("calorie-count");
  data.classList.add(plusMinusClass);
  div.appendChild(data);

  return div;
}

/* --------------------------------------
 *
 * SETTINGS
 *
 * --------------------------------------*/

function initSettings() {
  // Listen to changes in height, dob
  document.querySelector("input[name=height]").addEventListener("change",
    onChangeHeight, false);
  document.querySelector("input[name=dob]").addEventListener("change",
    onChangeDOB, false);

  // Listen to changes to gender
  var genderRadios =
    document.querySelectorAll("input[type=radio][name=gender]");
  for (var i = 0; i < genderRadios.length; i++) {
    var radio = genderRadios[i];
    radio.addEventListener("change", onChangeGender, false);
  }

  // TASK(b): Listen to changes to the mute checkbox here
  // You will need to call a function whenever the "change" event fires.

  // TASK(c): Write the function that is called when the checkbox changes.
  // It should checks whether the checkbox is set or not and save the result to
  // localStorage.
  // You might need to look up how to test whether a checkbox is checked or not.

  // TASK(d): Add some code here that checks the value stored in localStorage
  // (if any). If there is a value stored there that says the checkbox is
  // checked then check it here.
  //
  // NOTE: When you reload a page, browsers normally remember the "state" of
  // forms. That means, if you tick a checkbox and reload the page, it will
  // remain ticked automatically. To test if your code is actually working you
  // will need to do a "Force reload". You can do this by holding Shift while
  // clicking reload. To be really sure, try closing the browser and re-opening
  // it. If your code works it should remember the state of the checkbox.

  // If the browser is capable of installing Web apps, enable the button
  if (navigator.mozApps) {
    installButton = document.getElementById("installApp");
    installButton.style.display = 'block';
    // When the app is already installed we need to disable the button
    // accordingly
    var markInstalled = function() {
      installButton.textContent = "Installed";
      installButton.disabled = true;
    }
    // Add listener for clicks on the button
    installButton.addEventListener("click",
      function(evt) {
        navigator.mozApps.install("http://calorme.mozlabs.jp/calor-me.webapp").
          onsuccess = markInstalled;
        evt.preventDefault();
      }, false);
    // Check if we're already installed
    var request = navigator.mozApps.getSelf();
    request.onsuccess = function() {
      if (request.result)
        markInstalled();
    }
  }
}

function onChangeHeight(evt) {
  var height = parseFloat(evt.target.value);
  if (!height)
    return;
  counter.height = height;
  // XXX Update the log and summary
}

function onChangeDOB(evt) {
  var dob = evt.target.value;
  if (!dob)
    return;
  counter.dob = dob;
  // XXX Update the log and summary
}

function onChangeGender(evt) {
  counter.gender = evt.target.value.toLowerCase().trim();
  setDiagramGender(evt.target.value);
  // XXX Update the log and summary
}

/* --------------------------------------
 *
 * PRE-FILL DATA
 *
 * --------------------------------------*/

var prefillLists = {};

function initPreFillData() {
  // Foods list
  var foods = "food-data.json";
  var foodsList = document.getElementById("foods");
  fetchPrefillData(foods, foodsList,
    function(list) {
      var hash = new Object;
      for (var i = 0; i < list.length; i++) {
        hash[list[i][0].trim().toLowerCase()] = list[i][1];
      }
      prefillLists.foods = hash;
    });
  var foodForm = document.forms.food;
  foodForm.food.addEventListener("change", calcFood, false);
  foodForm.quantity.addEventListener("change", calcFood, false);
}

function fetchPrefillData(url, targetList, onComplete) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  if (xhr.overrideMimeType) {
    xhr.overrideMimeType('application/json; charset=utf-8');
  }
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      if (xhr.status == 200 || xhr.status === 0) {
        fillList(xhr.responseText, targetList, onComplete);
      } else {
        console.log("Failed to load " + url);
      }
    }
  };
  xhr.send(null);
}

function fillList(jsonData, list, onComplete) {
  var data = JSON.parse(jsonData);
  // Check we've got a reasonable list
  if (!Array.isArray(data) ||
      data.length < 1 ||
      !Array.isArray(data[0]) ||
      typeof data[0][0] !== "string")
    return;
  // Clear children of list
  while (list.hasChildNodes())
    list.removeChild(list.lastChild);
  // Add an option for each item in the list
  for (var i = 0; i < data.length; i++) {
    var option = document.createElement("OPTION");
    option.setAttribute("value", data[i][0]);
    list.appendChild(option);
  }
  // Pass the list on
  if (onComplete) {
    onComplete(data);
  }
}

function calcFood() {
  var foodForm = document.forms.food;
  var food = foodForm.food.value.trim().toLowerCase();
  if (!food)
    return;
  var multiplier = prefillLists.foods[food];
  if (typeof multiplier === "undefined")
    return;
  var quantity = parseFloat(foodForm.quantity.value);
  if (isNaN(quantity))
    return;
  // Multiplier is kJ per 100g
  var result = Math.round(multiplier / 100 * quantity / counter.KJ_PER_KCAL);
  foodForm['calorie-count'].value = result;
}

/* --------------------------------------
 *
 * CALORIE COUNTER MODEL
 *
 * --------------------------------------*/

// One note is that internally everything is represented in metric (kJ) but we
// offer interfaces for reporting values in calories (actually kilocalories).

CalorieCounter = function() {
  this._consumedToday = 0;
  this._spentToday    = 0;
  this._bmr           = 7340;
  this._db            = null;
  this._weight        = null;
  this._height        = null;
  this._dob           = null;
  this._gender        = null;

  this.__defineGetter__("kjOut", function() {
    return this._bmr + this._spentToday;
  });
  this.__defineGetter__("kcalOut", function() {
    return this.kjOut / this.KJ_PER_KCAL;
  });
  this.__defineGetter__("kjIn", function() {
    return this._consumedToday;
  });
  this.__defineGetter__("kcalIn", function() {
    return this.kjIn / this.KJ_PER_KCAL;
  });

  this.__defineGetter__("weight", function() {
    return this._weight;
  });
  this.__defineSetter__("weight", function(weight) {
    this._setWeight(weight);
  });
  this.__defineGetter__("height", function() {
    return this._height;
  });
  this.__defineSetter__("height", function(height) {
    this._setSetting("height", height);
    this.updateBMR();
  });
  this.__defineGetter__("dob", function() {
    return this._dob;
  });
  this.__defineSetter__("dob", function(dob) {
    this._setSetting("dob", dob);
    this.updateBMR();
  });
  this.__defineGetter__("gender", function() {
    return this._gender;
  });
  this.__defineSetter__("gender", function(dob) {
    this._setSetting("gender", dob);
    this.updateBMR();
  });

  this.init();
}

CalorieCounter.prototype.KJ_PER_KCAL = 4.2;

CalorieCounter.prototype.init = function() {
  this._getDb(
    function(db) {
      // Load settings first since they are needed to calculate the BMR when the
      // load today's data
      var trans = db.transaction(["settings"]);
      trans.oncomplete = this._initDailySummary.bind(this);
      var settings = trans.objectStore("settings");
      ['height', 'dob', 'gender'].forEach(
        function(name) {
          settings.get(name).onsuccess = function(event) {
            if (typeof event.target.result !== "undefined")
              this['_' + name] = event.target.result;
          }.bind(this);
        }.bind(this)
      );
    }.bind(this)
  );
}

CalorieCounter.prototype._initDailySummary = function() {
  this.getTodaysLog(function(log) {
    console.assert(log.length === 1, "Unexpected log length");
    log = log[0];
    this._spentToday    = log.kjOut - log.bmr;
    this._consumedToday = log.kjIn;
    this._bmr           = log.bmr;
    this._weight        = log.weight;

    if (this.oninit)
      this.oninit();
  }.bind(this));
}

CalorieCounter.prototype.addActivity = function(amount, unit) {
  if (typeof unit !== "undefined" && unit.toLowerCase() === "kcal")
    amount *= this.KJ_PER_KCAL;
  this._spentToday += amount;
}

CalorieCounter.prototype.addFood = function(food, quantity, amount, unit,
  onsuccess) {
  if (typeof unit !== "undefined" && unit.toLowerCase() === "kcal")
    amount *= this.KJ_PER_KCAL;
  this._consumedToday += amount;

  log = {
    type: "food",
    food: food,
    quantity: quantity,
    kj: amount
  };
  this._addLog(log, onsuccess);
}

CalorieCounter.prototype._setWeight = function(weight) {
  if (this._weight === weight)
    return;
  var entry = {
    localDate: this._getLocalDate(),
    weight: weight
  };
  this._getDb(
    function(db) {
      db.transaction(["weightLog"], "readwrite").objectStore("weightLog").
        put(entry);
    }
  );
  this._weight = weight;
  this.updateBMR();
}

CalorieCounter.prototype._setSetting = function(name, value) {
  if (this['_' + name] === value)
    return;
  this._getDb(
    function(db) {
      db.transaction(["settings"], "readwrite").objectStore("settings").
        put(value, name);
    }
  );
  this['_' + name] = value;
}

window.indexedDB = window.indexedDB || window.mozIndexedDB ||
                   window.webkitIndexedDB || window.msIndexedDB;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange ||
                     window.msIDBKeyRange;

CalorieCounter.prototype._getDb = function(onsuccess) {
  if (!this._db) {
    var request = window.indexedDB.open("CalorieCounter", 3);
    request.onsuccess = function(event) {
      this._db = request.result;
      // Set up database-level error logging
      this._db.onerror = function(event) {
        console.log(event.target.result);
      };
      onsuccess(this._db);
    }.bind(this);
    request.onerror = function(event) {
      // Just log the error and forget about saving
      console.log(event.target.errorCode);
    }
    request.onupgradeneeded = function(event) {
      this._db = event.target.result;
      /* Log object store */
      if (event.oldVersion < 1) {
        this._db.createObjectStore("log", { autoIncrement: true });
      }
      var log = event.target.transaction.objectStore("log");
      if (event.oldVersion < 2) {
        log.createIndex("time", "time", { unique: false });
      }
      /* Weight object store */
      var weights =
        this._db.createObjectStore("weightLog", { keyPath: "localDate" });
      /* Settings object store */
      var settings = this._db.createObjectStore("settings");
    }.bind(this);
  } else {
    onsuccess(this._db);
  }
}

CalorieCounter.prototype._addLog = function(log, onsuccess) {
  var data = log;
  data.time = Date.now();
  data.localDate = this._getLocalDate();
  this._getDb(
    function(db) {
      db.transaction(["log"], "readwrite").objectStore("log").add(log).
        onsuccess = function(event) {
        if (onsuccess) {
          var result = log;
          result.id = event.target.result;
          onsuccess(result);
        }
      };
    }
  );
}

CalorieCounter.prototype._getLocalDate = function(log, onsuccess) {
  // Calculate the date only (minus time component) in local time and convert to
  // UTC.
  var d = new Date();
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

// start and end are dates in UTC
CalorieCounter.prototype._getLogEntriesInRange = function(start, end, onsuccess)
{
  var entries = [];
  this._getDb(
    function(db) {
      var objectStore = db.transaction(["log"]).objectStore("log");
      // The start and end dates given are UTC but we want to include
      // activities that within those dates in *local* time when they were
      // recorded. So we need to extend the range while we do the fetch by 12
      // hours either side and then, before we add any activities to our result,
      // check if the local time is within the range.
      //
      // Why don't get just store local times to begin with? Well, we want to
      // preserve the sequence in which items were added, even when changing
      // time zones.
      //
      // For weights we don't bother since we only store one weight per day.
      // There will be some obscure situations where this doesn't work, but
      // probably not often enough we need to worry about it.
      var twelveHours = 12*60*60*1000;
      var effectiveStart = start - twelveHours;
      var effectiveEnd   = end ? end + twelveHours : null;
      var range = end
                ? IDBKeyRange.bound(effectiveStart, effectiveEnd, true, false)
                : IDBKeyRange.lowerBound(effectiveStart, true);
      var index = objectStore.index("time");
      index.openCursor(range).onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          // Check the event actually did happen in the specified range
          if (cursor.value.localDate >= start &&
              (!end || cursor.value.localDate < end)) {
            entries.push(cursor.value);
          }
          cursor.continue();
        } else {
          onsuccess(entries);
        }
      }
    }
  );
}

CalorieCounter.prototype._getWeightsForRange = function(start, end, onsuccess) {
  // Array of dates and weights
  // We go through the weights backwards from 'end' until 'start' or 1 item
  // past 'start' if there is one.
  // This is because weights are only stored when changed and they apply
  // forwards from that point
  var storedWeights = [];
  this._getDb(
    function(db) {
      var objectStore = db.transaction(["weightLog"]).objectStore("weightLog");
      var range = end ? IDBKeyRange.upperBound(end, true) : null;
      objectStore.openCursor(range, "prev").onsuccess = function(event) {
        var cursor = event.target.result;
        var cont = false;
        if (cursor) {
          storedWeights.push(cursor.value);
          if (cursor.value.localDate > start) {
            cont = true;
            cursor.continue();
          }
        }
        if (!cont)
          onsuccess(storedWeights.reverse());
      };
    }
  );
}

// This is just a temporary convenience method until we find a better way of
// handling dates
CalorieCounter.prototype.getLast7DaysLog = function(onsuccess) {
  var oneDay = 24*60*60*1000;
  var start  = this._getLocalDate() - 6 * oneDay;
  var end    = start + 7 * oneDay;
  this._getFullLogForRange(start, end, onsuccess);
};

// This too is just temporary
CalorieCounter.prototype.getTodaysLog = function(onsuccess) {
  var oneDay = 24*60*60*1000;
  var start  = this._getLocalDate();
  var end    = start + oneDay;
  this._getFullLogForRange(start, end, onsuccess);
};

CalorieCounter.prototype._getFullLogForRange = function(start, end, onsuccess) {
  this._getLogEntriesInRange(start, end, function(entries) {
    this._getWeightsForRange(start, end, function(weights) {
      this._arrangeFullLog(start, end, entries, weights, onsuccess);
    }.bind(this));
  }.bind(this));
}

CalorieCounter.prototype._arrangeFullLog =
  function(start, end, activities, weights, onsuccess) {
  var result = [];
  // We have the activities and weights.
  // Now to arrange them into something useful.
  var oneDay = 24*60*60*1000;
  var numDays = (end - start) / oneDay;
  var currentDate = start;
  // Get the initial weight
  var currentWeight = null;
  while (weights.length && weights[0].localDate <= start) {
    currentWeight = weights.shift().weight;
  }
  var effectiveEnd = end ? end : this._getLocalDate() + oneDay;
  for (var currentDate = start; currentDate < effectiveEnd;
       currentDate += oneDay) {
    var day = {};
    day.date = currentDate;
    // Set weight
    if (weights.length && weights[0].localDate <= currentDate) {
      currentWeight = weights.shift().weight;
    }
    day.weight = currentWeight;
    day.bmr =
      this.calcBMR(day.weight, this.height, this.dob, this.gender, day.date);
    // Add activities
    day.activities = [];
    day.kjOut = day.bmr;
    day.kjIn  = 0;
    while (activities.length && activities[0].localDate <= currentDate) {
      var activity = activities.shift();
      if (activity.type === "food") {
        day.kjIn += activity.kj;
      } else {
        day.kjOut += activity.kj;
      }
      day.activities.push(activity);
    }
    day.total = day.kjIn - day.kjOut;
    result.push(day);
  }
  onsuccess(result);
}

// weight (kg)
// height (cm)
// dob (yyyy-mm-dd)
// gender (male|female)
// date (the date to calculate the age relative to. If not defined will default
// to the current date
CalorieCounter.prototype.calcBMR = function(weight, height, dob, gender, date) {
  var isMale = !(gender && gender.trim().toLowerCase() === "female");
  // These are some fairly rough averages for adults
  weight = weight ? weight : (isMale ? 75 : 70);
  height = height ? height : (isMale ? 160 : 170);
  // If there's no valid dob we just use 20 (for no good reason)
  var oneYear = 365.26*24*60*60*1000;
  date = date ? date : Date.now();
  var age = dob ? (date - Date.parse(dob)) / oneYear : 20;
  var bmrkCal = isMale
    ? 13.397 * weight + 4.799 * height - 5.677 * age + 88.362
    : 9.247 * weight + 3.098 * height - 4.33 * age + 447.593;
  return bmrkCal * this.KJ_PER_KCAL;
}

CalorieCounter.prototype.updateBMR = function() {
  this._bmr = this.calcBMR(this.weight, this.height, this.dob, this.gender);
  // XXX Trigger update of stuff
}
