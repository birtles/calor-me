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
}
window.addEventListener("load", init, false);

function initTabs() {
  // Tab navigation
  var tablinks = document.querySelectorAll("menu[aria-role=tablist] a");
  for (var i = 0; i < tablinks.length; i++) {
    tablinks[i].addEventListener("click",
      function(e) {
        var match = /#[^#]+$/.exec(e.target.href);
        if (match) {
          var selectedId = match[0].substr(1);
          var tabs = document.querySelectorAll("section[aria-role=tab]");
          for (var j = 0; j < tabs.length; j++) {
            var tab = tabs[j];
            tab.setAttribute("aria-selected",
                             tab.id === selectedId ? "true" : "false");
          }
          e.preventDefault();
          // Play tab switch sound if available
          var sfx = document.getElementById('tabSwitchSound');
          if (sfx)
            sfx.play();
        }
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

function addFood() {
  // TODO
  counter.addFood(2000, "kcal");
  hideDialog(document.getElementById('add-food'));
  updateSummary();
  document.getElementById('riseSound').play();
}

function addActivity() {
  // TODO
  counter.addActivity(2000, "kcal");
  hideDialog(document.getElementById('add-activity'));
  updateSummary();
  document.getElementById('fallSound').play();
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

/* --------------------------------------
 *
 * SETTINGS
 *
 * --------------------------------------*/

function initSettings() {
  // Listen to changes to gender
  var genderRadios =
    document.querySelectorAll("input[type=radio][name=gender]");
  for (var i = 0; i < genderRadios.length; i++) {
    var radio = genderRadios[i];
    radio.addEventListener("change", onChangeGender, false);
  }

  // TODO Need to store the gender, set the radio buttons and update the
  // diagram accordingly
}

function onChangeGender(evt) {
  var figure = document.getElementById("figure");
  figure.contentDocument.setGender(evt.target.value);
}

/* --------------------------------------
 *
 * CALORIE COUNTER MODEL
 *
 * --------------------------------------*/

// TODO
// This is all placeholder code for the moment.
// The calculation of the BMR needs to be based on the settings etc.
//
// One note is that internally everything is represented in metric (kJ) but we
// offer interfaces for reporting values in calories (actually kilocalories).

CalorieCounter = function() {
  this.consumed  = 0;
  this.spent     = 0;
  this.bmr       = 8000;

  this.__defineGetter__("kjOut", function() {
    return this.bmr + this.spent;
  });
  this.__defineGetter__("kcalOut", function() {
    return this.kjOut / this.KJ_PER_KCAL;
  });
  this.__defineGetter__("kjIn", function() {
    return this.consumed;
  });
  this.__defineGetter__("kcalIn", function() {
    return this.kjIn / this.KJ_PER_KCAL;
  });
}

CalorieCounter.prototype.KJ_PER_KCAL = 4.2;

CalorieCounter.prototype.addActivity = function(amount, unit) {
  if (typeof unit !== "undefined" && unit.toLowerCase === "kcal")
    amount *= this.KJ_PER_KCAL;
  this.spent += amount;
}

CalorieCounter.prototype.addFood = function(amount, unit) {
  if (typeof unit !== "undefined" && unit.toLowerCase === "kcal")
    amount *= this.KJ_PER_KCAL;
  this.consumed += amount;
}
