////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Variables..
////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Own information..
var userSelf = {};
// userSelf = {
//     id : user.id,
//     username : "",
//     email : "",
//     password : "",
//     contacts : [], same as userFounded..
//     img : ""
// }

// Flag Send a mail to concierge..
var noticeFlag = false;
// Flag of set user from a contact list..
var selectFlag = "ONE";
// Flag of search bar status, used in window resizing..
var searchFlag = false;
// Flag of info bar hide/show status..
var infoVisibleFlag = false;


// Group information that selected from a contact list..
var grpSelected = {};
// grpSelected = {
//     grpID : group id,
//     grpName : group name,
//     grpUsers : group users,
//     img : img
// };

// User information that is selected from the contact list or search list..
var userSelected = {};
// userSelected = {
//     id : id
//     username : name,
//     email : email,
//     img : img
// };

// Selected index in user list..
var selectedIndex = -1;

// List of selected users in now creating chat group..
var grpChatInfo = {};

// List of groups this user have..
var grpList = [];

// List of contact to this user..
var contactList = [];
// contactList: {
//     state: userState,
//     username: oneUser.username,
//     email: oneUser.email
//     img: image
// }

// List of search to this user..
var searchList = [];
// searchList: {
//     local {
//          id : user.id,
//          username : "",
//          email : "",
//          password : "",
//          contacts : [], same as userFounded..
//          img : ""
//     }
// }

// List of connect status list according to the contact list..
var connectedUserList = [];
var updateFlag = 0;

// Converting user socket ID..
var toOneId;

//connection to host and port
var socket = io();



// Varaibles for chat bot..
var count = 0, firstChoice;




