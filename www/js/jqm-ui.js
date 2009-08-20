var calculator;
var quick = true;

if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
  quick = true;
} else {
  quick = true;
}

$(document).bind("mobileinit", function() {
  $.mobile.pushStateEnabled = false;
});

var loaded_presets = false;
var need_force_input = true;

function layout() {
  var w = $(window).width();
  var h = $(".keyblock > div > a").width();
  if (h == 0) h = 55;
  //	$(".keyblock > div > a").css('height', h*1).css('font-size', h*0.327 + "pt");
  //	$("#valueBox").css('font-size', h*0.327 + "pt");
  //	$(".keyblock > div > a > span").css('margin-left',-h*0.054);

  //console.log(h);
}

var rolls = null;
if (typeof Storage !== "undefined") {
  if (localStorage.rolls !== undefined) {
    var r = JSON.parse(localStorage.rolls);
    if (typeof r === "object") {
      rolls = r;
    }
  }
}

function commitToLocalStorage() {
  if (typeof Storage !== "undefined") {
    localStorage.rolls = JSON.stringify(rolls);
  }
}

function resetRolls() {
  rolls = {
    Attack: "d20",
    "Long Sword": "1d6",
    "Magic Missile": "1d4+1",
    "Roll Stat": "4d6[F:dropLow]",
    "Roll Stat 2": "5d6[F:dropLow]2",
    "Roll Stat 3": "3d6"
  };

  if (loaded_presets) {
    $("#rolllist li").remove();
    for (k in rolls) {
      addRoll(rolls[k], k);
    }
    $("#rolllist").listview("refresh");
  }
  commitToLocalStorage();
}

if (rolls == null) resetRolls();

function updateDisplay() {
  var box = $("#valueBox");
  var old = box.val();
  var v = calculator.getValueBox();
  box.val(v);
  if (v == "") {
    $("#calcKeyC").hide();
  } else {
    if (old == "") $("#calcKeyC").show();
  }
}

$(document).delegate("#chartDialog", "pagecreate", function() {
  $("table")
    .hide()
    .visualize({ type: "bar", appendKey: false, width: "200px" });
});
$(document).delegate(document, "pagechange", function() {
  $(".visualize").trigger("visualizeRefresh");
});

$(document).delegate("#calc", "pagecreate", layout);
$(window).bind("resize", layout);

function popText(c) {
  return (
    "<div class='popText' style='font-size:40pt; margin-left: auto; margin-right: auto; text-align: center'>" +
    c.getValueBox() +
    "</div>"
  );
}

function popCalc(what) {
  var c = new Calculator();
  c.load(what);
  c.crunch();
  $("#popcalcwhat").val(what);
  var up = this;
  $("#poptext").text(c.getValueBox());
  $.mobile.changePage("#popcalc", { role: "dialog", transition: "none" });
}

var deletewhat = null;
var deletename = null;
function addRoll(roll, name) {
  var del = function() {
    deletewhat = this;
    $.mobile.changePage("#delete", {
      role: "dialog",
      transition: quick ? "none" : "slidedown"
    });
  };
  $(
    '<li data-name="' +
      name +
      '">' +
      '<a href="#" class="pop">' +
      name +
      "</a>" +
      '<span class="ui-li-count">' +
      new Calculator().getClean(roll) +
      "</span>" +
      '<a href="#" class="roll" data-roll=' +
      roll +
      '">Edit</a>' +
      "</li>"
  )
    .on("tap", "a.roll", roll, function(evt) {
      calculator.load(roll);
      updateDisplay();
      //calculator.crunch();
      $.mobile.changePage("#calc", { transition: quick ? "none" : "pop" });
    })
    .on("tap", "a.pop", roll, function(evt) {
      popCalc.call(this, roll);
    })
    .on("swiperight", del)
    .on("contextmenu", del)
    .appendTo("#rolllist");
}
$(document).delegate("#presets", "pagecreate", function() {
  loaded_presets = true;
  for (name in rolls) {
    var roll = rolls[name];
    addRoll(roll, name);
  }

  //$('#rolllist').listview('refresh');
});

