// Saves options to chrome.storage
function save_options() {
  var respondentSelect = document.getElementById('respondent');
  var respondent = respondentSelect.options[respondentSelect.selectedIndex].value;
  
  chrome.storage.sync.set({
    respondent: respondent
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get('respondent', function(items) {
    document.getElementById('respondent').value = items.respondent || '';
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);