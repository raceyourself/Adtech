<?php
header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
?>
<html>
<head>
<title>Demo ads</title>
<script type="text/javascript">
  var googletag = googletag || {};
  googletag.cmd = googletag.cmd || [];
  (function() {
    var gads = document.createElement("script");
    gads.async = true;
    gads.type = "text/javascript";
    var useSSL = "https:" == document.location.protocol;
    gads.src = (useSSL ? "https:" : "http:") + "//www.googletagservices.com/tag/js/gpt.js";
    var node =document.getElementsByTagName("script")[0];
    node.parentNode.insertBefore(gads, node);
   })();
</script>
<script type="text/javascript">
    googletag.cmd.push(function() {
      var adSlot1 = googletag.defineSlot('/6355419/Travel/Europe/France/Paris',[300, 250], "banner1");
      adSlot1.setTargeting("pos", ["atf"]);
      adSlot1.addService(googletag.pubads());
      var adSlot2 = googletag.defineSlot('/6355419/Travel', [728, 90], "banner2").setTargeting("test","infinitescroll");
      adSlot2.setTargeting("position", ["bottom"]);
      adSlot2.addService(googletag.pubads());
      googletag.pubads().setTargeting("articletopic","basketball"); // adds custom targeting that applies to the entire page - i.e. all the slots on the page.
      googletag.enableServices();
    });
  </script>
</head>
<body>
<center id="container">
Ad 1:
<div id="banner1" style="width:300px; height:250px; background-color: black">
      <script type="text/javascript">
        googletag.cmd.push(function() { googletag.display('banner1'); });
      </script>
    </div>
<h3>Content header</h3>
Content image:
<div id="banner3" style="width:400px; height:276px; background-color: black">
</div>
<p>Lorem ipsum</p>
Ad 2:
<div id="banner2" style="width:728px; height:90px; background-color: black">
      <script type="text/javascript">
        googletag.cmd.push(function() { googletag.display('banner2'); });
      </script>
    </div>
</center>
<?php
require_once('obfuscator.php');
echo "<script src='" . obfuscate("blackbox/ad1.js.php") . "'></script>";
echo "<script src='" . obfuscate("blackbox/ad2.js.php") . "'></script>";
echo "<script src='" . obfuscate("js/real.js.php") . "'></script>";
echo "<script src='" . obfuscate("blackbox/adblockblock.js") . "'></script>";
?>
</body>
</html>