$(document).ready(function() {
  $("#clearStorage").click(function() {
    $(this).simpledialog({
      useDialogForceFalse: true,
      mode: "button",
      prompt: "<h2>Delete Saved Data?</h2>",
      buttons: {
        OK: {
          click: function() {
            resetRolls();
          }
        },
        Cancel: {
          theme: "c",
          icon: "delete",
          click: function() {
            return true;
          }
        }
      }
    });
  });
  //$(document).bind('touchmove',function(e) { e.preventDefault(); });
  calculator = new Calculator();
  calculator.onDisplayChanged = updateDisplay;
  /*
	calculator.key("1");
	calculator.key("d");
	calculator.key("2");
	calculator.keyFunction("open");
	calculator.key("2");
	*/
  var paddice = false;

  $("#calcKeyFX").bind("tap", function(e) {
    $.mobile.changePage("#functionDialog", {
      transition: quick ? "none" : "slide"
    });
    return false;
  });
  $("#loadButton").bind("tap", function(e) {
    $.mobile.changePage("#presets", { transition: quick ? "none" : "slide" });
    return false;
  });
  $("#presetsBack").bind("tap", function(e) {
    $.mobile.changePage("#calc", {
      transition: quick ? "none" : "slide",
      reverse: true
    });
    return false;
  });
  $("#functionBack").bind("tap", function(e) {
    $.mobile.changePage("#calc", {
      transition: quick ? "none" : "slide",
      reverse: true
    });
    return false;
  });

  $("#calcKeyC").bind("tap", function() {
    calculator.key("C");
    return false;
  });
  $("#calcKeyS").bind("tap", function() {
    var v = calculator.command == null ? calculator.buffer : calculator.command;
    if (v == "") return;
    $("#savename").val("");
    $.mobile.changePage("#save", { role: "dialog", transition: "none" });
    return false;
  });
  $(".keyblock").on("tap", "a", function(evt) {
    var val = $("span > span", this).text();
    if (val == "\u0192") return true; //Allow function dialog to trigger
    if (val == "S") return true; //Allow save dialog to trigger
    calculator.addToBuffer("key", val);
    //$("#valueBox").html(calculator.getValueBox() + "&nbsp;");
    if (paddice) {
      $("#calcKey7 > span > span").html("7");
      $("#calcKey9 > span > span")
        .html("9")
        .css("margin-left", "0px");
      paddice = false;
    } else if (val == "d" && !paddice) {
      paddice = true;
      $("#calcKey7 > span > span").html("20");
      $("#calcKey9 > span > span")
        .html("<small>100</small>")
        .css("margin-left", "-5px");
    }
    return false;
  });

  $(".keyblock").on("taphold", "a", function(evt) {
    var val = $("span > span", this).text();
    if (val == "\u2190") {
      calculator.clear();
    }
    //alert(val);
  });
  $("body").bind("keypress", function(evt) {
    if ($($.mobile.activePage).attr("id") != "calc") return true;
    var key = evt.which;
    switch (key) {
      case 46:
      case 100:
      case 68:
        calculator.key("d");
        break;
      case 13:
        calculator.crunch();
        break;
      case 43:
        calculator.key("\u00B1");
        break;
      default:
        if (key > 47 && key < 58) {
          calculator.addToBuffer("key", "" + (key - 48));
        } else {
          console.log("KEY:" + key);
        }
    }
    return false;
  });

  $("#funclist > li").bind("click", function(evt) {
    var func = $("a", this).attr("data-func");
    if (func != "") calculator.keyFunction(func);
    updateDisplay();
  });

  $("#save").on("pageshow", function(evt) {
    $("#savename").focus();
  });
  $("#saveroll").bind("click", function(evt) {
    var v = calculator.command == null ? calculator.buffer : calculator.command;
    var k = $("#savename").val();
    if (k == "") k = v;
    if (rolls[k] !== undefined && loaded_presets) {
      $("#rolllist")
        .find("li[data-name='" + k + "']")
        .remove();
    }
    rolls[k] = v;
    addRoll(v, k);
    if (loaded_presets) $("#rolllist").listview("refresh");
    commitToLocalStorage();
    $("#save").dialog("close");
  });

  $("#popreroll").bind("click", function(evt) {
    var c = new Calculator();
    var what = $("#popcalcwhat").val();
    c.load(what);
    c.crunch();
    $("#poptext").text(c.getValueBox());
  });

  $("#popedit").bind("click", function(evt) {
    var what = $("#popcalcwhat").val();
    calculator.load(what);
    updateDisplay();
    $.mobile.changePage("#calc", { transition: quick ? "none" : "flow" });
  });
  $("#deleteroll").bind("click", function(evt) {
    var name = $(deletewhat).attr("data-name");
    $("#delete").dialog("close");
    $(deletewhat)
      .fadeOut()
      .remove();
    delete rolls[name];
    commitToLocalStorage();
  });

  $("#optionRaw").change(function() {
    calculator.showRaw = $(this).prop("checked");
    updateDisplay();
  });
  $("#optionShowCmd").change(function() {
    calculator.showCmd = $(this).prop("checked");
    updateDisplay();
  });
  $("#optionShowPreEval").change(function() {
    calculator.showPreEval = $(this).prop("checked");
    updateDisplay();
  });

  $("body").on("pagebeforeshow", 'div[data-role="dialog"]', function(e, ui) {
    ui.prevPage.addClass("ui-dialog-background ");
  });

  $("body").on("pagehide", 'div[data-role="dialog"]', function(e, ui) {
    $(".ui-dialog-background ").removeClass("ui-dialog-background ");
  });
});