////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Socket communication with server..
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Server send user list when new user connected, or a user disconnected..
socket.on('connectedList', function(statusList){
    connectedUserList = statusList;
    updateFlag++;
    if(updateFlag == 2) {
        updateFlag = 0;
    }
    refreshContactList(contactList);
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
    contactList = userObj.contacts;
    grpList = userObj.grp_contacts;
    showSelfInfo(userSelf);

    updateFlag++;
    if(updateFlag == 2) {
        refreshContactList(contactList);
        updateFlag = 0;
    }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Server send user list when new user connected, or a user disconnected..
socket.on('contactList', function(refreshedList){
    contactList = refreshedList;
    refreshContactList(contactList);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Message from system..
socket.on('sysInfo',function(msg){
	/* msg : 'username' connected!*/
	addMsgFromSys(msg);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive message from users, determine it from whom..
socket.on('msgToOne',function(msgObj){
    /*
    msgObj format:{
         type: "BOT" / "ONE" / "GRP",
         from: ""  // email of sender,
         to: "",    // email of receiver..
         msg: ""
    }
    */

    if(msgObj.type == "BOT") {
        outConsole("Message from Bot", msgObj);
        processBOTMsg(msgObj);
    }
    else{
        addMsgFromUser(msgObj, false);
    }
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive image and add..
socket.on('imgToOne', function(msgObj){
	/*
	 format:{
         from : userSelf.email,
         to : receiver.email,
         img : e.target.result
	 }
	 */

	addImgFromUser(msgObj, false);
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive invite result for error..
socket.on('inviteErr', function(msgObj){
    var status = '<label id="inviteStatus" style="float:left;">Invite failed! ' + msgObj + '</label>';
    var inviteStatus = $('#inviteStatus');
    inviteStatus.html('');
    inviteStatus.append(status);
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive invite result for success..
socket.on('inviteResponse', function(msgObj){
    var status = '<label id="inviteStatus" style="float:left;">Invite sent! ' + msgObj + '</label>';
    var inviteStatus = $('#inviteStatus');
    inviteStatus.html('');
    inviteStatus.append(status);
    //noinspection JSUnresolvedFunction
    $('#inviteModel').modal('hide');
    $('#inviteEmail').val('');
    inviteStatus.html('');
    $.scojs_message("Invite successfully sent!", $.scojs_message.TYPE_OK);
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive search result for success..
socket.on('searchResult', function(msgObj){
    searchList = msgObj;
    refreshSearchList(searchList);
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive add contact result, show alert to the user..
socket.on('addConvGrp', function(msgObj){
    var msg;
    if(msgObj.result == "Success") {
        msg = "New group added to your contact!";
        userSelf.grp_contacts = msgObj.data;
        grpList = userSelf.grp_contacts;
        refreshContactList(contactList);
    }
    else {
        msg = "Failed to add new group to your contact!";
    }

    $.scojs_message(msg, $.scojs_message.TYPE_OK);
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive add contact result, show alert to the user..
socket.on('removeConvGrp', function(msgObj){
    var msg;
    if(msgObj.result == "Success") {
        msg = "Group removed from your contact!";
        userSelf.grp_contacts = msgObj.data;
        grpList = userSelf.grp_contacts;
        refreshContactList(contactList);
    }
    else {
        msg = "Failed to remove group from your contact!";
    }

    $.scojs_message(msg, $.scojs_message.TYPE_OK);
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive add contact result, show alert to the user..
socket.on('addToContact', function(msgObj){
    var msg;
    if(msgObj.result == "Success") {
        msg = "Added to your contact!";
        userSelf.contacts = msgObj.data;
        contactList = userSelf.contacts;
        refreshContactList(contactList);
        showUserInfo(userSelected);
    }
    else {
        msg = "Failed to add to your contact!";
    }

    // updateFlag = 1;
    // //noinspection JSUnresolvedFunction
    // socket.emit("refreshInfo", userSelf);

    $.scojs_message(msg, $.scojs_message.TYPE_OK);
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive add contact result, show alert to the user..
socket.on('removeFromContact', function(msgObj){
    var msg;
    if(msgObj.result == "Success") {
        msg = "Reomved from your contact!";
        userSelf.contacts = msgObj.data;
        contactList = userSelf.contacts;
        refreshContactList(contactList);
    }
    else {
        msg = "Failed to remove from your contact!";
    }

    // updateFlag = 1;
    // //noinspection JSUnresolvedFunction
    // socket.emit("refreshInfo", userSelf);

    $.scojs_message(msg, $.scojs_message.TYPE_OK);
});




//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////
// Functions of form..
//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////
// Resize windows..
function autoResizeDiv()
{
    var curHeight = $(window).height() - 50;

    if(curHeight < 100)
        return;

    $('.panel-msgboxbody').height(curHeight + 50);
    var newHeight = curHeight - $('.panel-heading').height();
    var searchHeight = 0;
    if(searchFlag == true) {
        searchHeight = 31;
    }
    outConsole("Height", newHeight - searchHeight);

    // user list content body..
    $('.panel-body').height(newHeight);
    $('.user-content').height(newHeight + 30);
    // User info content body..
    $('.panel-infobody').height(newHeight + 30);

    newHeight -= $('.panel-footer').height() + 45;
    // Message info content body..
    $('.msg-content').height(newHeight - 30 + searchHeight);
    $('.panel-msgbody').height(newHeight + searchHeight);

    // User info content body..
    $('#panel-userinfodiv').height(newHeight + searchHeight);
}

$(function(){
    $(window).resize(autoResizeDiv);
    autoResizeDiv();

	//////////////////////////////////////////////////////////////////////////////////////
	// First boot, send login information to the others : server -> socket.on('login')
	//////////////////////////////////////////////////////////////////////////////////////
	var userObj = {
        username : $('#regname').val(),
		email : $('#usermail').val(),
		img : "/images/man.png"
	};

	socket.emit('login', userObj);

    // Set the name of this user to the main title..
    $('#span-mainTitle').text("Welcome to the chat!");
    // Hide other info bar..
    $('#panel-userinfo').fadeOut(1);
    //////////////////////////////////////////////////////////////////////////////////////



	//////////////////////////////////////////////////////////////////////////////////////
	// Actions for UI events..
    //////////////////////////////////////////////////////////////////////////////////////
    // Search user..
    $('#btn-searchPerson').click(function(){
        var msg = $('#input-searchPerson').val();
        if(msg==''){
            refreshContactList(contactList);
            return;
        }
        var msgObj = {
            from : {
                username : userSelf.username,
                email : userSelf.email,
                password : userSelf.password
            },
            content : msg
        };

        socket.emit('searchPerson', msgObj);
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // Show my contact list..
    $('#btn-myContactList').click(function(){
        refreshContactList(contactList);
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // Send request to the server for inviting mail to specified..
    $('#sendInvite').click(function(){
        $('#inviteModel').modal();
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // Send invite to a friend..
    $('#btn-inviteUser').click(function() {
        var mailInvite = $('#input-inviteEmail').val();
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
    // Show add group ..
    $('#btn-addGrpConv').click(function(){
        var parentUl = $('.grp-content').children('ul');
        var cloneSample = $("<li id='test2@outlook.com' style='display: list-item;'>" +
                                "<div class='user' onclick='javascript:selectUserFromList(\'Test2\',\'test2@outlook.com\',\'YCTtcy7gs9HT0mtqAAAB\');'>" +
                                    "<div class='avatar'>" +
                                        "<img src='/images/man.png'>" +
                                        "<div class='status offline'></div></div>" +
                                    "<div class='name'>Name</div></div></li>");

        parentUl.html('');

        for(var i in contactList){
            var cloneLi = cloneSample.clone();
            cloneLi.attr('id', contactList[i].email);
            cloneLi.attr('hiddenValue', 'DSEL');
            cloneLi.children('div').attr('onclick', "javascript:selectUserFromGroupList('" + contactList[i].username + "','" + contactList[i].email + "','" + contactList[i].id + "', 'CONTACT');");
            cloneLi.children('div').children('div:first').children('img').attr('src', contactList[i].img);

            var connectStatus = "";
            var connectedUser = connectedUserList.find(function(oneUser) {
                return oneUser.email === contactList[i].email;
            });
            if(connectedUser) {
                connectStatus = "online";
            }
            else {
                connectStatus = "offline";
            }

            if(contactList[i].state == "CONTACTED") {
                state = "status contacted-";
            }
            else {
                continue;
            }

            cloneLi.children('div').children('div:first').children('div').attr('class', state + connectStatus);
            cloneLi.children('div').children('div:last').text(contactList[i].username + "(" + contactList[i].email + ")");

            parentUl.append(cloneLi);
        }

        var newID = (new Date()).getTime();

        grpChatInfo = {
            grpID: userSelf.email + newID,
            grpName: "",
            grpUsers: []
        };

        var userMine = {
            username: userSelf.username,
            email: userSelf.email,
            img: userSelf.img
        };

        grpChatInfo.grpUsers.push(userMine);

        $('#addGroupModel').modal();
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // Add to contact..
    $('#btn-AddGrp').click(function(){
        // Add group contact to the list..
        /*
         format:{
             grpID: group ID,
             grpUsers: [
                 oneUser: {
                    username: user name,
                    email: email
                }
            ]
         }
         */
        var grpName = $('#input-grpName').val();
        if(grpName == "") {
            grpName = "undefined Name";
        }
        grpChatInfo.grpName = grpName;
        socket.emit("addConvGrp", grpChatInfo);

        $('#addGroupModel').modal('hide');
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // Add to contact..
    $('#btn-CancelGrp').click(function(){
        grpChatInfo = {};
        $('#addGroupModel').modal('hide');
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // Add to contact..
    $('#btn-addToContact').click(function(){
        addToContact(userSelected);
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // Remove from contact..
    $('#btn-removeFromContact').click(function(){
        removeFromContact(userSelected);
    });

    //////////////////////////////////////////////////////////////////////////////////////
	// Send typed message to all users..
	$('#sendMsg').click(function(){
		var msg = $('#msg');

    	if(msg.val()==''){
      		alert('Please enter the message content!');
      		return;
    	}

        var msgObj = {};

        if(selectFlag == "CON") {
            if(!noticeFlag) {
                noticeFlag = true;
                var dataObj = {
                    from: {
                        email: userSelf.email,
                        username: userSelf.username
                    }
                };

                socket.emit('notice', dataObj);
            }

            msgObj = {
                type : "ONE",
                from : userSelf.email,
                to : "Concierge",
                msg : msg.val()
            };

        }
    	if(selectFlag == "BOT") {
            // // Create data to send..
            // var msgObj = {
            //     type : "BOT",
            //     from : userSelf.email,
            //     to : "BOT",
            //     msg : msg.val()
            // };
            //
            // // Send data..
            // sendMessage(msgObj);
            processMsgForBOT(msg.val());
            msg.val('');
            msg.html('');
            return;
        }
    	if(selectFlag == "ONE") {
            // Create data to send..
            msgObj = {
                type : "ONE",
                from : userSelf.email,
                to : userSelected.email,
                msg : msg.val()
            };
            // Send data..
            sendMessage(msgObj);
        }
        else if(selectFlag == "GRP") {
            for(var i in grpSelected.grpUsers) {
                if(grpSelected.grpUsers[i].email == userSelf.email)
                    continue;

                msgObj = {
                    type : "GRP",
                    grpID : grpSelected.grpID,
                    from : userSelf.email,
                    to : grpSelected.grpUsers[i].email,
                    msg : msg.val()
                };
                // Send data..
                sendMessage(msgObj);
            }
        }

        // Show sent message to display..
        addMsgFromUser(msgObj, true);
    	// addMsgFromUser(msgObj, false);
		msg.val('');
		msg.html('');
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
                if(selectFlag == "ONE") {
                    // Create data to send..
                    var msgObj = {
                        type : "ONE",
                        from : userSelf.email,
                        to : userSelected.email,
                        img : e.target.result
                    };
                    // Send data..
                    sendImage(msgObj);
                }
                else if(selectFlag == "GRP") {
                    for(var i in grpSelected.grpUsers) {
                        if(grpSelected.grpUsers[i].email == userSelf.email)
                            continue;

                        var msgObj = {
                            type : "GRP",
                            grpID : grpSelected.grpID,
                            from : userSelf.email,
                            to : grpSelected.grpUsers[i].email,
                            img : e.target.result
                        };
                        // Send data..
                        sendImage(msgObj);
                    }
                }

                // Add to the dialog list..
                addImgFromUser(msgObj,true);
                // addImgFromUser(msgObj, false);
            };
            reader.readAsDataURL(file);
        }
    });


    //////////////////////////////////////////////////////////////////////////////////////
    // Send file to all other users..
    $('#sendFile').on('change', function(){
        var files = $(this).get(0).files;

        outConsole("File size", files[0].size / 1024 / 1024);
        var maxSize = 25 * 1024 * 1024;
        if(files[0].size > maxSize) {
            alert("Maximum file size is 25MB!");
            return;
        }

        if (files.length > 0){
            // create a FormData object which will be sent as the data payload in the
            // AJAX request
            var formData = new FormData();

            // loop through all the selected files and add them to the formData object
            for (var i = 0; i < files.length; i++) {
                var file = files[i];

                // add the files to formData object for the data payload
                formData.append('uploads[]', file, file.name);
            }

            // show progress panel..
            $('#progress-panel').attr('style', '');

            $.ajax({
                url: '/upload',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(data){
                    console.log('upload successful!\n' + data);
                },
                xhr: function() {
                    // create an XMLHttpRequest
                    var xhr = new XMLHttpRequest();

                    // listen to the 'progress' event
                    xhr.upload.addEventListener('progress', function(evt) {
                        if (evt.lengthComputable) {
                            // calculate the percentage of upload completed
                            var percentComplete = evt.loaded / evt.total;
                            percentComplete = parseInt(percentComplete * 100);

                            outConsole("Upload Percent", percentComplete);

                            // update the Bootstrap progress bar with the new percentage
                            $('#upload-progresstext').text("Now uploading... "+ percentComplete + '%');
                            $('.progress-bar').width(percentComplete + '%');

                            // once the upload reaches 100%, set the progress bar text to done
                            if (percentComplete === 100) {
                                // Hide progress panel..
                                $('#progress-panel').attr('style', 'visibility: hidden;');
                            }

                        }

                    }, false);

                    return xhr;
                }
            });

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
    });

});



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Actions for messages from the UI..
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Refresh searched user list in user list UI..
function refreshSearchList(userList){
    var parentUl = $('.user-content').children('ul');
    var cloneSample = $("<li id='test2@outlook.com' style='display: list-item;'>" +
                            "<div class='user' onclick='javascript:selectUserFromList(\'Test2\',\'test2@outlook.com\',\'YCTtcy7gs9HT0mtqAAAB\');'>" +
                                "<div class='avatar'>" +
                                    "<img src='/images/man.png'>" +
                                    "<div class='status offline'></div></div>" +
                                "<div class='name'>Name</div>" +
                                "<div class='mood'>Mood for this</div></div></li>");
    // var cloneSample = $("<li id='test1@outlook.com' style='display: list-item;'><div href='#' onclick=\'javascript:selectUserFromList(\'Test1\',\'test1@outlook.com\',\'YCTtcy7gs9HT0mtqAAAB\');'><img src='/images/man.png' class='img-thumbnail'><span>test1@outlook.com</span></div></li>");
    parentUl.html('');


    for(var i in userList){
        var cloneLi = cloneSample.clone();
        cloneLi.attr('id', userList[i].local.email);
        cloneLi.children('div').attr('onclick', "javascript:selectUserFromList('" + userList[i].local.username + "','" + userList[i].local.email + "','" + userList[i].local.id + "','SEARCH');");
        cloneLi.children('div').children('div:first').children('img').attr('src', userList[i].local.img);
        cloneLi.children('div').children('div:first').children('div').attr('class', "status online");
        cloneLi.children('div').children('div:first').next().text(userList[i].local.email);
        cloneLi.children('div').children('div:last').text(userList[i].local.email);

        // cloneLi.children('div').children('span').text(searchList[i].local.email);
        cloneLi.show();
        parentUl.append(cloneLi);
    }

    // Hide add group button..
    $('#btn-addToContact').prop("disabled", true);
    $('#btn-removeFromContact').prop("disabled", true);
    $('#btn-addGrpConv').prop("disabled", true);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send invite to a friend..
function inviteUser() {
    $('#inviteModel').modal();
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add a group..
function addNewGroup() {
    $('#btn-addGrpConv').click();
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add a person..
function action_addToContact() {
    $('#btn-addToContact').click();
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Remove a person..
function action_removeFromContact() {
    if(selectFlag == "ONE") {
        $('#btn-removeFromContact').click();
        if (infoVisibleFlag) {
            $('#panel-userinfo').fadeOut(1000);
            infoVisibleFlag = false;
        }
        disableActionButton();
    }
    else if(selectFlag == "GRP") {
        removeGrpFromContact(grpSelected);
        if (infoVisibleFlag) {
            $('#panel-userinfo').fadeOut(1000);
            infoVisibleFlag = false;
        }
        disableActionButton();
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Show search bar..
function showSearchBar() {
    $('#grp-searchPerson').attr('style','padding-top: 10px; width: 100%;');
    $('#grp-searchPerson').show();
    refreshSearchList(null);
    searchFlag = true;
    autoResizeDiv();
    $('#input-searchPerson').focus();
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Refresh user list UI using user list..
function refreshContactList(userList){
    searchFlag = false;
    $('#grp-searchPerson').attr('style', 'display: none;');
    $('#input-searchPerson').val('');
    $('#input-searchPerson').show();
    autoResizeDiv();

    var parentUl = $('.user-content').children('ul');
    var cloneSample = $("<li id='test2@outlook.com' style='display: list-item;'>" +
                            "<div class='user' onclick='javascript:selectUserFromList(\'Test2\',\'test2@outlook.com\',\'YCTtcy7gs9HT0mtqAAAB\');'>" +
                                "<div class='avatar'>" +
                                    "<img src='/images/man.png'>" +
                                    "<div class='status offline'></div></div>" +
                                "<div class='name'>Name</div>" +
                                "<div class='mood'>Mood for this</div></div></li>");
    parentUl.html('');

    // alert(cloneSample);
    var state = "";

    // Add individual contact..
    for(var i in userList){
        var cloneLi = cloneSample.clone();
        cloneLi.attr('id', userList[i].email);
        cloneLi.children('div').attr('onclick', "javascript:selectUserFromList('" + userList[i].username + "','" + userList[i].email + "','" + userList[i].id + "','CONTACT');");
        cloneLi.children('div').children('div:first').children('img').attr('src', userList[i].img);

        var connectStatus = "";
        var connectedUser = connectedUserList.find(function(oneUser) {
            return oneUser.email === userList[i].email;
        });
        if(connectedUser) {
            connectStatus = "online";
        }
        else {
            connectStatus = "offline";
        }

        switch (userList[i].state) {
            case 'CONTACTED':
                state = "status contacted-";
                break;
            case 'ADDED':
                state = "status added-";
                break;
            case 'INVITED':
                state = "status invited-";
                break;
            case 'REMOVED':
                continue;
                break;
            case 'DECLINED':
                state = "status declined-";
                break;
            default:
                state = "status away-";
                break;
        }

        // alert(state + connectStatus);

        cloneLi.children('div').children('div:first').children('div').attr('class', state + connectStatus);
        cloneLi.children('div').children('div:first').next().text(userList[i].email);
        cloneLi.children('div').children('div:last').text(userList[i].email);

        cloneLi.show();
        if(userList[i].state == "CONTACTED") {
            parentUl.prepend(cloneLi);
        }
        else {
            parentUl.append(cloneLi);
        }
    }

    outConsole("RefreshContact : User Group Contacts", grpList.length);
    // Add group contact..
    for(var i in grpList){
        var cloneLi = cloneSample.clone();
        cloneLi.attr('id', grpList[i].grpID);
        cloneLi.children('div').attr('onclick', "javascript:selectGrpFromList('" + grpList[i].grpID + "','" + grpList[i].grpName + "');");
        cloneLi.children('div').children('div:first').children('img').attr('src', "/images/group.png");

        var connectStatus = "status contacted-online";
        // alert(state + connectStatus);

        cloneLi.children('div').children('div:first').children('div').attr('class', state + connectStatus);
        cloneLi.children('div').children('div:first').next().text(grpList[i].grpName);
        var grpUserNames = "";
        outConsole("RefreshContact : Each group of contacts", grpList[i]);
        outConsole("RefreshContact : Group Users", grpList[i].grpUsers);
        for(var j in grpList[i].grpUsers) {
            if(j == 0) {
                grpUserNames = grpList[i].grpUsers[0].username;
            }
            else {
                grpUserNames += ', ' + grpList[i].grpUsers[j].username;
            }
        }
        // alert(grpUserNames);
        cloneLi.children('div').children('div:last').text(grpUserNames);

        cloneLi.show();
        parentUl.prepend(cloneLi);
    }

    // Add bot icon..
    var botLi = $("<li id='chatbot' style='display: list-item;'>" +
                    "<div class='user' onclick='javascript:selectBotFromList();'>" +
                        "<div class='avatar'>" +
                            "<img src='/images/bot.png'>" +
                            "<div class='status contacted-online'></div></div>" +
                        "<div class='name'>Chat BOT</div>" +
                        "<div class='mood'>Always here!</div></div></li>");

    var concierge = $("<li id='concierge' style='display: list-item;'>" +
                    "<div class='user' onclick='javascript:selectConciergeFromList();'>" +
                        "<div class='avatar'>" +
                            "<img src='/images/concierge.png'>" +
                            "<div class='status contacted-online'></div></div>" +
                        "<div class='name'>Concierge</div>" +
                        "<div class='mood'>Contact the center!</div></div></li>");

    parentUl.prepend(botLi);
    parentUl.prepend(concierge);

    // Show add group button..
    $('#btn-addToContact').prop("disabled", true);
    $('#btn-removeFromContact').prop("disabled", true);
    $("#btn-addGrpConv").prop("disabled", false);

    refreshSelect();
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add sent/received message in UI..
function refreshSelect() {
    if(selectedIndex == -1) {
        return;
    }

    if(selectFlag == "ONE") {
        selectUserFromList(userSelected.username, userSelected.email, userSelected.id, "CONTACT");
    }
    else {
        selectGrpFromList(grpSelected.grpID, grpSelected.grpName);
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add sent/received message in UI..
function addMsgFromUser(msgObj, isSelf){
    // msgObj = {
    //     type: "BOT" / "ONE" / "GRP",
    //     from: ""     // email of sender,
    //     to: "",      // email of receiver..
    //     msg: ""
    // }

    // Create message according type..
    var msgType = isSelf ? "message-reply" : "message-receive";
    var msgHtml = $('<div><div class="message-info">' +
                            '<div class="msguser-info">' +
                                '<img src="/images/1.jpg" class="user-avatar img-thumbnail"></div>' +
                            '<div class="message-username">TEST1</div>' +
                            '<div class="message-content-box">' +
                                '<div class="arrow"></div>' +
                                '<div class="message-content">test</div></div></div>' +
                        '<div class="message-time">13:01 22/7/2016</div></div>');

    // Get current time stamp..
    var timeStamp = getTimeStamp();
    var msgContent = msgObj.msg.replace(/\n/g, '<br>');

    var msgInfo = {};

    outConsole("Message information From user : Message data", msgObj);

    if(isSelf) {
        msgInfo = {
            img: userSelf.img,
            username: userSelf.username
        }
    }
    else {
        if(msgObj.type == "BOT"){
            msgInfo = {
                img: "/images/bot.png",
                username: "CHAT BOT"
            };
        }
        else if(msgObj.type == "ONE") {
            for(var i = 0; i < contactList.length; i++) {
                if(contactList[i].email == msgObj.from) {
                    msgInfo = {
                        img: contactList[i].img,
                        username: contactList[i].username
                    };
                    break;
                }
            }
        }
        else if(msgObj.type == "GRP") {
            for(var i = 0; i < grpList.length; i++) {
                if(grpList[i].grpID == msgObj.grpID) {
                    outConsole("Message : Group list", grpList[i]);
                    for(var j = 0; j < grpList[i].grpUsers.length; j++) {
                        if (grpList[i].grpUsers[j].email == msgObj.from) {
                            msgInfo = {
                                img: grpList[i].grpUsers[j].img,
                                username: grpList[i].grpUsers[j].username
                            };
                            break;
                        }
                    }
                }
            }
        }
    }
    outConsole("Message information From user : user Info", msgInfo);

    // Add values to the elements..
    msgHtml.addClass(msgType);
    msgHtml.children('.message-info').children('.msguser-info').children('.user-avatar').attr('src',msgInfo.img);
    msgHtml.children('.message-info').children('.msguser-info').children('.user-avatar').attr('title', msgInfo.username);
    msgHtml.children('.message-info').children('.message-content-box').children('.message-content').html(msgContent);
    msgHtml.children('.message-info').children('.message-username').text(msgInfo.username);
    msgHtml.children('.message-time').text(timeStamp);
    $('.msg-content').append(msgHtml);

    // Scroll to the bottom..
    $(".msg-content").scrollTop($(".msg-content")[0].scrollHeight);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add sent/received image to UI..
function addImgFromUser(msgObj, isSelf){
    // format:{
    //     from : sender.email,
    //     to : receiver.email,
    //     img : e.target.result,
    // }

    var msgType = isSelf?"message-reply":"message-receive";
    var msgHtml = $('<div><div class="message-info">' +
                            '<div class="msguser-info">' +
                                '<img src="/images/1.jpg" class="user-avatar img-thumbnail"></div>' +
                            '<div class="message-username">TEST1</div>' +
                            '<div class="message-content-box", style="background: transparent">' +
                                '<div class="arrow"></div>' +
                                '<div class="message-content">test</div></div></div>' +
                        '<div class="message-time">13:01 22/7/2016</div></div>');

    // Get current time stamp..
    var timeStamp = getTimeStamp();
    var msgInfo = {};
    if(isSelf) {
        msgInfo = {
            img: userSelf.img,
            username: userSelf.username
        }
    }
    else {
        if(msgObj.type == "ONE") {
            for(var i = 0; i < contactList.length; i++) {
                if(contactList[i].email == msgObj.from) {
                    msgInfo = {
                        img: contactList[i].img,
                        username: contactList[i].username
                    };
                    break;
                }
            }
        }
        else if(msgObj.type == "GRP") {
            outConsole("Image from group", grpList);
            outConsole("Image from group : Group ID", msgObj.grpID);
            for(var i = 0; i < grpList.length; i++) {
                if(grpList[i].grpID == msgObj.grpID) {
                    outConsole("Group sent from image : Group users", grpList[i].grpUsers[j]);
                    for(var j = 0; j < grpList[i].grpUsers.length; j++) {
                        if (grpList[i].grpUsers[j].email == msgObj.from) {
                            outConsole("Image sent user", grpList[i].grpUsers[j]);
                            msgInfo = {
                                img: grpList[i].grpUsers[j].img,
                                username: grpList[i].grpUsers[j].username
                            };
                            break;
                        }
                    }
                }
            }
        }
    }

	msgHtml.addClass(msgType);
	msgHtml.children('.message-info').children('.msguser-info').children('.user-avatar').attr('src',msgInfo.img);
	msgHtml.children('.message-info').children('.msguser-info').children('.user-avatar').attr('title',msgInfo.username);
    msgHtml.children('.message-info').children('.message-username').text(msgInfo.username + " say:");
	msgHtml.children('.message-info').children('.message-content-box').children('.message-content').html("<img src='"+msgObj.img+"', style='max-height: 200px; max-width: 200px'>");
    msgHtml.children('.message-time').text(timeStamp);
	$('.msg-content').append(msgHtml);
	$(".msg-content").scrollTop($(".msg-content")[0].scrollHeight);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add message from system in UI
function addMsgFromSys(msg){
	$.scojs_message(msg, $.scojs_message.TYPE_OK);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Actions for selecting and sending message to user..
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for selecting new group to chat with..
function selectGrpFromList(grpID, grpName){
    var parentUl = $('.user-content').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Set grp to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        if(user.id == grpID) {
            user.setAttribute("style", "background-color: #eee;");
            selectedIndex = i;
            outConsole("Select group from contact : Group index" + selectedIndex);
        }
        else {
            user.setAttribute("style", "");
        }
    }

    disableActionButton();
    var img = "/images/group.png";
    var oneGrp = {
        grpID : grpID,
        grpName : grpName,
        grpUsers : [],
        img : img
    };

    var flag = false;
    var grp = grpList.find(function(oneGrp) {
        return oneGrp.grpID === grpID;
    });
    if(!grp) {
        selectedIndex = -1;
        $('#panel-userinfo').fadeOut(1000);
        infoVisibleFlag = false;
        return;
    }
    else {
        oneGrp.grpUsers = grp.grpUsers;
    }

    selectFlag = "GRP";
    grpSelected = oneGrp;
    showGroupInfo(oneGrp);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for selecting new user to chat with..
function selectUserFromList(name, email, id, type){
    var parentUl = $('.user-content').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Set user to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        if(user.id == email) {
            user.setAttribute("style", "background-color: #eee;");
            selectedIndex = i;
            outConsole("Select user from contact : select index", selectedIndex);
        }
        else {
            user.setAttribute("style", "");
        }
    }

    disableActionButton();

    // Find selected user from the contact list..
    var contactUser = contactList.find(function(oneContactUser) {
        return oneContactUser.email === email;
    });

    if(contactUser == undefined && type == "SEARCH") {
        enableActionButton("add");
    }
    else if(contactUser == undefined && type == "CONTACT") {
        selectedIndex = -1;
        $('#panel-userinfo').fadeOut(1000);
        infoVisibleFlag = false;
        return;
    }
    else {
        switch (contactUser.state) {
            case "ADDED":
            case "CONTACTED":
                enableActionButton("remove");
                break;
            case "INVITED":
            case "DECLINED":
                enableActionButton("add");
                enableActionButton("remove");
                break;
            default:
            case "REMOVED":
                enableActionButton("add");
                break;
        }
    }

    var img = getUserImg(type, email);

    var oneUser = {
        id : id,
        username : name,
        email : email,
        img : img
    }

    selectFlag = "ONE";
    userSelected = oneUser;

    showUserInfo(oneUser);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for selecting new user to chat with..
function selectBotFromList(){
    var parentUl = $('.user-content').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Set user to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        user.setAttribute("style", "");
    }
    users.get(1).setAttribute("style", "background-color: #eee;");
    selectedIndex = 1;
    outConsole("Select user from list", "Bot Select");

    disableActionButton();
    var oneUser = {
        id : "BOT",
        username : "CHAT BOT",
        email : "CHATEMAIL",
        img : "/images/bot.png"
    };

    selectFlag = "BOT";
    userSelected = oneUser;

    showUserInfo(oneUser);
    connectChatBot();
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for selecting new user to chat with..
function selectConciergeFromList(){
    var parentUl = $('.user-content').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Set user to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        user.setAttribute("style", "");
    }
    users.get(0).setAttribute("style", "background-color: #eee;");
    selectedIndex = 0;
    outConsole("Select user from contact", "Concierge Select");

    disableActionButton();
    var oneUser = {
        id : "CONCIERGE",
        username : "Concierge of the server",
        email : "CONCIERGE EMAIL",
        img : "/images/concierge.png"
    };

    selectFlag = "CON";
    userSelected = oneUser;

    showUserInfo(oneUser);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for selecting new user to add to new group..
function selectUserFromGroupList(name, email, id){
    var parentUl = $('.grp-content').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Set user to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        img = "";
        if(user.id == email) {
            var userInfo = {
                username: name,
                email: email,
                img: img
            };

            if (user.getAttribute('hiddenValue') == 'SEL'){
                user.setAttribute("style", "");
                user.setAttribute("hiddenValue", "DSEL");
                outConsole("Select user from group adding", "DESEL");
                var toRemove = grpChatInfo.grpUsers.find(function(oneUser) {
                    return oneUser.email === userInfo.email;
                });
                outConsole("Select user from group adding : User to Remove", toRemove);
                grpChatInfo.grpUsers.splice(grpChatInfo.grpUsers.indexOf(toRemove), 1);
            }
            else {
                user.setAttribute("style", "background-color: #eee;");
                user.setAttribute("hiddenValue", "SEL");
                grpChatInfo.grpUsers.push(userInfo);
            }
            break;
        }
    }
}


// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Hide add / remove button..
function disableActionButton() {
    $('#action-panel1').attr("style", "visibility: hidden;");
    $('#action-panel2').attr("style", "visibility: hidden;");
}


// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Show add / remove button..
function enableActionButton(type) {
    // Show add button..
    if(type == "add") {
        $('#action-panel1').attr("style", "padding: 20px; padding-left: 10px;");
    }
    // Show remove button
    else {
        $('#action-panel2').attr("style", "padding: 20px; padding-right: 0px;");
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Show selected group information..
function showGroupInfo(oneGrp) {
    // Show user info bar if it's hidden..
    if(!infoVisibleFlag) {
        $('#panel-userinfo').fadeIn(1000);
        infoVisibleFlag = true;
    }

    // Set user name and email, image of this user group..
    $('#userinfo-name').text(oneGrp.grpName);
    $('#userinfo-mood').text("Group includes " + oneGrp.grpUsers.length + " contacts.");
    var grpImg = "/images/group.png";
    $('#userinfo-img').attr('src', grpImg);
    // Set online status of this user..
    var onlineStatus = "status contacted-online";
    $('#userinfo-status').attr('class', onlineStatus);
    // Show remove button..
    $('#action-panel2').attr("style", "padding: 20px; padding-right: 0px;");


    // Show members in more details panel..
    $('#other-info').attr('style', '');
    var parentUl = $('#other-info').children('ul');
    var cloneSample = $("<li id='test2@outlook.com' style='display: list-item; min-height: 50px; margin-left: -30px; padding-top: 5px; border-bottom: 1px solid #e8e8e8;'>" +
                            "<div class='user' onclick='javascript:selectUserInfoList(\'Test2\',\'test2@outlook.com\',\'YCTtcy7gs9HT0mtqAAAB\');'>" +
                                "<div class='avatar'>" +
                                    "<img src='/images/man.png' class='info-avatar'>" +
                                    "<div class='status offline', style='margin-left: 30px; margin-top: 30px;'></div></div>" +
                                "<div style='padding-left: 50px; padding-top: 10px;' class='name'>Name</div></div></li>");

    parentUl.html('');
    outConsole("Show group info : Group member", oneGrp.grpUsers.length);

    for(var i in oneGrp.grpUsers){
        var cloneLi = cloneSample.clone();
        cloneLi.attr('id', oneGrp.grpUsers[i].email);
        cloneLi.attr('hiddenValue', 'DSEL');
        cloneLi.children('div').attr('onclick', "javascript:selectUserFromInfoList('" + oneGrp.grpUsers[i].username + "','" + oneGrp.grpUsers[i].email + "','" + oneGrp.grpUsers[i].id + "', 'CONTACT');");
        cloneLi.children('div').children('div:first').children('img').attr('src', oneGrp.grpUsers[i].img);

        var connectStatus = "";
        var connectedUser = connectedUserList.find(function(oneUser) {
            return oneUser.email === oneGrp.grpUsers[i].email;
        });
        if(connectedUser) {
            connectStatus = "online";
        }
        else {
            connectStatus = "offline";
        }

        state = "status contacted-";

        cloneLi.children('div').children('div:first').children('div').attr('class', state + connectStatus);
        cloneLi.children('div').children('div:last').text(oneGrp.grpUsers[i].username + "(" + oneGrp.grpUsers[i].email + ")");

        cloneLi.show();
        parentUl.append(cloneLi);
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Show selected user information..
function showSelfInfo(selfInfo) {
    outConsole("Show self info", "Self info show");

    var state = "";

    // Set user name, image of this user..
    $('#selfinfo-name').text(selfInfo.username);
    $('#selfinfo-img').attr('src', selfInfo.img);

    outConsole("Show self info : Self info to show", selfInfo);
    if(selfInfo.id == "BOT") {
        // Set bot information..
        $('#selfinfo-mood').text("The bot of this chat!");
    }
    else if(selfInfo.id == "CONCIERGE") {
        // Set bot information..
        $('#selfinfo-mood').text("Administrator of this chat!");
    }
    else {
        // Set email of this user..
        $('#selfinfo-mood').text("Email : " + selfInfo.email);
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Show selected user information..
function showUserInfo(oneUser) {
    // Show user info bar if it's hidden..
    if(!infoVisibleFlag) {
        $('#panel-userinfo').fadeIn(1000);
        infoVisibleFlag = true;
    }

    outConsole("Show user info", "Show user");

    var state = "";

    // Set user name, image of this user..
    $('#userinfo-name').text(oneUser.username);
    $('#userinfo-img').attr('src', oneUser.img);
    // Hide more details panel..
    $('#other-info').attr('style', 'display: none;');

    outConsole("Show user info : User to show info", oneUser);
    if(oneUser.id == "BOT") {
        // Set bot information..
        $('#userinfo-mood').text("This is a chat bot! Talk with him a fun!");
        // Fet online status of bot..
        state = "status contacted-online";
    }
    else if(oneUser.id == "CONCIERGE") {
        // Set bot information..
        $('#userinfo-mood').text("Link to the serivce! Have a talk with administrator!");
        // Fet online status of bot..
        state = "status contacted-online";
    }
    else {
        // Set email of this user..
        $('#userinfo-mood').text("Email address : " + oneUser.email);
        // Get online status of this user..
        state = getUserOnlineStatus(oneUser);
    }

    // Set online status of this user..
    $('#userinfo-status').attr('class', state);

    // Set the name of this user to the main title..
    $('#span-mainTitle').text(oneUser.username);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send image to one person..
function sendImage(msgObj) {
    /*
    var msgObj = {
        from : userSelf.email,
        to : receiver.email,
        img : e.target.result
    };
     */

    socket.emit('imgToOne', msgObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send message to one person..
function sendMessage(msgObj) {
    /*
     var msgObj = {
         type : "BOT" / "ONE" / "GRP",
         from : userSelf.email,
         to : userSelected.email,
         msg : msg
     };
     */

    if(msgObj.type == "BOT") {
        socket.emit('msgToBot', msgObj);
        outConsole("To Bot Message", msgObj);
    }
    else {
        socket.emit('msgToOne', msgObj);
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send message to one person..
function connectChatBot() {
    var dataObj = {
        type : "BOT",
        from : userSelf.email,
        msg : {
            sendType: "Connect",
            msgData: "FirstLink"
        }
    };

    sendMessage(dataObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Actions for others(key event, ..)
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send message enter function..
function keyEventMessage(e){
    var event1 = e || window.event;
    if(event1.keyCode == 10){
        $('#sendMsg').click();
        e.preventDefault();
    }
    return false;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Search user input enter key function..
function keyEventSearchPerson(e){
    var event1 = e || window.event;
    if(event1.keyCode == 13){
        $('#btn-searchPerson').click();
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//set name enter function
function keyEventName(e){
	var event1 = e || window.event;
	if(event1.keyCode == 13){
		$('#btn-setName').click();
	}
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//send to one enter function
function keyEventMsgToOne(e){
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


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add a new user to the contact list..
function addToContact(oneUser) {
    // oneUser = {
    //     username : username,
    //     email: email,
    //     id: id
    // };

    var curState = getUserContactState(oneUser.email);
    var userState = "";

    switch (curState) {
        case "NOT_EXIST" :
        case "ADDED" :
        case "DECLINED" :
        default:
            userState = "ADDED";
            break;
        case "INVITED" :
            userState = "CONTACTED";
            break;
        case "CONTACTED" :
            addMsgFromSys("This user already had a contact with you!");
            break;
    }

    var msgObj = {
        from: {
            username: userSelf.username,
            email: userSelf.email,
            password: userSelf.password,
            img: userSelf.img
        },
        toAdd: {
            state: userState,
            username: oneUser.username,
            email: oneUser.email,
            img: oneUser.img
        }
    };

    socket.emit('addToContact', msgObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add a new user to the contact list..
function removeFromContact(oneUser) {
    // oneUser = {
    //     username : username,
    //     email: email,
    //     id: id
    // };

    var curState = getUserContactState(oneUser.email);
    var userState = "";

    switch (curState) {
        case "NOT_EXIST" :
            addMsgFromSys("This user not added to your contact!");
            break;
        case "ADDED" :
        case "DECLINED" :
        case "INVITED" :
        case "CONTACTED" :
        default:
            userState = "REMOVED";
            break;
    }

    var msgObj = {
        from: {
            username: userSelf.username,
            email: userSelf.email,
            password: userSelf.password
        },
        toRemove: {
            state: userState,
            username: oneUser.username,
            email: oneUser.email
        }
    };

    socket.emit('removeFromContact', msgObj);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add a new user to the contact list..
function removeGrpFromContact(oneGrp) {
    // oneGrp = {
    //     grpID : group id,
    //     grpName : group name,
    //     grpUsers : group users,
    //     img : img
    // };

    var dataObj = {
        from: userSelf.email,
        grp: oneGrp
    }

    socket.emit('removeConvGrp', dataObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Get contact list user state..
function getUserContactState(userEmail) {
    for(var i = 0; i < contactList.length; i++) {
        var oneUser = contactList[i];
        if(oneUser.email == userEmail) {
            return contactList[i].state;
        }
    }

    return "NOT_EXIST";
}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Get contact list user state..
function getUserOnlineStatus(selUser) {
    var connectStatus = "";
    var connectedUser = connectedUserList.find(function(oneUser) {
        return oneUser.email === selUser.email;
    });
    if(connectedUser) {
        connectStatus = "online";
    }
    else {
        connectStatus = "offline";
    }

    var contactUser = contactList.find(function (oneUser) {
        return oneUser.email === selUser.email;
    });

    var state = "";
    if(contactUser) {
        switch (contactUser.state) {
            case 'CONTACTED':
                state = "status contacted-";
                break;
            case 'ADDED':
                state = "status added-";
                break;
            case 'INVITED':
                state = "status invited-";
                break;
            case 'REMOVED':
                state = "status away-";
                break;
            case 'DECLINED':
                state = "status declined-";
                break;
        }
    }
    else {
        state = "status away-";
    }

    return state + connectStatus;
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Get contact list user state..
function getUserImg(type, userEmail) {
    if(type == "SEARCH") {
        for(var i = 0; i < searchList.length; i++) {
            var oneUser = searchList[i].local;
            if(oneUser.email == userEmail) {
                return oneUser.img;
            }
        }
    }
    else if(type == "CONTACT") {
        for(var i = 0; i < contactList.length; i++) {
            var oneUser = contactList[i];
            if(oneUser.email == userEmail) {
                return oneUser.img;
            }
        }
    }

    return "";
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Get contact list user state..
function processBOTMsg(msgObj) {
    /*
     msgObj format:{
         type: "BOT",
         from: ""  // email of sender,
         to: "",    // email of receiver..
         msg: ""
     }
     */

    addMsgFromUser(msgObj, false);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Get contact list user state..
function processMsgForBOT(msgData) {
    /*
     msgObj format:{
         type: "BOT",
         from: ""  // email of sender,
         to: "",    // email of receiver..
         msg: ""
     }
     */

    // Create data to send..
    var msgObj = {
        type : "BOT",
        from : userSelf.email,
        msg : {
            sendType: "",
            msgData: ""
        }
    };

    outConsole("Message to process", msgData);
    if(msgData.toLowerCase() == 'clear') {
        $('#messages').html('');
        outConsole("User input", "Clear");
        return;
    }
    else if(msgData.toLowerCase() == 'restart'){
        count = 0;
        $('#messages').html('');
        outConsole("User input", "Restart");
        connectChatBot();
        return;
    }
    else if(count == 0) {
        firstChoice = msgData.toLowerCase();
        if(firstChoice.indexOf('door') > -1){
            count++;
            outConsole("Select", "door");
        }
        else if(firstChoice.indexOf('window') > -1){
            count += 2;
            outConsole("Select", "window");
        }
        msgObj.msg.sendType = 'firstChoice';
        msgObj.msg.msgData = msgData;
    }
    else if(count == 1) {
        count ++;
        msgObj.msg.sendType = 'filter1';
        msgObj.msg.msgData = msgData;
    }
    else if(count == 2) {
        count++;
        msgObj.msg.sendType = 'filter2';
        msgObj.msg.msgData = msgData.replace(/[^a-zA-Z0-9-,\/]/g, '').toString();
    }
    else if(count == 3) {
        count++;
        msgObj.msg.sendType = 'new';
        msgObj.msg.msgData = msgData;
    }
    else {
        count = 0;
        msgObj.msg.sendType = 'firstChoice';
        msgObj.msg.msgData = msgData;
    }

    // Send data..
    sendMessage(msgObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Get contact list user state..
function outConsole(msg, data) {
    console.log(msg + "---------------------------------");
    console.log(data);
}