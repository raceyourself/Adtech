$(function() {
  localizePage();

  //Shows the instructions for how to enable all extensions according to the browser of the user
  if(SAFARI) {
    $(".chrome_only").hide();
  } else {
    $(".safari_only").hide();
    var messageElement = $("li[i18n='disableforchromestepone']");
    messageElement.find("a").click(function() {
    if (OPERA) {
      chrome.tabs.create({url: 'opera://extensions/'});
    } else {
      chrome.tabs.create({url: 'chrome://extensions/'});
    }
    });
  }

  // Sort the languages list
  var languageOptions = $("#step_language_lang option");
  languageOptions.sort(function(a,b) {
    if (!a.text) return -1; if (!b.text) return 1; // First one is empty
    if (!a.value) return 1; if (!b.value) return -1; // 'Other' at the end
    if (a.getAttribute("i18n") == "lang_english") return -1; // English second
    if (b.getAttribute("i18n") == "lang_english") return 1;
    return (a.text > b.text) ? 1 : -1;
  });
  $("#step_language_lang").empty().append(languageOptions);
});

//fetching the options...
var options = parseUri.parseSearch(document.location.search);

//get the list of subscribed filters and
//all unsubscribed default filters
var unsubscribed_default_filters = [];
var subscribed_filter_names = [];
BGcall("get_subscriptions_minus_text", function(subs) {
  for (var id in subs)
    if (!subs[id].subscribed && !subs[id].user_submitted)
      unsubscribed_default_filters[id] = subs[id];
    else if (subs[id].subscribed)
      subscribed_filter_names.push(id);
});

var enabled_settings = [];
BGcall("get_settings", function(settings) {
  for (setting in settings)
    if (settings[setting])
      enabled_settings.push(setting);
});

//generate the URL to the issue tracker
function generateReportURL() {
  var AdBlockVersion = chrome.runtime.getManifest().version;
  var result = "https://adblock.tenderapp.com/discussion/new" +
               "?category_id=ad-report&discussion[title]=";

  var domain = "<enter URL of webpage here>";
  if (options.url)
    domain = parseUri(options.url).hostname;
  result = result + encodeURIComponent("Ad report: " + domain);

  var body = [];
  var count = 1;
  body.push("Last step -- point me to the ad so I can fix the bug! " +
      "Don't leave anything out or I'll probably " +
      "have to ignore your report. Thanks!");
  body.push("");
  body.push("Also, if you can put your name (or a screen name) " +
      "and a contact email access in the boxes above, that would be great!");
  body.push("");
  body.push("We need the email so that we can contact you if we need more information " +
      "than what you give us in your report. Otherwise, we might not be able to fix it.");
  body.push("");
  if (!options.url) {
    body.push(count + ". Paste the URL of the webpage showing an ad: ");
    body.push("");
    body.push("");
    count++;
  }
  body.push(count + ". Exactly where on that page is the ad? What does it " +
      "look like? Attach a screenshot, with the ad clearly marked, " +
      "if you can.");
  body.push("");
  body.push("");
  count++;
  body.push(count + ". If you have created the filter which removes reported ad, please paste it here: ");
  body.push("");
  body.push("");
  count++;
  body.push(count + ". Any other information that would be helpful, besides " +
      "what is listed below: ");
  body.push("");
  body.push("");
  body.push("-------- Please don't touch below this line. ---------");
  if (options.url) {
    body.push("=== URL with ad ===");
    body.push(options.url);
    body.push("");
  }
  body.push("=== Subscribed filters ===");
  body.push(subscribed_filter_names.join('\n'));
  body.push("");
  body.push("=== Browser" + (AdBlockVersion ? ' & AdBlock' : '') + ": ===");
  var browser;
  if (SAFARI)
      browser = "Safari " + navigator.userAgent.match(/Version\/([0-9.]+)/)[1]
  else if (OPERA)
      browser = "Opera " + navigator.userAgent.match(/OPR\/([0-9.]+)/)[1]
  else
      browser = "Google Chrome " + navigator.userAgent.match(/Chrome\/([0-9.]+)/)[1];
  body.push(browser);
  if (AdBlockVersion)
    body.push("AdBlock " + AdBlockVersion);
  body.push("");
  body.push("=== Enabled settings ===");
  body.push(enabled_settings.join('\n'));
  body.push("");
  body.push("=== Question Responses ===");
  var answers = $('[class="answer"]["chosen"]');
  var text = $('div[id^="step"][class="section"]:visible');
  for (var i=0, n=1; i<answers.length, i<text.length; i++, n++) {
      body.push(n+"."+text[i].id+": "+answers[i].getAttribute("chosen"));
  }
  body.push("");

  result = result + "&discussion[body]=" + encodeURIComponent(body.join('  \n')); // Two spaces for Markdown newlines

  return result;
}

// Auto-scroll to bottom of the page
$("input, select").change(function(event) {
  event.preventDefault();
  $("html, body").animate({ scrollTop: 15000 }, 50);
});


// STEP 1: update filters

//Updating the users filters
$("#UpdateFilters").click(function() {
  $(this).attr("disabled", "disabled");
  BGcall("update_subscriptions_now", function() {
    $(".afterFilterUpdate input").removeAttr('disabled');
    $(".afterFilterUpdate").removeClass('afterFilterUpdate');
  });
});
//if the user clicks a radio button
$("#step_update_filters_no").click(function() {
  $("#step_update_filters").html("<span class='answer' chosen='no'>" + translate("no") + "</span>");
  $("#checkupdate").text(translate("adalreadyblocked"));
});
$("#step_update_filters_yes").click(function() {
  $("#step_update_filters").html("<span class='answer' chosen='yes'>" + translate("yes") + "</span>");
  $("#step_disable_extensions_DIV").fadeIn().css("display", "block");
});

