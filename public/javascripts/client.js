var userSelf = {};
var toOneId;

//connection to host and port
var socket = io();


////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Socket communication with server..
////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Server send user list when new user connected, or a user disconnected..
socket.on('userList', function(userList){
	//modify user count
	//modifyUserCount(userList.length);
	addUser(userList);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// User receive its user information from server..
socket.on('userInfo',function(userObj){
    /*
    userObj = {
        id : user.id,
        username : gotuser.local.username,
        email : gotuser.local.email,
        password : gotuser.local.password,
        contacts : gotuser.local.contacts,
        img : user.img
    }
    */

    //should be use cookie or session
	userSelf = userObj;
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Message from system..
socket.on('sysInfo',function(msg){
	addMsgFromSys(msg);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive message from users, determine it from whom..
socket.on('toAll',function(msgObj){
	addMsgFromUser(msgObj, false);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive message from users, determine it from whom..
socket.on('toOne',function(msgObj){
    /*
     msgObj format:{
         from:{
             id : user.id,
             username : gotuser.local.username,
             email : gotuser.local.email,
             password : gotuser.local.password,
             contacts : gotuser.local.contacts,
             img : user.img
         },
         to:"",  //  socket id
         msg:""
     }
     */

	Messenger().post({
		message: "<a href=\"javascript:showSetMsgToOne(\'" + msgObj.from.username + "\',\'" + msgObj.from.id + "\');\">Message from " + msgObj.from.username + " : "+ msgObj.msg+"</a>",
		showCloseButton: true
	});
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive image and add..
socket.on('imageToALL', function(msgObj){
	addImgFromUser(msgObj, false);
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive invite result for error..
socket.on('inviteErr', function(msgObj){
    var status = '<label id="inviteStatus" style="float:left;">Invite failed! ' + msgObj + '</label>';
    $('#inviteStatus').html('');
    $('#inviteStatus').append(status);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive invite result for success..
socket.on('inviteResponse', function(msgObj){
    var status = '<label id="inviteStatus" style="float:left;">Invite sent! ' + msgObj + '</label>';
    $('#inviteStatus').html('');
    $('#inviteStatus').append(status);
    $('#inviteModel').modal('hide');
    $('#inviteEmail').val('');
    $('#inviteStatus').val('');
    $.scojs_message("Invite successfully sent!", $.scojs_message.TYPE_OK);
});



//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////
// Functions of form..
//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////
$(function(){

	//////////////////////////////////////////////////////////////////////////////////////
	// First boot, send login information to the others : server -> socket.on('login')
	//////////////////////////////////////////////////////////////////////////////////////
	var userObj = {
		name : $('#regname').val(),
		email : $('#usermail').val(),
		img : "/images/1.jpg"
	}
	socket.emit("login", userObj);
	//////////////////////////////////////////////////////////////////////////////////////



	//////////////////////////////////////////////////////////////////////////////////////
	// Actions for UI events..
	//////////////////////////////////////////////////////////////////////////////////////
	// Send typed message to all users..
	$('#sendMsg').click(function(){
		var msg = $('#msg').val();
    	if(msg==''){
      		alert('Please enter the message content!');
      		return;
    	}

    	var sender = userSelf;
    	var msgObj = {
      		from : sender,
      		msg : msg
    	};
    	socket.emit('toAll', msgObj);
    	addMsgFromUser(msgObj, true);
    	$('#msg').val('');
  	});

	//////////////////////////////////////////////////////////////////////////////////////
	// Send request to the server for inviting mail to specified..
	$('#sendInvite').click(function(){
		$('#inviteModel').modal();
	});

	//////////////////////////////////////////////////////////////////////////////////////
	// Send invite to a friend..
	$('#btnInvite').click(function() {
		var mailInvite = $('#inviteEmail').val();
		if (mailInvite == '') {
			return;
		}

		var mailInfo = {
			from: userSelf.email,
            password : userSelf.password,
			to: mailInvite
		};


		var status = '<label id="inviteStatus" style="float:left;">Waiting for response...</label>';
        $('#inviteStatus').html('');
        $('#inviteStatus').append(status);
		socket.emit('invite', mailInfo);
	});

    //////////////////////////////////////////////////////////////////////////////////////
	// Send image to all other users..
    $('#sendImage').change(function(){
        if(this.files.length != 0){
            var file = this.files[0];
            reader = new FileReader();
            if(!reader){
                alert("Your browser doesn\'t support fileReader!");
                return;
            }
            reader.onload = function(e){
                //console.log(e.target.result);
                var msgObj = {
                    from:userSelf,
                    img:e.target.result
                };
                socket.emit('imageToALL', msgObj);
                addImgFromUser(msgObj,true);
            };
            reader.readAsDataURL(file);
        }
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // Send a message to specified user..
    $('#btn_toOne').click(function(){
        var msg = $('#input_msgToOne').val();
        if(msg==''){
            alert('Please enter the message content!');
            return;
        }
        var msgObj = {
            from : userSelf,
            to : toOneId,
            msg : msg
        };

        socket.emit('toOne', msgObj);
        $('#setMsgToOne').modal('hide');
        $('#input_msgToOne').val('');
    })
});

//add message in UI
function addImgFromUser(msgObj,isSelf){
	var msgType = isSelf?"message-reply":"message-receive";
	var msgHtml = $('<div><div class="message-info"><div class="user-info"><img src="/images/1.jpg" class="user-avatar img-thumbnail"></div><div class="message-content-box"><div class="arrow"></div><div class="message-content">test</div></div></div></div>');
	msgHtml.addClass(msgType);
	msgHtml.children('.message-info').children('.user-info').children('.user-avatar').attr('src',msgObj.from.img);
	msgHtml.children('.message-info').children('.user-info').children('.user-avatar').attr('title',msgObj.from.name);
	msgHtml.children('.message-info').children('.message-content-box').children('.message-content').html("<img src='"+msgObj.img+"'>");
	$('.msg-content').append(msgHtml);
	//滚动条一直在最底
	$(".msg-content").scrollTop($(".msg-content")[0].scrollHeight);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add received message in UI..
function addMsgFromUser(msgObj, isSelf){
	var msgType = isSelf ? "message-reply" : "message-receive";
	var msgHtml = $('<div><div class="message-info"><div class="user-info"><img src="/images/1.jpg" class="user-avatar img-thumbnail"></div><div class="message-content-box"><div class="arrow"></div><div class="message-content">test</div></div></div></div>');
	msgHtml.addClass(msgType);
	msgHtml.children('.message-info').children('.user-info').children('.user-avatar').attr('src',msgObj.from.img);
	msgHtml.children('.message-info').children('.user-info').children('.user-avatar').attr('title',msgObj.from.name);
	msgHtml.children('.message-info').children('.message-content-box').children('.message-content').text(msgObj.msg);
	$('.msg-content').append(msgHtml);
	// Scroll to the bottom..
	$(".msg-content").scrollTop($(".msg-content")[0].scrollHeight);
}

//add msg from system in UI
function addMsgFromSys(msg){
	$.scojs_message(msg, $.scojs_message.TYPE_OK);
}

//check is the username exist.
function checkUser(name){
	var haveName = false;
	$(".user-content").children('ul').children('li').each(function(){
		if(name == $(this).find('span').text()){
			haveName = true;
		}
	});
	return haveName;
}

function showSetMsgToOne(name, id){
	$('#myModalLabel1').text("To : " + name);
	toOneId = id;
    $('#setMsgToOne').modal();
}

// Add a user in user list UI..
function addUser(userList){
	var parentUl = $('.user-content').children('ul');
	var cloneSample = parentUl.children('li:first').clone();
	parentUl.html('');

	for(var i in userList){
		var cloneLi = cloneSample.clone();
		cloneLi.children('a').attr('href', "javascript:showSetMsgToOne('" + userList[i].name + "','" + userList[i].id + "');");
		cloneLi.children('a').children('img').attr('src', userList[i].img);
		cloneLi.children('a').children('span').text(userList[i].name);
		cloneLi.show();
		parentUl.append(cloneLi);
	}
}

//send message enter function
function keywordsMsg(e){
	var event1 = e || window.event;
	if(event1.keyCode == 13){
		$('#sendMsg').click();
	}
}

//set name enter function
function keywordsName(e){
	var event1 = e || window.event;
	if(event1.keyCode == 13){
		$('#btn-setName').click();
	}
}
//send to one enter function
function keywordsName1(e){
	var event1 = e || window.event;
	if(event1.keyCode == 13){
		$('#btn_toOne').click();
	}
}