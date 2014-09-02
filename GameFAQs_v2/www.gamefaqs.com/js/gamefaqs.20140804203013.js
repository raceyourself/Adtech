function submit_login()
{
	if (!$('#login_email').val())
	{
		$('#login_email').effect('highlight', 1000);
		$('#login_email').focus();
		return false;
	}
	if (!$('#login_password').val())
	{
		$('#login_password').effect('highlight', 1000);
		$('#login_password').focus();
		return false;
	}
	return true;
}

function show_signup()
{
	if($(document).width() < 500)
		var box_width = "98%";
	else
		var box_width = "60%";
	$.ajax({
		type: 'GET',
        url: '/features/user_signup/pick.php',
        success: function(response)
		{
			if(response=='')
			{
				window.location = ('/user/register.html');
			}
			else
			{
				$('#site_dialog').html(response);
				$('#site_dialog').dialog({	resizable: false, dialogClass: "reg_dialog", closeText: "X", height: "auto", width: box_width, modal: true});
			}
        }

    });
    return false;
}
function show_login()
{
	if($(document).width() < 500)
		var box_width = "98%";
	else
		var box_width = "30%";
	$('#login_dialog').dialog({	resizable: false, dialogClass: "reg_dialog", closeText: "X", height: "auto", width: box_width, modal: true});
	return false;
}

function show_mygames_nouser_dialog()
{
	if($(document).width() < 500)
		var box_width = "98%";
	else
		var box_width = "30%";
	$('#mygames_nouser_dialog').dialog({resizable: false, dialogClass: "reg_dialog", closeText: "X", height: "auto", width: box_width, modal: true});
	return false;
}

function track_event(event_id)
{
	if(typeof omniture=='undefined' || !joparms)
		return;

	omniture.trackClickEvent(joparms, [event_id], 46, 'eventTrack');
}