// STEP 2: disable all extensions

//Code for displaying the div is in the $function() that contains localizePage()
//after user disables all extensions except for AdBlock
//if the user clicks a radio button
$("#step_disable_extensions_no").click(function() {
  $("#step_disable_extensions").html("<span class='answer' chosen='no'>" + translate("no") + "</span>");
  $("#checkupdate").text(translate("reenableadsonebyone"));
});
$("#step_disable_extensions_yes").click(function() {
  $("#step_disable_extensions").html("<span class='answer' chosen='yes'>" + translate("yes") + "</span>");
  // Show malware steps just for Windows users
  if (navigator.appVersion.indexOf("Win")!=-1)
    $("#step_everywhere_DIV").fadeIn().css("display", "block");
  else
    $("#step_language_DIV").fadeIn().css("display", "block");
});


// STEP 3a: Ads on most pages

//If the user clicks a radio button
$("#step_everywhere_yes").click(function() {
    $("#step_everywhere").html("<span class='answer' chosen='yes'>" + translate("yes") + "</span>");
    $("#step_malware_DIV").fadeIn().css("display", "block");
  });
  $("#step_everywhere_no").click(function() {
    $("#step_everywhere").html("<span class='answer' chosen='no'>" + translate("no") + "</span>");
    $("#step_language_DIV").fadeIn().css("display", "block");
  });


// STEP 3b: scan for malware

//If the user clicks a radio button
$("#step_malware_yes").click(function() {
  $("#step_malware").html("<span class='answer' chosen='yes'>" + translate("yes") + "</span>");
  $("#step_language_DIV").fadeIn().css("display", "block");
});
$("#step_malware_no").click(function() {
  $("#step_malware").html("<span class='answer' chosen='no'>" + translate("no") + "</span>");
  $("#checkupdate").text(translate("adalreadyblocked"));
});


// STEP 4: language

//if the user clicks an item
var contact = "";
$("#step_language_lang").change(function() {
  var selected = $("#step_language_lang option:selected");
  $("#step_language").html("<span class='answer'>"+ selected.text() +"</span>");
  $("#step_language span").attr("chosen",selected.attr("i18n"));
  if (selected.text() == translate("other")) {
    $("#checkupdate").html(translate("nodefaultfilter1"));
    $("#link").html(translate("here")).attr("href", "https://adblockplus.org/en/subscriptions");
    return;
  } else {
    var required_lists = selected.attr('value').split(';');
    for (var i=0; i < required_lists.length - 1; i++) {
      if (unsubscribed_default_filters[required_lists[i]]) {
        $("#checkupdate").text(translate("retryaftersubscribe", [translate("filter" + required_lists[i])]));
        return;
      }
    }
  }
  contact = required_lists[required_lists.length-1];

  $("#step_firefox_DIV").fadeIn().css("display", "block");
  $("#checkinfirefox1").html(translate("checkinfirefox_1"));
  $("#checkinfirefox2").html(translate("checkinfirefox_2"));
  $("#checkinfirefox").html(translate("checkinfirefoxtitle"));
  if (SAFARI) {
      $("#chrome1, #chrome2").html(translate("orchrome"));
      $("#adblockforchrome").html(translate("oradblockforchrome"));
  }
});

// STEP 5: also in Firefox

//If the user clicks a radio button
$("#step_firefox_yes").click(function() {
  $("#step_firefox").html("<span class='answer' chosen='yes'>" + translate("yes") + "</span>");
  if (/^mailto\:/.test(contact))
    contact = contact.replace(" at ", "@");
  var reportLink = "<a href='" + contact + "'>" + contact.replace(/^mailto\:/, '') + "</a>";
  $("#checkupdate").html(translate("reportfilterlistproblem", [reportLink]));
  $("#privacy").show();
});
$("#step_firefox_no").click(function() {
  $("#step_firefox").html("<span class='answer' chosen='no'>" + translate("no") + "</span>");
  if (SAFARI) {
    // Safari can't block video ads
    $("#step_flash_DIV").fadeIn().css("display", "block");
  } else {
    $("#checkupdate").html(translate("reporttous2"));
    $("a", "#checkupdate").attr("href", generateReportURL());
    $("#privacy").show();
  }
});
$("#step_firefox_wontcheck").click(function() {
  if (!SAFARI) {
    // Chrome blocking is good enough to assume the answer is 'yes'
    $("#step_firefox_yes").click();
  } else {
    // Safari can't do this.
    $("#checkupdate").text(translate("fixityourself"));
  }
  $("#step_firefox").html("<span class='answer' chosen='wont_check'>" + translate("refusetocheck") + "</span>");
});



// STEP 6: video/flash ad (Safari-only)

//If the user clicks a radio button
$("#step_flash_yes").click(function() {
  $("#step_flash").html("<span class='answer' chosen='yes'>" + translate("yes") + "</span>");
  $("#checkupdate").text(translate("cantblockflash"));
});
$("#step_flash_no").click(function() {
  $("#step_flash").html("<span class='answer' chosen='no'>" + translate("no") + "</span>");
  $("#checkupdate").html(translate("reporttous2"));
  $("a", "#checkupdate").attr("href", generateReportURL());
  $("#privacy").show();
});

checkupdates("adreport");
