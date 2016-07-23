////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Variables..
////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Own information..
var userSelf = {};
// User information that is discussing to this user..
var userConv = {};
// Converting user socket ID..
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
	/* msg : 'username' connected!*/
	addMsgFromSys(msg);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive message from users, determine it from whom..
socket.on('toAll',function(msgObj){
	/*
	 format:{
		 from:{
			 name:"",
			 img:"",
			 id:""
		 },
		 msg:""
	 }
	 */
	addMsgFromUser(msgObj, false);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive message from users, determine it from whom..
socket.on('msgToOne',function(msgObj){
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
    addMsgFromUser(msgObj, false);

	// Messenger().post({
	// 	message: "<a href=\"javascript:showSetMsgToOne(\'" + msgObj.from.username + "\',\'" + msgObj.from.id + "\');\">Message from " + msgObj.from.username + " : "+ msgObj.msg+"</a>",
	// 	showCloseButton: true
	// });
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive image and add..
socket.on('imgToOne', function(msgObj){
	/*
	 format:{
         from : {
             username : username,
             email : email,
             password : password,
             contacts : contacts
             id : socket id
         }
         img : e.target.result,
         to : receiver.id,
	 }
	 */
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
    $('#inviteStatus').html('');
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
		img : "/images/man.png"
	}
	alert('Login');
	socket.emit('login', userObj);
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

    	// Create data to send..
        var msgObj = {
            from : userSelf,
            to : userConv.id,
            msg : msg
        };
        // Send data..
        sendMessage(msg, msgObj);

        // Show sent message to display..
    	addMsgFromUser(msgObj, true);
		$('#msg').val('');
		$('#msg').html('');
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
            // Read file..
            var file = this.files[0];
            reader = new FileReader();
            if(!reader){
                alert("Your browser doesn\'t support fileReader!");
                return;
            }
            reader.onload = function(e){
                var msgObj = {
                    from : userSelf,
                    img : e.target.result,
                    to : userConv.id
                };
                // Send file to the user..
                sendImage(msgObj);
                // Add to the dialog list..
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



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Actions for add messages to the UI..
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add a user in user list UI..
function addUser(userList){
    var parentUl = $('.user-content').children('ul');
    var cloneSample = parentUl.children('li:first').clone();
    parentUl.html('');

    // alert(cloneSample);

    for(var i in userList){
        var cloneLi = cloneSample.clone();
        cloneLi.attr('id', userList[i].email);
        cloneLi.children('div').attr('onclick', "javascript:selectUser('" + userList[i].name + "','" + userList[i].email + "','" + userList[i].id + "');");
        cloneLi.children('div').children('img').attr('src', userList[i].img);
        cloneLi.children('div').children('span').text(userList[i].email);
        cloneLi.show();
        parentUl.append(cloneLi);
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add sent/received message in UI..
function addMsgFromUser(msgObj, isSelf){
    // Create message according type..
    var msgType = isSelf ? "message-reply" : "message-receive";
    var msgHtml = $('<div><div class="message-info"><div class="user-info"><img src="/images/1.jpg" class="user-avatar img-thumbnail"></div><div class="message-content-box"><div class="arrow"></div><div class="message-username">TEST1</div><div class="message-content">test</div><div class="message-time">13:01 22/7/2016</div></div></div></div>');

    // Get current time stamp..
    var timeStamp = getTimeStamp();
    var msgContent = msgObj.msg.replace(/\n/g, '<br>');

    // Add values to the elements..
    msgHtml.addClass(msgType);
    msgHtml.children('.message-info').children('.user-info').children('.user-avatar').attr('src',msgObj.from.img);
    msgHtml.children('.message-info').children('.user-info').children('.user-avatar').attr('title',msgObj.from.username);
    msgHtml.children('.message-info').children('.message-content-box').children('.message-content').html(msgContent);
    msgHtml.children('.message-info').children('.message-content-box').children('.message-username').text(msgObj.from.username + " say:");
    msgHtml.children('.message-info').children('.message-content-box').children('.message-time').text(timeStamp);
    $('.msg-content').append(msgHtml);

    // Scroll to the bottom..
    $(".msg-content").scrollTop($(".msg-content")[0].scrollHeight);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add sent/received image to UI..
function addImgFromUser(msgObj, isSelf){
	var msgType = isSelf?"message-reply":"message-receive";
	// var msgHtml = $('<div><div class="message-info"><div class="user-info"><img src="/images/1.jpg" class="user-avatar img-thumbnail"></div><div class="message-content-box"><div class="arrow"></div><div class="message-content">test</div></div></div></div>');
    var msgHtml = $('<div><div class="message-info"><div class="user-info"><img src="/images/1.jpg" class="user-avatar img-thumbnail"></div><div class="message-content-box"><div class="arrow"></div><div class="message-username">TEST1</div><div class="message-content">test</div><div class="message-time">13:01 22/7/2016</div></div></div></div>');
    var timeStamp = getTimeStamp();
	msgHtml.addClass(msgType);
	msgHtml.children('.message-info').children('.user-info').children('.user-avatar').attr('src',msgObj.from.img);
	msgHtml.children('.message-info').children('.user-info').children('.user-avatar').attr('title',msgObj.from.username);
	msgHtml.children('.message-info').children('.message-content-box').children('.message-content').html("<img src='"+msgObj.img+"'>");
    msgHtml.children('.message-info').children('.message-content-box').children('.message-username').text(msgObj.from.username + " say:");
    msgHtml.children('.message-info').children('.message-content-box').children('.message-time').text(timeStamp);
	$('.msg-content').append(msgHtml);
	$(".msg-content").scrollTop($(".msg-content")[0].scrollHeight);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add message from system in UI
function addMsgFromSys(msg){
	$.scojs_message(msg, $.scojs_message.TYPE_OK);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Show message box to one..
function showSetMsgToOne(name, email, id){
    var parentUl = $('.user-content').children('ul');
    var items = parentUl.children('li');
    var item = items.get(0);

    for(var i = 0; i < items.length; i++) {
        item = items.get(i);
        if(item.id == email) {
            // alert(item);
            item.setAttribute("style", "background-color: #d9edf7;");
        }
        else {
            item.setAttribute("style", "");
        }
    }

    var newUser = {
        username : name,
        email : email,
        id : id
    }
    userConv = newUser;

    // Show send message dialog..
    // $('#myModalLabel1').text("To : " + name);
    // toOneId = id;
    // $('#setMsgToOne').modal();
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Actions for selecting and sending message to user..
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for selecting new user to chat with..
function selectUser(name, email, id){
    var parentUl = $('.user-content').children('ul');
    var items = parentUl.children('li');
    var item = items.get(0);

    // Set user to select..
    for(var i = 0; i < items.length; i++) {
        item = items.get(i);
        if(item.id == email) {
            item.setAttribute("style", "background-color: #d9edf7;");
        }
        else {
            item.setAttribute("style", "");
        }
    }

    var newUser = {
        username : name,
        email : email,
        id : id
    }

    userConv = newUser;
    // toOneId = id;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send message enter function..
function keywordsMsg(e){
	var event1 = e || window.event;
	if(event1.keyCode == 10){
		$('#sendMsg').click();
        e.preventDefault();
	}
    return false;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send message to all persons..
function sendMsgToAll(sender, receiver) {
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send message to all persons in group..
function sendMsgToAll() {
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send image to one person..
function sendImage(msgObj) {
    /*
    var msgObj = {
        from : {
            username : username,
            email : email,
            password : password,
            contacts : contacts
            id : socket id
        }
        img : e.target.result,
        to : sender.id,
    };
     */

    socket.emit('imgToOne', msgObj);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send message to one person..
function sendMessage(msg, msgObj) {
    /*
     var msgObj = {
         from : {
             username : username,
             email : email,
             password : password,
             contacts : contacts
             id : socket id
         }
         to : sender.id,
         msg : msg
     };
     */

    socket.emit('msgToOne', msgObj);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Actions for others(key event, ..)
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//set name enter function
function keywordsName(e){
	var event1 = e || window.event;
	if(event1.keyCode == 13){
		$('#btn-setName').click();
	}
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//send to one enter function
function keywordsName1(e){
	var event1 = e || window.event;
	if(event1.keyCode == 13){
		$('#btn_toOne').click();
	}
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Get current time stamp..
function getTimeStamp() {
	var date = new Date();

	var hour = date.getHours();
	hour = (hour < 10 ? "0" : "") + hour;

	var min  = date.getMinutes();
	min = (min < 10 ? "0" : "") + min;

	var sec  = date.getSeconds();
	sec = (sec < 10 ? "0" : "") + sec;

	var year = date.getFullYear();

	var month = date.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;

	var day  = date.getDate();
	day = (day < 10 ? "0" : "") + day;

	return hour + ":" + min + ":" + sec + "  " + day + "/" + month + "/" + year;
}
