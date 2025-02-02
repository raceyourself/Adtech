// Youtube-related code in this file based on code (c) Adblock Plus. GPLv3.
// See https://hg.adblockplus.org/adblockpluschrome/file/4db6db04271c/safari/include.youtube.js

var run_bandaids = function() {
  // Tests to determine whether a particular bandaid should be applied
  var apply_bandaid_for = "";
  if (/mail\.live\.com/.test(document.location.hostname))
    apply_bandaid_for = "hotmail";
  else if (SAFARI && /youtube/.test(document.location.hostname))
    apply_bandaid_for = "youtube_safari_only";
  else if (/getadblock\.com$/.test(document.location.hostname) &&
           window.top === window.self)
    apply_bandaid_for = "getadblock";
  else if (/mobilmania\.cz|zive\.cz|doupe\.cz|e15\.cz|sportrevue\.cz|autorevue\.cz/.test(document.location.hostname))
    apply_bandaid_for = "czech_sites";
  else if (/thepiratebay/.test(document.location.hostname))
    apply_bandaid_for = "the_pirate_bay_safari_only";
  else {
    var hosts = [ /mastertoons\.com$/ ];
    hosts = hosts.filter(function(host) { return host.test(document.location.hostname); });
    if (hosts.length > 0)
      apply_bandaid_for = "noblock";
  }

  var bandaids = {
    noblock: function() {
      var styles = document.querySelectorAll("style");
      var re = /#(\w+)\s*~\s*\*\s*{[^}]*display\s*:\s*none/;
      for (var i = 0; i < styles.length; i++) {
        var id = styles[i].innerText.match(re);
        if(id) {
          styles[i].innerText = '#' + id[1] + ' { display: none }';
        }
      }
    },
    hotmail: function() {
      //removing the space remaining in Hotmail/WLMail
      el = document.querySelector(".Unmanaged .WithSkyscraper #MainContent");
      if (el) {el.style.setProperty("margin-right", "1px", null);}
      el = document.querySelector(".Managed .WithSkyscraper #MainContent");
      if (el) {el.style.setProperty("right", "1px", null);}
      el = document.getElementById("SkyscraperContent");
      if (el) {
        el.style.setProperty("display", "none", null);
        el.style.setProperty("position", "absolute", null);
        el.style.setProperty("right", "0px", null);
      }
    },
    getadblock: function() {
      BGcall('get_adblock_user_id', function(adblock_user_id) {
        var elemDiv = document.createElement("div");
        elemDiv.id = "adblock_user_id";
        elemDiv.innerText = adblock_user_id;
        elemDiv.style.display = "none";
        document.body.appendChild(elemDiv);
      });
      BGcall('get_first_run', function(first_run) {
        var elemDiv = document.createElement("div");
        elemDiv.id = "adblock_first_run_id";
        elemDiv.innerText = first_run;
        elemDiv.style.display = "none";
        document.body.appendChild(elemDiv);
      });
      BGcall('set_first_run_to_false', null);
    },
    youtube_safari_only: function() {
        // Remove ad container & ad progress, so user won't notice removal of ads
        var adcontainer = document.querySelector(".video-ads");
        adcontainer.parentNode.removeChild(adcontainer);
        var adprogress = document.querySelector(".html5-ad-progress-list");
        adprogress.parentNode.removeChild(adprogress);
        
        // Disable some attributes in ytplayer object to disable ads in HTML5 video player
        var elemScript = document.createElement("script");
        elemScript.textContent = 
         "var ytp = ytplayer['config']['args']; ytplayer['config'].loaded = false; ytp.ad3_module = 0;" + 
         "ytp.ad_channel_code_instream = 0; ytp.ad_channel_code_overlay = 0; ytp.ad_device = 0; ytp.ad_eurl = 0;" +
         "ytp.ad_host = 0; ytp.ad_host_tier = 0; ytp.ad_logging_flag = 0; ytp.ad_preroll = 0; ytp.ad_slots = 0;" +
         "ytp.ad_tag = 0; ytp.ad_video_pub_id = 0; ytp.adsense_video_doc_id = 0; ytp.advideo = 0; ytp.afv = 0;" +
         "ytp.afv_ad_tag = 0; ytp.afv_ad_tag_restricted_to_instream = 0; ytp.afv_instream_max = 0; ytp.allowed_ads = 0;" +
         "ytp.afv_video_min_cpm = 0; ytp.allow_html5_ads = 0; ytp.excluded_ad = 0; ytp.dynamic_allocation_ad_tag = 0;";
        document.body.appendChild(elemScript);
        document.body.removeChild(elemScript);
    },
    czech_sites: function() {
      var player = document.getElementsByClassName("flowplayer");
      // Remove data-ad attribute from videoplayer
      if (player) {
        for (var i=0; i<player.length; i++)
          player[i].removeAttribute("data-ad");
      }
    },
    the_pirate_bay_safari_only: function() {
      // Set cookie to prevent pop-ups from The Pirate Bay
      document.cookie="tpbpop=1%7CSun%2C%2030%20Aug%202024%2006%3A21%3A49%20GMT; expires=Thu, 30 Aug 2034 12:00:00 GMT; path=/;";
    },
  }; // end bandaids

  if (apply_bandaid_for) {
    log("Running bandaid for " + apply_bandaid_for);
    bandaids[apply_bandaid_for]();
  }

};


var before_ready_bandaids = function() {
  // Tests to determine whether a particular bandaid should be applied
  var apply_bandaid_for = "";
  if (/youtube/.test(document.location.hostname))
    apply_bandaid_for = "youtube_only";


  var bandaids = {
    youtube_only: function() {
        // If history.pushState is available,
        // YouTube uses it when navigating from one video
        // to another and tells the HTML5 player via JavaScript,
        // which ads to show next bypassing ytplayer object rewrite code.
        // Disabling history.pushState on pages with YouTube's HTML5 player
        // will force YouTube to not use history.pushState
        var elemScript = document.createElement("script");
        elemScript.textContent = "History.prototype.pushState = undefined;";
        document.documentElement.appendChild(elemScript);
        document.documentElement.removeChild(elemScript);
    }
  }; // end bandaids

  if (apply_bandaid_for) {
    log("Running early bandaid for " + apply_bandaid_for);
    bandaids[apply_bandaid_for]();
  }

};
