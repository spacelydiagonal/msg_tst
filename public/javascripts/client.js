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

// Flag to show the queue of action..
var actionQueue = 0;

// Flag Send a mail to concierge..
var noticeFlag = false;
// Flag of set user from a contact list..
var selectFlag = "ONE";
// Flag of search bar status, used in window resizing..
var searchFlag = false;
// Flag of info bar hide/show status..
var infoVisibleFlag = false;

// Temporary data..
var boardLocation = 0;
var curBoardId = 0;

// Variables for current conversation..
var curConvId = "";

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
//     contact_id: contact id in contact info
//     username : name,
//     email : email,
//     img : img
// };

// Collaborator list to add to the board..
var collaboratorList = [];
// collaboratorList = [
//     {
//         username: usersname,
//         email: email
//     }
// ];

// User information of selected from collaborator list..
var selectedCollaboratorIndex = -1;
var selectedCollaboratorEmail = "";

// User information to share image..
var shareFlag = 0;
var userToShare = "";
var shareContent = "";
var sharePath = "";

// Board information to share..
var shareBoardID = 0;
var shareBoardContent = "";
var shareBoardUser = "";

// Collaborator list to add to the board..
var boardList = [];
// boardList = [
//     {
//         id: String,
//         creator: String,
//         description: String,
//         category: String,
//         contents: [],
//         pubflag: String,
//         collaborators: [
//             {
//                 username: "",
//                 email: ""
//             }
//         ]
//     }
// ];

// For uploading..
var uploadFiles = [];
var uploadBoardID = "";

// Variable for content of image selected in message box..
var selectedImgContent = "";
var selectedImgPath = "";
var selectedBoardFromPinModal = "";

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

// Variables for message to receive..
var messageQueue = [];

// Variables for Concierger email..
var conciergeEmail = "proquerio@gmail.com";

// Dropzone.autoDiscover = false;
// new Dropzone($('#upload-dropzone'),
//     {
//         url: "/upload-board",
//         init: function(){
//             this.on('sending', function(file, xhr, formData){
//                 formData.append('userName', 'bob');
//                 console.log("Sending file");
//             });
//         }
//     }
// );

$('#upload-dropzone').dropzone({
    url: "/upload-board",
    init: function(){
        this.on('sending', function(file, xhr, formData){
            formData.append('userName', 'bob');
            outConsole("File data", file);
            file.webkitRelativePath = userSelf.email;
            outConsole("Form data", formData);
        });
    }
});

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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Received conversation of this user..
socket.on('convResult', function(msgObj){
    // dataObj = {
    //     result: "success",
    //     reason: "",
    //     data: convList
    // };
    if(msgObj.result == "success") {
        loadMessages(msgObj.data);
    }
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
        processBOTMsg(msgObj);
    }
    else{
        addMsgFromUser(msgObj, false, false);
    }
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive message from users, determine it from whom..
socket.on('msgResult',function(msgObj){
    /*
     msgObj format:{
         result: result,
         msgID: msgObj.id
     }
     */

    showMessageResult(msgObj);
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

	addImgFromUser(msgObj, false, false);
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive image and add..
socket.on('fileToOne', function(msgObj){
    /*
     format:{
         id: msgObj.id,
         state: msgObj.state,
         type: msgObj.type,
         msg_budge: contact.msg_budge + 1,
         grpID: msgObj.grpID,
         from: msgObj.from,
         to: msgObj.to,
         filePath: msgObj.filePath,
         msg: msgObj.fileIcon
     }
     */

    addFileFromUser(msgObj, false, false);
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
// Receive invite result for error..
socket.on('shareBoardResult', function(msgObj){
    outConsole('Share board result', msgObj);
    if(msgObj.result == 'failed') {
        $('#shareStatus').text('Error on inviting : ' + msgObj.info);
    }
    else {
        $('#shareStatus').text('Success');
        $('#modal-shareToEmail').modal('hide');

        var shareData = {
            email : shareBoardUser,
            username : "UNKNOWN",
            right: "NO"
        };

        shareBoardContent.collaborators.push(shareData);

        // Send socket..
        socket.emit('editboard', shareBoardContent);
    }
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive search result for success..
socket.on('boardList', function(msgObj){

    boardList = msgObj.data;
    refreshBoardList(boardList);

    if(actionQueue == 1) {
        $('#btn-addImgToBoard').click();
        actionQueue = 0;
    }
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive search result for success..
socket.on('boardResult', function(msgObj){

    if(msgObj.result == 'success') {
        // msgObj = {
        //     result: 'success',
        //     reason: "",
        //         data = [  board list..
        //         {
        //             id: String,
        //             creator: String,
        //             description: String,
        //             category: String,
        //             contents: [],
        //             pubflag: String,
        //             collaborators: [
        //                 {
        //                     username: "",
        //                     email: ""
        //                 }
        //             ]
        //         }
        //     ];
        // }
        $('#modal-addBoard').modal('hide');
        boardList = msgObj.data;
        if(boardLocation == 0) {
            refreshBoardList(boardList);
        }
        else {
            var boardData = boardList.find(function (oneBoard) {
                return oneBoard.id === curBoardId;
            });
            refreshBoardImageList(curBoardId, boardData.data_contents);
        }

        if(actionQueue == 1) {
            $('#btn-addImgToBoard').click();
            actionQueue = 0;
        }
    }
    else {
        // msgObj = {
        //     result: 'failed',
        //     reason: "",
        //     data: []
        // }
        $('#txt-addResult').text('Error on create!');
    }
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive search result for success..
socket.on('boardThumb', function(msgObj){
    // msgObj = {
    //     imgID: i,
    //     result: "success",
    //     url: msgObj.url,
    //     boardID: msgObj.boardID,
    //     reason: "",
    //     data: data.toString('base64')
    // }

    if(msgObj.result == 'success') {
        var parentUl = document.getElementById(msgObj.boardID);
        var imgItem;
        switch (msgObj.imgID) {
            case 0:
                img = parentUl.children[1].children[0].children[0];
                break;
            case 1:
                img = parentUl.children[1].children[0].children[1];
                break;
            case 2:
                img = parentUl.children[1].children[0].children[2];
                break;
            case 3:
                img = parentUl.children[1].children[0].children[3];
                break;
        }

        img.src = "data:image/JPEG;base64," + msgObj.data;
        if(msgObj.imgID == 2)
            img.setAttribute('style', "margin-left: 5px; margin-right: 5px;");
        else
            img.setAttribute('style', "");
    }
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive search result for success..
socket.on('boardImgResult', function(msgObj){

    if(msgObj.result == 'success') {
        // msgObj = {
        //     boardID : board id..
        //     result: 'success',
        //     reason: "",
        //     data = [  board image list..
        //         {
        //             url: filePath,
        //             filename: file.name,
        //             description: ""
        //         }
        //     ];
        // }
        $('#modal-addImage').modal('hide');
        boardData = boardList.find(function (oneBoard) {
            return oneBoard.id === msgObj.boardID;
        });
        boardData.data_contents = msgObj.data;

        if(boardLocation == 0)
            action_showBoardInfo(msgObj.boardID);
        else
            refreshBoardImageList(msgObj.boardID, boardData.data_contents);

    }
    else {
        // msgObj = {
        //     boardID : board id..
        //     result: 'failed',
        //     reason: "...",
        //     data: []
        // }
        $('#txt-uploadResult').text('Error during save!');
    }
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive search result for success..
socket.on('board_img', function(msgObj){
    if(msgObj.result == 'success') {
        // msgObj = {
        //     result: "success",
        //     url: msgObj.url,
        //     reason: "",
        //     data: image data
        // }
        var img = document.getElementById(msgObj.url);
        img.src = "data:image/JPEG;base64," + msgObj.data;
        var div = document.getElementById("div" + msgObj.url);
        div.setAttribute('style', "");
    }
    else {
        // msgObj = {
        //     result: "failed",
        //     url: msgObj.url,
        //     reason: "...",
        //     data: []
        // }
        $('#txt-uploadResult').text('');
    }
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive search result for success..
socket.on('searchResult', function(msgObj){
    searchList = msgObj;
    refreshSearchList(searchList);
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive search result for success..
socket.on('ssResult', function(msgObj){
    searchList = msgObj;
    refreshSharePersonList(searchList, false);
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


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Receive add contact result, show alert to the user..
socket.on('addCollaborator', function(msgObj){
    if(msgObj.result == "found") {
        $('#txt-addResult').text('');
        if(msgObj.info.email == userSelf.email && msgObj.info.username == userSelf.username) {
            return;
        }
        addCollaboratorToCreateBoardModel(msgObj.info);
    }
    else {
        $('#txt-addResult').text('Not exist!');
    }
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

    // user list content body..
    $('.panel-body').height(newHeight);
    $('.user-content').height(newHeight + 30);
    // User info content body..
    $('.panel-infobody').height(newHeight + 30);

    newHeight -= $('.panel-footer').height() + 45;
    // Message info content body..
    $('.msg-content').height(newHeight - 30 + searchHeight);
    $('.panel-msgbody').height(newHeight + searchHeight);
    $('#self-info').height(newHeight + searchHeight - 73);

    // User info content body..
    $('#other-infopanel').height(114);
    $('#other-info').height(114);
    $('#panel-userphoto').height(newHeight + searchHeight - 95);
    $('#board-panel').height($('#self-info').height() - $('#selfinfo-button-panel').height());
    $('#img-panel').height($('#self-info').height() - $('#selfinfo-button-panel').height() - 10);
}

function onLoad() {
    // Create a config object
    var config = new FileDialogsConfig();
    // width of the entire flash movie (buttons width + padding)
    config.width = 45;
    // height of the movie
    config.height = 16;
    // padding between buttons
    config.padding = 5;
    // open dialog button image and javascript callback function
    config.open.image = "/images/man.png";
    config.open.handler = "openCallback";
    // save dialog button image and javascript callback function
    config.save.image = "/images/concierge.png";
    config.save.handler = "saveCallback";
    // create the movie inside an element with the given id and configuration
    new FileDialogs("btn-test", config);
}


$(function(){
    $(window).resize(autoResizeDiv);
    autoResizeDiv();
    // onLoad();

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
                                "<div class='user' onclick='javascript:selectUserFromGroupList(\'Test2\',\'test2@outlook.com\',\'YCTtcy7gs9HT0mtqAAAB\');'>" +
                                    "<div class='avatar'>" +
                                        "<img src='/images/man.png'>" +
                                        "<div class='status offline'></div></div>" +
                                    "<div class='name'>Name</div></div></li>");

        parentUl.html('');

        for(var i in contactList){
            if(contactList[i].email == conciergeEmail)
                continue;

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
            msg_budge: 0,
            grpUsers: []
        };

        var userMine = {
            username: userSelf.username,
            email: userSelf.email,
            img: userSelf.img
        };

        grpChatInfo.grpUsers.push(userMine);

        $('#txt-addGrpResult').text('');

        $('#addGroupModel').modal();
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // Add to contact..
    $('#btn-addGrp').click(function(){
        // Add group contact to the list..
        /*
         format:{
             grpID: group ID,
             grpName: name..
             msg_budge: 0,
             grpUsers: [
                 oneUser: {
                    username: user name,
                    email: email
                    img: user image..
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
    $('#btn-sendImg').on("click", function(action){
        var sendImg = document.getElementById('btn-sendImg');
        sendImg.value = null;
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // Upload file to the server and process after that..
    $('#btn-sendImg').on("change", function(eef){
        var files = $(this).get(0).files;

        var maxSize = 25 * 1024 * 1024;
        if(files[0].size > maxSize) {
            alert("Maximum file size is 25MB!");
            return;
        }

        if(selectFlag == "BOT") {
            sendImageToUser("BOT");
            return;
        }

        if (files.length > 0){
            // create a FormData object which will be sent as the data payload in the
            // AJAX request
            var formData = new FormData();

            // loop through all the selected files and add them to the formData object
            var timeStamp = (new Date()).getTime();
            var filePath = "/chat_data/chatf" + timeStamp + "_" + files[0].name;

            // add the files to formData object for the data payload
            formData.append('uploads[]', files[0], filePath);

            // show progress panel..
            $('#progress-panel').attr('style', '');

            $.ajax({
                url: '/upload',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(data){
                    sendImageToUser(filePath);
                }
                ,xhr: function() {
                    // create an XMLHttpRequest
                    var xhr = new XMLHttpRequest();

                    // listen to the 'progress' event
                    xhr.upload.addEventListener('progress', function (evt) {
                        if (evt.lengthComputable) {
                            // calculate the percentage of upload completed
                            var percentComplete = evt.loaded / evt.total;
                            percentComplete = parseInt(percentComplete * 100);

                            // update the Bootstrap progress bar with the new percentage
                            $('#upload-progresstext').text("Now uploading... " + percentComplete + '%');
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
	// Send typed message to all users..
	$('#sendMsg').click(function(){
		var msg = $('#msg');

    	if(msg.val()==''){
      		alert('Please enter the message content!');
      		return;
    	}

    	if(curConvId == "") {
    	    return;
        }

        var msgObj = {};
        var timeID = (new Date()).getTime();

        if(selectFlag == "CON") {
            if(!noticeFlag) {
                noticeFlag = true;
                var dataObj = {
                    from: {
                        email: userSelf.email,
                        username: userSelf.username
                    }
                };
                // For send server notice email..
                socket.emit('notice', dataObj);
            }

            msgObj = {
                id: timeID,
                state: "AS",
                type : "ONE",
                contact_id: "Concierge_" + userSelf.email,
                from : userSelf.email,
                to : "Concierge",
                msg : msg.val()
            };
            // Save to the message queue..
            messageQueue.push(msgObj);
            // Send data to the server..
            sendMessageToOne(msgObj);
        }
    	else if(selectFlag == "BOT") {
            // Create data to send..
            msgObj = {
                type : "BOT",
                from : userSelf.email,
                to : "BOT",
                msg : msg.val()
            };

            processMsgForBOT(msg.val());
        }
    	else if(selectFlag == "ONE") {
            // Create data to send..
            msgObj = {
                id: timeID,
                state: "ND",
                type : "ONE",
                contact_id: userSelected.contact_id,
                from : userSelf.email,
                to : userSelected.email,
                msg : msg.val()
            };
            // Save to the message queue..
            messageQueue.push(msgObj);
            // Send data..
            sendMessageToOne(msgObj);
        }
        else if(selectFlag == "GRP") {
            var timeID = (new Date()).getTime();
            msgObj = {
                id: timeID,
                state: "ND",
                type : "GRP",
                grpID : grpSelected.grpID,
                from : userSelf.email,
                to : grpSelected.grpUsers,
                msg : msg.val()
            };
            // Save to the message queue..
            messageQueue.push(msgObj);
            // Send data..
            sendMessageToGrp(msgObj);
        }

        // Show sent message to display..
        addMsgFromUser(msgObj, true, false);
    	// addMsgFromUser(msgObj, false);
		msg.val('');
		msg.html('');
  	});

    //////////////////////////////////////////////////////////////////////////////////////
    // Clear send file value..
    $('#btn-sendFile').on("click", function(action){
        var sendFile = document.getElementById('btn-sendFile');
        sendFile.value = null;
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // Send file to all other users..
    $('#btn-sendFile').on('change', function(){
        var files = $(this).get(0).files;

        var maxSize = 25 * 1024 * 1024;
        if(files[0].size > maxSize) {
            alert("Maximum file size is 25MB!");
            return;
        }
        // sendFileToUser(filePath);


        if (files.length > 0){
            // create a FormData object which will be sent as the data payload in the
            // AJAX request
            var formData = new FormData();

            // loop through all the selected files and add them to the formData object
            for (var i = 0; i < files.length; i++) {
                var file = files[i];

                // loop through all the selected files and add them to the formData object
                var timeStamp = (new Date()).getTime();
                var filePath = "/chat_data/chatf" + timeStamp + "_" + files[0].name;

                // add the files to formData object for the data payload
                formData.append('uploads[]', file, filePath);
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
                    sendFileToUser(filePath);
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


    //////////////////////////////////////////////////////////////////////////////////////
    // Show dialog for add image to board..
    $('#btn-addImgToBoard').click(function() {
        // Show pin modal..
        $('#modal-imageView').modal('hide');
        $('#modal-addImgToBoard').modal();

        // Set information to initial..
        $('#panel-board-info').children('div:first').text("");
        $('#panel-board-info').children('div:last').text("");

        // Set all board information..
        var parentUl = $('#panel-board-list').children('ul');
        var cloneSample = $("<li><div class='name' style='font-family: fantasy; padding-left: 10px;'>Name</div></li>");

        parentUl.html('');

        for(var i in boardList) {
            var oneBoard = boardList[i];
            var right = getRight(oneBoard.id);
            if(right != "MODIFY") {
                continue;
            }

            var cloneLi = cloneSample.clone();
            cloneLi.attr('id', oneBoard.id);
            cloneLi.attr('onclick', "javascript:selectBoardFromPinModal('" + oneBoard.id + "','" + oneBoard.data_contents.length + "','" + oneBoard.collaborators.length + "');");
            cloneLi.children('div').text(oneBoard.title);

            cloneLi.show();
            parentUl.append(cloneLi);
        }

        // Select image src..
        var img = document.getElementById('img-content');
        img.src = selectedImgContent;

        // Set height of ul according to the image size..
        var imgHeight = img.naturalHeight;
        var imgWidth = img.naturalWidth;
        imgHeight = imgHeight / imgWidth * 400;
        var ulHeight = imgHeight - 60;
        parentUl.height(ulHeight);

        // Set onclick listener..
        $('#btn-pinToBoard').attr("onclick", "javascript:action_imgPinToBoard();");
    });


    //////////////////////////////////////////////////////////////////////////////////////
    // Send typed message to all users..
    $('#btn-addImage').on("click", function(action){
        var addImage = document.getElementById('btn-addImage');
        addImage.value = null;
    });

    //////////////////////////////////////////////////////////////////////////////////////
    // Upload file to the server and process after that..
    $('#btn-addImage').on("change", function(eef){
        var files = $(this).get(0).files;

        var maxSize = 25 * 1024 * 1024;
        if(files[0].size > maxSize) {
            alert("Maximum file size is 25MB!");
            return;
        }

        if (files.length > 0){
            outConsole("File uploda", files);

            var timeId = (new Date()).getTime();
            for(var i = 0; i < files.length; i++) {
                var fileData = {
                    fileID: timeId + "_" + i,
                    fileData: files[i]
                };
                addFileToUploadList(fileData);
            }
        }
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
// Refresh searched user list in user list UI..
function refreshBoardList(tempList){
    var parentUl = $('#board-panel');
    var cloneSample = $("<div id='board-item' class='board-item'>" +
                            "<div>" +
                                "<div id='pitem-title' class='pitem-title'>Title of item</div>" +
                                "<div class='dropdown pitem-dropdown'>" +
                                    "<a href='#' data-toggle='dropdown' style='color: #428bca;' class='dropdown-toggle'>" +
                                        "<span class='glyphicon glyphicon-list'></span></a>" +
                                    "<ul role='menu' aria-labelledby='dropdownMenu' class='dropdown-menu'>" +
                                        "<li onclick='javascript:action_showImgInfo();'>" +
                                            "<a tabindex='-1' style='cursor: default; display: list-item;'>" +
                                                "<span class='glyphicon glyphicon-open dropdown-icon'></span>" +
                                                "<span class='dropdown-text'>Go into</span></a></li>" +
                                        "<li onclick='javascript:action_modal_shareBoardToEmail(ab);'>" +
                                            "<a tabindex='-1' style='cursor: default; display: list-item;'>" +
                                                "<span class='glyphicon glyphicon-share dropdown-icon'></span>" +
                                                "<span class='dropdown-text'>Share to</span></a></li>" +
                                        "<li class='divider'></li>" +
                                        "<li onclick='javascript:action_modal_editBoard();'>" +
                                            "<a tabindex='-1' style='cursor: default; display: list-item;'>" +
                                                "<span class='glyphicon glyphicon-edit dropdown-icon'></span>" +
                                                "<span class='dropdown-text'>Edit</span></a></li>" +
                                        "<li onclick='javascript:action_removeBoardInfo();'>" +
                                            "<a tabindex='-1' style='cursor: default; display: list-item;'>" +
                                                "<span class='glyphicon glyphicon-remove dropdown-icon'></span>" +
                                                "<span class='dropdown-text'>Remove</span></a></li></ul></div></div>" +
                            "<a href='#' onclick='javascript:action_showImgInfo(boardID);' class='pitem'>" +
                                "<div id='pitem-content' class='pitem-content'>" +
                                    "<img id='pitem-mainimg' class='pitem-mainimg'>" +
                                    "<img id='pitem-subimg1' class='pitem-subimg'>" +
                                    "<img id='pitem-subimg2' style='margin-left: 5px; margin-right: 5px;' class='pitem-subimg'>" +
                                    "<img id='pitem-subimg3' class='pitem-subimg'></div></a></div>");

    parentUl.html('');


    for(var i in tempList){
        var cloneLi = cloneSample.clone();
        cloneLi.attr('id', tempList[i].id);
        var right = getRight(tempList[i].id);

        // Set the attribute for title and menu action..
        cloneLi.children('div').children('div:first').text(tempList[i].title);
        cloneLi.children('div').children('div:last').children('ul').children('li:first').attr('onclick', "javascript:action_showImgInfo('" + tempList[i].id + "');");
        cloneLi.children('div').children('div:last').children('ul').children('li:first').next().attr('onclick', "javascript:action_modal_shareBoardToEmail('" + tempList[i].id + "');");
        cloneLi.children('div').children('div:last').children('ul').children('li:first').next().next().next().attr('onclick', "javascript:action_modal_editBoard('" + tempList[i].id + "');");
        cloneLi.children('div').children('div:last').children('ul').children('li:last').attr('onclick', "javascript:action_removeBoardInfo('" + tempList[i].id + "');");
        if(right != "MODIFY") {
            cloneLi.children('div').children('div:last').attr('style', "display: none;");
        }

        // Set the thumb images of this board..
        cloneLi.children('a').attr('onclick', "javascript:action_showImgInfo('" + tempList[i].id + "');");
        cloneLi.children('a').children('div').children('img:first').attr('style', "display: none;");
        cloneLi.children('a').children('div').children('img:first').next().attr('style', "display: none;");
        cloneLi.children('a').children('div').children('img:first').next().next().attr('style', "display: none;");
        cloneLi.children('a').children('div').children('img:last').attr('style', "display: none;");

        var msgObj = {
            from: userSelf.email,
            boardID: tempList[i].id
        };
        socket.emit('boardThumb', msgObj);

        // cloneLi.children('a').children('div').children('img:first').attr('src', "url('" + tempList[i].contents[0].url + "')");
        // cloneLi.children('a').children('div').children('img:first').next().attr('src', "url('" + tempList[i].contents[1].url + "')");
        // cloneLi.children('a').children('div').children('img:first').next().next().attr('src', "url('" + tempList[i].contents[2].url + "')");
        // cloneLi.children('a').children('div').children('img:last').attr('src', "url('" + tempList[i].contents[3].url + "')");

        cloneLi.show();
        parentUl.append(cloneLi);
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for clicking add new board button..
function action_modal_addBoard() {
    // Initialize interface..
    $('#modalTitle').text('Create new board');
    $('#input-brdName').val('');
    $('#input-description').val('');
    $('#chk-public').bootstrapToggle('off');
    $('#input-addCollaborator').val('');
    $('#panel-collaborators').children('ul').html('');
    $('#btn-addBoard').val('Create');
    $('#btn-addBoard').attr('onclick', "javascript:action_addBoardInfo();");
    $('#txt-addResult').text('');

    // Initialize collaborator list..
    var mineData = {
        email : userSelf.email,
        username : userSelf.username,
        right: "MODIFY"
    };
    collaboratorList = [];
    collaboratorList.push(mineData);

    // Modal dialog..
    $('#modal-addBoard').modal();
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for clicking create board button..
function action_addBoardInfo() {
    $('#txt-addResult').text('');

    // Check all items of interface..
    var boardName = $('#input-brdName').val();
    if(boardName == '') {
        $('#txt-addResult').text('Name must be invalid!');
        return;
    }

    var boardDescription = $('#input-description').val();
    var isPub = $('#chk-public').prop('checked');
    var pub = "";
    if(isPub) {
        pub = "true";
    }
    else {
        pub = "false";
    }

    // Create board information..
    var boardInfo = {
        creater: userSelf.email,
        title: boardName,
        description: boardDescription,
        public: pub,
        category: "",
        collaborators: collaboratorList
    };

    // Send socket..
    socket.emit('createboard', boardInfo);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Modal edit board dialog..
function action_modal_shareBoardToEmail(board_id){
    outConsole("Set share board id", board_id);
    shareBoardID = board_id;
    // Modal dialog..
    $('#shareStatus').text("");
    $('#input-shareEmail').val("");
    $('#modal-shareToEmail').modal();
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Modal edit board dialog..
function action_shareBoardToEmail(){
    var toEmail = $('#input-shareEmail').val();
    if(toEmail == "") {
        return;
    }

    outConsole("Share Board ID", shareBoardID);

    var boardData = boardList.find(function(oneBoard) {
        return oneBoard.id === shareBoardID;
    });

    if(boardData) {
        var dataObj = {
            from: userSelf.email,
            to: toEmail
        };
        shareBoardUser = toEmail;
        shareBoardContent = boardData;
        socket.emit('shareBoardToEmail', dataObj);
        $('#shareStatus').text("Sending invite to the email...");
    }
    else {
        $('#shareStatus').text("Failed to share!");
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Modal edit board dialog..
function action_modal_editBoard(board_id){
    // Set interface..
    var boardInfo = boardList.find(function(oneInfo) {
        return oneInfo.id === board_id;
    });

    if(boardInfo) {
        $('#modalTitle').text('Edit board');
        $('#input-brdName').val(boardInfo.title);
        $('#input-description').val(boardInfo.description);
        if(boardInfo.public == 'false') {
            $('#chk-public').bootstrapToggle('off')
        }
        else {
            $('#chk-public').bootstrapToggle('on')
        }

        // Refresh collaborator list..
        var mineData = {
            email : userSelf.email,
            username : userSelf.username,
            right: "MODIFY"
        };
        collaboratorList = [];
        collaboratorList.push(mineData);

        $('#panel-collaborators').children('ul').html('');
        $('#input-addCollaborator').val('');
        for(var i in boardInfo.collaborators) {
            if(userSelf.email == boardInfo.collaborators[i].email)
                continue;

            addCollaboratorToCreateBoardModel(boardInfo.collaborators[i]);
        }

        $('#btn-addBoard').val('Save');
        $('#btn-addBoard').attr('onclick', "javascript:action_editBoardInfo('" + board_id + "');");

        $('#txt-addResult').text("");

        // Modal dialog..
        $('#modal-addBoard').modal();
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Edited board information send to server..
function action_editBoardInfo(board_id){
    $('#txt-addResult').text('');

    // Check all items..
    var boardName = $('#input-brdName').val();
    if(boardName == '') {
        $('#txt-addResult').text('Name must be invalid!');
        return;
    }

    var boardDescription = $('#input-description').val();
    var isPub = $('#chk-public').prop('checked');
    var pub = "";
    if(isPub) {
        pub = "true";
    }
    else {
        pub = "false";
    }

    // Create board information to edit..
    var boardInfo = {
        id: board_id,
        creater: userSelf.email,
        title: boardName,
        description: boardDescription,
        public: pub,
        category: "",
        collaborators: collaboratorList
    };

    // Send socket..
    socket.emit('editboard', boardInfo);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Remove board request send..
function action_removeBoardInfo(board_id){
    var msgObj = {
        boardID: board_id,
        from: userSelf.email
    };

    socket.emit('removeboard', msgObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Refresh searched user list in user list UI..
function refreshBoardImageList(board_id, imgList){
    //     imgList: [
    //         {
    //             url: filename in board data,
    //             filename: original file name before upload,
    //             description: ""
    //         }
    //     ]



    var parentUl = $('#img-panel');
    var cloneSample = $("<div id='as' class='img-item'>" +
                            "<a href='#' class='iitem'>" +
                                "<img src='/images/test.jpg' class='img-style'></a></div>");

    parentUl.html('');

    for(var i in imgList){
        var cloneLi = cloneSample.clone();

        cloneLi.attr('id', "div" + imgList[i].url);
        cloneLi.attr('value', "ADADF");
        cloneLi.attr('style', "display: none;");
        // Set the attribute for title and menu action..
        cloneLi.children('a').attr('onclick', "javascript:action_modal_imageViewInBoard('" + board_id + "','" + imgList[i].url + "');");
        cloneLi.children('a').attr('value', imgList[i].filename);
        cloneLi.children('a').children('img').attr('id', imgList[i].url);
        cloneLi.children('a').children('img').attr('src', "");

        var dataObj = {
            from: userSelf.email,
            boardID: board_id,
            url: imgList[i].url,
        };

        socket.emit("board_img", dataObj);

        // cloneLi.show();
        parentUl.append(cloneLi);
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Modal add image to board dialog..
function action_modal_addImg(board_id){
    // Initialize interface of modal..
    var dropText = $('#dropzone').children('div:first');
    dropText.attr('style', "display:block; margin: 0px;");
    $('#dropzone').children('div').remove();
    $('#dropzone').attr('action', "/upload-board?user=" + userSelf.email);
    $('#dropzone').append(dropText);

    var curBoard = boardList.find(function(oneBoard) {
        return oneBoard.id === board_id;
    });

    if(curBoard) {
        $('#txt-boardName').text(curBoard.title);
    }
    else {
        return;
    }

    uploadBoardID = board_id;
    // $('#btn-pinImage').attr('onclick', "javascript:action_addImgToBoard('" + board_id + "');");
    $('#btn-Cancel-addImage').attr('onclick', "javascript:action_cancelAddImg('" + board_id + "');");

    $('#txt-uploadResult').text('');

    // Initialize all variables..
    $('.addImg-ul').html('');
    uploadFiles = [];
    // Modal dialog..
    $('#modal-addImage').modal();
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Refresh searched user list in user list UI..
function action_addImgToBoard(board_id){
    // Send request of add image to board to the server..
    var msgObj = {
        boardID : board_id,
        from: userSelf.email
    };

    socket.emit("addToBoard", msgObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Refresh searched user list in user list UI..
function action_cancelAddImg(board_id){
    // Send request of add image to board to the server..
    var msgObj = {
        boardID : board_id,
        from: userSelf.email
    };

    socket.emit("canelAddBoard", msgObj);
    $('#modal-addImage').modal('hide');
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Refresh searched user list in user list UI..
function action_removeImgFromBoard(board_id, url){
    // Send request of add image to board to the server..
    var msgObj = {
        boardID : board_id,
        from: userSelf.email,
        url: url
    };

    $('#modal-imageView').modal('hide');
    socket.emit("removeFromBoard", msgObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for clicking send image button..
function action_addCollaborator() {
    var info = $('#input-addCollaborator').val();
    if(info == ''){
        return;
    }

    var userAdded = collaboratorList.find(function(oneUser) {
        if(oneUser.email === info || oneUser.username === info)
            return oneUser;
    });

    if(userAdded) {
        return;
    }

    var msgObj = {
        from: userSelf.email,
        info: info
    };

    socket.emit('addCollaborator', msgObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for adding collaborator to the board..
function addCollaboratorToCreateBoardModel(collInfo) {
    var parentUl = $('#panel-collaborators').children('ul');

    // Add to the collaborator list..
    var collUser = {
        username: collInfo.username,
        email: collInfo.email,
        right: "MODIFY"
    };
    collaboratorList.push(collUser);

    // Add to the board modal..
    var cloneLi = $("<li style='cursor: pointer;'>" +
                        "<div class='user' onclick='javascript:selectUserFromCollaboratorList();'>" +
                            "<img src='/images/man.png' class='avatar'>" +
                            "<div class='name'>Name</div></div></li>");

    cloneLi.attr('id', collUser.email);
    cloneLi.children('div').attr('onclick', "javascript:selectUserFromCollaboratorList('" + collUser.email + "');");
    cloneLi.children('div').children('img').attr('src', collInfo.img);
    cloneLi.children('div').children('div').text(collInfo.username + "(" + collInfo.email + ")");
    parentUl.prepend(cloneLi);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for clicking send image button..
function selectUserFromCollaboratorList(email) {
    var parentUl = $('#panel-collaborators').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Set user to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        if(user.id == email) {
            user.setAttribute("style", "background-color: #c3c3c3; cursor: pointer;");
            selectedCollaboratorIndex = i;
            selectedCollaboratorEmail = email;
        }
        else {
            user.setAttribute("style", "cursor: pointer;");
        }
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for clicking send image button..
function action_removeSelectedUserFromCollaboratorList() {
    var parentUl = $('#panel-collaborators').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Remove selected user from list..
    var collaborator = collaboratorList.find(function(oneInfo) {
        return oneInfo.email === selectedCollaboratorEmail;
    });
    collaboratorList.splice(collaboratorList.indexOf(collaborator), 1);

    users.splice(selectedCollaboratorIndex, 1);
    parentUl.html('');
    parentUl.append(users);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for show image data for one board..
function action_showImgInfo(board_id) {
    $('#board-panel').attr('style', "display: none;");
    $('#img-panel').attr('style', "");
    $('#upto-board').attr('style', "");
    $('#upto-board').attr('onclick', "javascript:action_showBoardInfo('" + board_id + "');");
    var right = getRight(board_id);
    if(right != "MODIFY") {
        $('#add-board').attr('style', "display: none;");
    }
    else {
        $('#add-board').attr('onclick', "action_modal_addImg('" + board_id + "');");
    }

    autoResizeDiv();

    // Set information of location in board..
    boardLocation = 1;
    curBoardId = board_id;

    boardData = boardList.find(function(oneBoard) {
        return oneBoard.id === board_id;
    });

    if(boardData) {
        refreshBoardImageList(board_id, boardData.data_contents);
    }
    else {
        refreshBoardImageList(board_id, []);
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for show data in the board..
function action_showBoardInfo(board_id) {
    $('#board-panel').attr('style', "");
    $('#img-panel').attr('style', "display: none;");
    $('#upto-board').attr('style', "display: none;");
    $('#add-board').attr('style', "");
    $('#add-board').attr('onclick', "javascript:action_modal_addBoard();");
    autoResizeDiv();

    // Set board location..
    boardLocation = 0;

    refreshBoardList(boardList);
}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for show image data in the board..
function action_modal_imageViewInBoard(board_id, url) {
    $('#modal-imageView').modal();
    var img = document.getElementById('img-view');
    var imgSrc = document.getElementById(url);
    img.src = imgSrc.src;
    resize_modal_imageView();
    // Hide pin button..
    $('#btn-addImgToBoard').attr('style', "display: none;");
    // Show remove button..
    var right = getRight(board_id);
    if(right == 'MODIFY') {
        $('#btn-removeImgFromBoard').attr('style', "");
        $('#btn-removeImgFromBoard').attr('onclick', "action_removeImgFromBoard('" + board_id + "','" + url + "');");
    }
    else {
        $('#btn-removeImgFromBoard').attr('style', "display: none;");
    }

    // Set download image link..
    $('#link-downloadImg').attr('href', "download?file=/board_data/" + url);

    // Set share image link..
    $('#btn-shareToOthers').attr('onclick', "javascript:action_modal_shareImgToUser('" + "/board_data/" + url + "');");
}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for show image data in the message box..
function action_modal_imageViewInMsgBox(img_id, imgPath) {
    $('#modal-imageView').modal();
    var img = document.getElementById('img-view');
    var imgSrc = document.getElementById(img_id);
    img.src = imgSrc.src;
    resize_modal_imageView();
    selectedImgContent = imgSrc.src;
    selectedImgPath = imgPath;
    // Show pin button..
    $('#btn-addImgToBoard').attr('style', "");
    // Hide remove button..
    $('#btn-removeImgFromBoard').attr('style', "display: none;");

    // Set download image link..
    $('#link-downloadImg').attr('href', "download?file=" + imgPath);

    // Set share image link..
    $('#btn-shareToOthers').attr('onclick', "javascript:action_modal_shareImgToUser('" + imgPath + "');");
}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for show image data in the board..
function action_modal_shareImgToUser(filePath) {
    $('#modal-shareImg').modal();
    var img = document.getElementById('img-share');
    var imgSrc = document.getElementById('img-view');
    img.src = imgSrc.src;
    shareContent = imgSrc.src;
    sharePath = filePath;
    resize_modal_shareImgView();

    // Refresh contact list..
    var parentUl = $('#panel-contacts').children('ul');
    var cloneSample = $("<li id='test20@outlook.com' style='display: list-item; cursor: pointer;'>" +
                            "<div class='user' onclick='javascript:selectUserFromShareList(\'Test20\',\'test20@outlook.com\',\'undefined\', \'CONTACT\')'>" +
                                "<div class='avatar' style=''>" +
                                    "<img src='/images/man.png' style='height: 30px; width: 30px;'>" +
                                    "<div class='status contacted-offline' style='margin-left: 25px; margin-top: -10px;'></div></div>" +
                            "<div class='name' style='float: left; margin-left: 40px; margin-top: -30px;'>Test20(test20@outlook.com)</div></div></li>");

    parentUl.html('');

    for(var i in contactList){
        var oneUser = contactList[i];
        if(oneUser.email == conciergeEmail)
            continue;

        var cloneLi = cloneSample.clone();
        cloneLi.attr('id', oneUser.email);
        cloneLi.children('div').attr('onclick', "javascript:selectUserFromShareList('" + oneUser.email + "','" + filePath + "');");
        cloneLi.children('div').children('div:first').children('img').attr('src', oneUser.img);

        var connectStatus = "";
        var connectedUser = connectedUserList.find(function(oneUser) {
            return oneUser.email === oneUser.email;
        });
        if(connectedUser) {
            connectStatus = "online";
        }
        else {
            connectStatus = "offline";
        }

        if(oneUser.state == "CONTACTED") {
            state = "status contacted-";
        }
        else {
            continue;
        }

        cloneLi.children('div').children('div:first').children('div').attr('class', state + connectStatus);
        cloneLi.children('div').children('div:last').text(oneUser.username + "(" + oneUser.email + ")");

        parentUl.append(cloneLi);
    }

    // Add group contact..
    for(var i in grpList){
        var oneGrp = grpList[i];

        var cloneLi = cloneSample.clone();
        cloneLi.attr('id', oneGrp.grpID);
        cloneLi.children('div').attr('onclick', "javascript:selectGrpFromShareList('" + oneGrp.grpID + "','" + filePath + "');");
        cloneLi.children('div').children('div:first').children('img').attr('src', "/images/group.png");

        var connectStatus = "status contacted-online";
        // alert(state + connectStatus);

        cloneLi.children('div').children('div:first').children('div').attr('class', state + connectStatus);
        cloneLi.children('div').children('div:last').text(oneUser.username + "(" + oneGrp.grpUsers.length + " members)");

        cloneLi.show();
        parentUl.prepend(cloneLi);
    }

}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for show image data in the board..
function refreshSharePersonList(personList, isContact) {
    // Refresh contact list..
    var parentUl = $('#panel-contacts').children('ul');
    var cloneSample = $("<li id='test20@outlook.com' style='display: list-item; cursor: pointer;'>" +
                            "<div class='user' onclick='javascript:selectUserFromShareList(\'Test20\',\'test20@outlook.com\',\'undefined\', \'CONTACT\')'>" +
                                "<div class='avatar' style=''>" +
                                    "<img src='/images/man.png' style='height: 30px; width: 30px;'>" +
                                    "<div class='status contacted-offline' style='margin-left: 25px; margin-top: -10px;'></div></div>" +
                            "<div class='name' style='float: left; margin-left: 40px; margin-top: -30px;'>Test20(test20@outlook.com)</div></div></li>");

    parentUl.html('');

    if(isContact) {
        for (var i in contactList) {
            var oneUser = contactList[i];
            if (oneUser.email == conciergeEmail)
                continue;

            var cloneLi = cloneSample.clone();
            cloneLi.attr('id', oneUser.email);
            cloneLi.children('div').attr('onclick', "javascript:selectUserFromShareList('" + oneUser.email + "','" + sharePath + "');");
            cloneLi.children('div').children('div:first').children('img').attr('src', oneUser.img);

            var connectStatus = "";
            var connectedUser = connectedUserList.find(function (oneUser) {
                return oneUser.email === oneUser.email;
            });
            if (connectedUser) {
                connectStatus = "online";
            }
            else {
                connectStatus = "offline";
            }

            if (oneUser.state == "CONTACTED") {
                state = "status contacted-";
            }
            else {
                continue;
            }

            cloneLi.children('div').children('div:first').children('div').attr('class', state + connectStatus);
            cloneLi.children('div').children('div:last').text(oneUser.username + "(" + oneUser.email + ")");

            parentUl.append(cloneLi);
        }

        // Add group contact..
        for (var i in grpList) {
            var oneGrp = grpList[i];

            var cloneLi = cloneSample.clone();
            cloneLi.attr('id', oneGrp.grpID);
            cloneLi.children('div').attr('onclick', "javascript:selectGrpFromShareList('" + oneGrp.grpID + "','" + sharePath + "');");
            cloneLi.children('div').children('div:first').children('img').attr('src', "/images/group.png");

            var connectStatus = "status contacted-online";
            // alert(state + connectStatus);

            cloneLi.children('div').children('div:first').children('div').attr('class', state + connectStatus);
            cloneLi.children('div').children('div:last').text(oneUser.username + "(" + oneGrp.grpUsers.length + " members)");

            cloneLi.show();
            parentUl.prepend(cloneLi);
        }
    }
    else {
        for (var i in personList) {
            var oneUser = personList[i].local;
            if (oneUser.email == conciergeEmail)
                continue;

            var cloneLi = cloneSample.clone();
            cloneLi.attr('id', oneUser.email);
            cloneLi.children('div').attr('onclick', "javascript:selectUserFromSearchShareList('" + oneUser.username + "','" + oneUser.email + "','" + sharePath + "');");
            cloneLi.children('div').children('div:first').children('img').attr('src', oneUser.img);

            var connectStatus = "";
            var connectedUser = connectedUserList.find(function (oneUser) {
                return oneUser.email === oneUser.email;
            });

            state = "status away-offline";

            cloneLi.children('div').children('div:first').children('div').attr('class', state + connectStatus);
            cloneLi.children('div').children('div:last').text(oneUser.username + "(" + oneUser.email + ")");

            parentUl.append(cloneLi);
        }
    }
}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for show image data in the board..
function resize_modal_imageView() {
    var img = document.getElementById('img-view');

    var height = img.naturalHeight;
    var width = img.naturalWidth;
    var ratio = width / height;

    var windowHeight = $(window).height();
    var windowWidth = $(window).width();

    var preWidth = ratio * (windowHeight - 100);

    if(windowWidth < preWidth) {
        ratio = height / width;
        width = windowWidth - 100;
        height = ratio * width;

        $('#modal-imageView-body').width(width);
        $('#modal-imageView-body').height(height);
    }
    else {
        $('#modal-imageView-body').width(preWidth);
        $('#modal-imageView-body').height(windowHeight - 100);
    }
}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for show image data in the board..
function resize_modal_shareImgView() {
    var img = document.getElementById('img-share');

    var height = img.naturalHeight;
    var width = img.naturalWidth;
    var ratio = height / width;
    var preHeight = ratio * 300;

    $('#modal-shareImgBody').height(preHeight + 20);
    $('#panel-contacts').height(preHeight - 14);
}



//////////////////////////////////////////////////////////////////////////////////////
// Send image to all other users..
function shareImgToUser(filePath) {
    var sendImg = document.getElementById('btn-sendImg');
    if(sendImg.value.length != 0){
        // Read file..
        var msgObj = {};
        var file = sendImg.files[0];
        reader = new FileReader();
        if(!reader){
            alert("Your browser doesn\'t support fileReader!");
            return;
        }
        reader.onload = function(e){
            var timeID = (new Date()).getTime();

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

                // Create data to send..
                msgObj = {
                    id: timeID,
                    state: "AS",
                    type : "ONE",
                    contact_id: "Concierge_" + userSelf.email,
                    from : userSelf.email,
                    to : "Concierge",
                    filePath: filePath,
                    img : e.target.result
                };
                sendImageToOne(msgObj);
            }
            else if(selectFlag == "BOT") {
                // Create data to send..
                msgObj = {
                    type : "BOT",
                    from : userSelf.email,
                    to : "BOT",
                    filePath: filePath,
                    img : e.target.result
                };

                processMsgForBOT("ase");
            }
            else if(selectFlag == "ONE") {
                // Create data to send..
                msgObj = {
                    id: timeID,
                    state: "ND",
                    type : "ONE",
                    contact_id: userSelected.contact_id,
                    from : userSelf.email,
                    to : userSelected.email,
                    filePath: filePath,
                    img : e.target.result
                };
                // Send data..
                sendImageToOne(msgObj);
            }
            else if(selectFlag == "GRP") {
                // for(var i in grpSelected.grpUsers) {
                //     if(grpSelected.grpUsers[i].email == userSelf.email)
                //         continue;

                msgObj = {
                    id: timeID,
                    state: "ND",
                    type : "GRP",
                    grpID : grpSelected.grpID,
                    from : userSelf.email,
                    to : grpSelected.grpUsers,
                    filePath: filePath,
                    img : e.target.result
                };
                // Send data..
                sendImageToGrp(msgObj);
                // }
            }

            // Add to the dialog list..
            addImgFromUser(msgObj, true, false);
            // addImgFromUser(msgObj, false);
        };
        reader.readAsDataURL(file);
    }
}



//////////////////////////////////////////////////////////////////////////////////////
// Send image to all other users..
function sendImageToUser(filePath) {
    var sendImg = document.getElementById('btn-sendImg');
    if(sendImg.value.length != 0){
        // Read file..
        var msgObj = {};
        var file = sendImg.files[0];
        reader = new FileReader();
        if(!reader){
            alert("Your browser doesn\'t support fileReader!");
            return;
        }
        reader.onload = function(e){
            var timeID = (new Date()).getTime();

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

                // Create data to send..
                msgObj = {
                    id: timeID,
                    state: "AS",
                    type : "ONE",
                    contact_id: "Concierge_" + userSelf.email,
                    from : userSelf.email,
                    to : "Concierge",
                    filePath: filePath,
                    img : e.target.result
                };
                sendImageToOne(msgObj);
            }
            else if(selectFlag == "BOT") {
                // Create data to send..
                msgObj = {
                    type : "BOT",
                    from : userSelf.email,
                    to : "BOT",
                    filePath: filePath,
                    img : e.target.result
                };

                processMsgForBOT("ase");
            }
            else if(selectFlag == "ONE") {
                // Create data to send..
                msgObj = {
                    id: timeID,
                    state: "ND",
                    type : "ONE",
                    contact_id: userSelected.contact_id,
                    from : userSelf.email,
                    to : userSelected.email,
                    filePath: filePath,
                    img : e.target.result
                };
                // Send data..
                sendImageToOne(msgObj);
            }
            else if(selectFlag == "GRP") {
                // for(var i in grpSelected.grpUsers) {
                //     if(grpSelected.grpUsers[i].email == userSelf.email)
                //         continue;

                    msgObj = {
                        id: timeID,
                        state: "ND",
                        type : "GRP",
                        grpID : grpSelected.grpID,
                        from : userSelf.email,
                        to : grpSelected.grpUsers,
                        filePath: filePath,
                        img : e.target.result
                    };
                    // Send data..
                    sendImageToGrp(msgObj);
                // }
            }

            // Add to the dialog list..
            addImgFromUser(msgObj, true, false);
            // addImgFromUser(msgObj, false);
        };
        reader.readAsDataURL(file);
    }
}



//////////////////////////////////////////////////////////////////////////////////////
// Send image to all other users..
function sendFileToUser(filePath) {
    // Send uploaded file to the server..
    var timeID = (new Date()).getTime();

    var fileType = "file";
    if(filePath) {
        fileType = getFileType(filePath);
    }
    var fileIcon = fileType + ".png";

    if(selectFlag == "CON") {
        // Send notice email to the concierge..
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

        // Create data to send..
        msgObj = {
            id: timeID,
            state: "AS",
            type : "ONE",
            contact_id: "Concierge_" + userSelf.email,
            from : userSelf.email,
            to : "Concierge",
            filePath: filePath,
            fileIcon: fileIcon
        };
        sendFileToOne(msgObj);
    }
    else if(selectFlag == "BOT") {
        // Create data to send..
        msgObj = {
            type : "BOT",
            from : userSelf.email,
            to : "BOT",
            filePath: filePath,
            fileIcon: fileIcon
        };

        processMsgForBOT("ase");
    }
    else if(selectFlag == "ONE") {
        // Create data to send..
        msgObj = {
            id: timeID,
            state: "ND",
            type : "ONE",
            contact_id: userSelected.contact_id,
            from : userSelf.email,
            to : userSelected.email,
            filePath: filePath,
            fileIcon: fileIcon
        };
        // Send data..
        sendFileToOne(msgObj);
    }
    else if(selectFlag == "GRP") {
        msgObj = {
            id: timeID,
            state: "ND",
            type : "GRP",
            grpID : grpSelected.grpID,
            from : userSelf.email,
            to : grpSelected.grpUsers,
            filePath: filePath,
            fileIcon: fileIcon
        };
        // Send data..
        sendFileToGrp(msgObj);
    }

    // Add to the dialog list..
    addFileFromUser(msgObj, true, false);
}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Show search bar..
function getFileType(filePath) {
    var type = filePath.substring(filePath.length - 4).toLowerCase();

    switch (type) {
        case ".png":
        case ".jpg":
        case "jpeg":
        case ".bmp":
        case ".tif":
        case "tiff":
        case ".psd":
            return "img";

        case ".txt":
            return "txt";

        case ".doc":
        case "docx":
            return "doc";
        case ".xls":
        case "xlsx":
            return "xls";
        case ".ppt":
        case "pptx":
            return "ppt";

        case ".pdf":
            return "pdf";

        default:
            return "file";
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
                                "<div class='msg-alarm'>12</div>" +
                                "<div class='name'>Name</div>" +
                                "<div class='mood'>Mood for this</div></div></li>");
    parentUl.html('');

    // alert(cloneSample);
    var state = "";

    // Add individual contact..
    for(var i in userList){
        if(userList[i].email == conciergeEmail)
            continue;

        var cloneLi = cloneSample.clone();
        // cloneLi.attr('id', userList[i].email);
        cloneLi.attr('id', userList[i].contact_id);
        cloneLi.children('div').attr('onclick', "javascript:selectUserFromList('" + userList[i].username + "','" + userList[i].contact_id + "','" + userList[i].id + "','CONTACT');");
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

        if(userList[i].msg_budge == 0) {
            cloneLi.children('div').children('div:first').next().attr('style', "display:none;");
        }
        else {
            cloneLi.children('div').children('div:first').next().text(userList[i].msg_budge);
        }

        cloneLi.children('div').children('div:first').next().next().text(userList[i].username);
        cloneLi.children('div').children('div:last').text(userList[i].email);

        cloneLi.show();
        if(userList[i].state == "CONTACTED") {
            parentUl.prepend(cloneLi);
        }
        else {
            parentUl.append(cloneLi);
        }
    }

    // Add group contact..
    for(var i in grpList){
        var cloneLi = cloneSample.clone();
        cloneLi.attr('id', grpList[i].grpID);
        cloneLi.children('div').attr('onclick', "javascript:selectGrpFromList('" + grpList[i].grpID + "','" + grpList[i].grpName + "');");
        cloneLi.children('div').children('div:first').children('img').attr('src', "/images/group.png");

        var connectStatus = "status contacted-online";
        // alert(state + connectStatus);

        cloneLi.children('div').children('div:first').children('div').attr('class', state + connectStatus);
        if(grpList[i].msg_budge == 0 || grpList[i].msg_budge == undefined) {
            cloneLi.children('div').children('div:first').next().attr('style', "display:none;");
        }
        else {
            cloneLi.children('div').children('div:first').next().text(grpList[i].msg_budge);
        }

        cloneLi.children('div').children('div:first').next().next().text(grpList[i].grpName);
        var grpUserNames = "";
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
        selectUserFromList(userSelected.username, userSelected.contact_id, userSelected.id, "CONTACT");
    }
    else {
        selectGrpFromList(grpSelected.grpID, grpSelected.grpName);
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add sent/received message in UI..
function loadMessages(convList){
    // var convList = [
    //     conv_id: String,                    /* id of this conversation, same as contact id if type is one or con, group id if type is grp */
    //     type: String,                       /* 1- CON,   2 - ONE, 3 - GRP */
    //     timestamp: String,                  /* Time stamp of this conversation.. */
    //     from: String,                       /* Email of sender.. */
    //     msg_type: String,                   /* 1- TEXT,                                     2 - IMG,                                        3 - FILE                    */
    //     msg_subtype: String,                /* TEXT - "",                                   IMG - "" OR JPEG, PNG, ...,                     FILE - PDF, WORD, EXCEL, .. */
    //     msg_content: String                 /* TEXT - message of text,                      IMG - Content of image                          FILE - Path of file..       */
    // ];


    for(var i in convList) {
        var oneMsg = convList[i];
        var isSelf = false;
        if(oneMsg.from == userSelf.email) {
            isSelf = true;
        }

        if(oneMsg.msg_type == "TEXT") {
            var msgData = {
                conv_id: oneMsg.conv_id,
                type: oneMsg.type,
                from: oneMsg.from,
                timestamp: oneMsg.timestamp,
                to: "ND",
                msg: oneMsg.msg_content
            };
            addMsgFromUser(msgData, isSelf, true);
        }
        else if(oneMsg.msg_type == "IMG") {
            var imgData = {
                conv_id: oneMsg.conv_id,
                type: oneMsg.type,
                from: oneMsg.from,
                timestamp: oneMsg.timestamp,
                filePath: oneMsg.msg_subtype,
                to: "ND",
                img: oneMsg.msg_content
            };
            addImgFromUser(imgData, isSelf, true);
        }
        else if(oneMsg.msg_type == "FILE") {
            var fileData = {
                conv_id: oneMsg.conv_id,
                type: oneMsg.type,
                from: oneMsg.from,
                timestamp: oneMsg.timestamp,
                filePath: oneMsg.msg_subtype,
                to: "ND",
                fileIcon: oneMsg.msg_content
            };
            addFileFromUser(fileData, isSelf, true);
        }
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add sent/received message in UI..
function addMsgFromUser(msgObj, isSelf, isLoad){
    // msgObj = {
    //     type: "BOT" / "ONE" / "GRP",
    //     from: ""     // email of sender,
    //     to: "",      // email of receiver..
    //     msg: ""
    // }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // For budge of message..
    var contact_id;
    if(!isLoad &&
        msgObj.contact_id != curConvId && msgObj.grpID != curConvId &&
        msgObj.type != "BOT")
    {
        contact_id = msgObj.contact_id != undefined ? msgObj.contact_id : msgObj.grpID;
        setMessageBudge(contact_id, msgObj.msg_budge);
        return;
    }

    if(!isLoad && !isSelf && msgObj.type != "BOT") {
        // Let server to reset its message budge..
        contact_id = msgObj.contact_id != undefined ? msgObj.contact_id : msgObj.grpID;
        var dataObj = {
            type: msgObj.type,
            email: userSelf.email,
            contact_id: contact_id
        };

        socket.emit("resetBudge", dataObj);
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Create message according type..
    var msgType = isSelf ? "message-reply" : "message-receive";
    var msgHtml = $('<div><div class="message-info">' +
                            '<div class="msguser-info">' +
                                '<img src="/images/man.jpg" class="user-avatar img-thumbnail"></div>' +
                            '<div class="message-username">TEST1</div>' +
                            '<div class="message-content-box">' +
                                '<div class="arrow"></div>' +
                                '<div class="message-content">test</div></div></div>' +
                        '<div class="message-time">13:01 22/7/2016</div></div>');

    // Get current time stamp..
    var timeStamp;
    if(isLoad) {
        timeStamp = getTimeStamp(msgObj.timestamp);
    }
    else {
        timeStamp = getTimeStamp();
    }

    if(msgObj.msg == undefined) {
        return;
    }

    var msgContent = msgObj.msg.replace(/\n/g, '<br>');

    var msgInfo = {};

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
        else if(msgObj.type == "CON"){
            msgInfo = {
                img: "/images/concierge.png",
                username: "Concierge"
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
            var grpID;
            if(isLoad) {
                grpID = msgObj.conv_id;
            }
            else {
                grpID = msgObj.grpID;
            }

            for(var i = 0; i < grpList.length; i++) {
                if(grpList[i].grpID == grpID) {
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

    // Add values to the elements..
    msgHtml.addClass(msgType);

    msgHtml.children('.message-info').children('.msguser-info').children('.user-avatar').attr('src',msgInfo.img);
    msgHtml.children('.message-info').children('.msguser-info').children('.user-avatar').attr('title', msgInfo.username);
    msgHtml.children('.message-info').children('.message-content-box').children('.message-content').html(msgContent);
    // Set color for send result at self message..
    if(isSelf && !isLoad && msgObj.type != "BOT") {
        var msgID = "msg_" + msgObj.id;
        msgHtml.children('.message-info').children('.message-content-box').children('.message-content').attr('style', "color: #bfa4a4;");
        msgHtml.children('.message-info').children('.message-content-box').children('.message-content').attr('id', msgID);
    }
    msgHtml.children('.message-info').children('.message-username').text(msgInfo.username);
    msgHtml.children('.message-time').text(timeStamp);
    $('.msg-content').append(msgHtml);

    // Scroll to the bottom..
    $(".msg-content").scrollTop($(".msg-content")[0].scrollHeight);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add sent/received image to UI..
function addImgFromUser(msgObj, isSelf, isLoad){
    // format:{
    //     type : type of message..
    //     from : sender.email,
    //     to : receiver.email,
    //     img : e.target.result,
    // }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // For budge of message..
    var contact_id;
    if(!isLoad &&
        msgObj.contact_id != curConvId && msgObj.grpID != curConvId &&
        msgObj.type != "BOT") {
        contact_id = msgObj.contact_id != undefined ? msgObj.contact_id : msgObj.grpID;
        setMessageBudge(contact_id, msgObj.msg_budge);
        return;
    }

    if(!isLoad && !isSelf && msgObj.type != "BOT") {
        // Let server to reset its message budge..
        contact_id = msgObj.contact_id != undefined ? msgObj.contact_id : msgObj.grpID;
        var dataObj = {
            type: msgObj.type,
            email: userSelf.email,
            contact_id: contact_id
        };

        socket.emit("resetBudge", dataObj);
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    var msgType = isSelf?"message-reply":"message-receive";
    var msgHtml = $('<div><div class="message-info">' +
                            '<div class="msguser-info">' +
                                '<img src="/images/man.jpg" class="user-avatar img-thumbnail"></div>' +
                            '<div class="message-username">TEST1</div>' +
                            '<div onclick="action_modal_imageViewInMsgBox(img_id)" class="message-content-box", style="background: transparent; box-shadow: 0px -1px 3px 1px #eeeeee; cursor: pointer;">' +
                                '<div class="arrow"></div>' +
                                '<div class="message-content">test</div></div></div>' +
                        '<div class="message-time">13:01 22/7/2016</div></div>');


    if(msgObj.img == undefined) {
        return;
    }

    // Get current time stamp..
    var timeStamp;
    if(!isLoad) {
        timeStamp = getTimeStamp();
    }
    else {
        timeStamp = getTimeStamp(msgObj.timestamp);
    }

    var msgInfo = {};
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
        else if(msgObj.type == "CON"){
            msgInfo = {
                img: "/images/concierge.png",
                username: "Concierge"
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
            var grpID;
            if(isLoad) {
                grpID = msgObj.conv_id;
            }
            else {
                grpID = msgObj.grpID;
            }

            for(var i = 0; i < grpList.length; i++) {
                if(grpList[i].grpID == grpID) {
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

    var timeID = (new Date()).getTime();
    var imgID = msgObj.type + "_" + msgType + "_img" + timeID;
	msgHtml.addClass(msgType);
	msgHtml.children('.message-info').children('.msguser-info').children('.user-avatar').attr('src',msgInfo.img);
	msgHtml.children('.message-info').children('.msguser-info').children('.user-avatar').attr('title',msgInfo.username);
    msgHtml.children('.message-info').children('.message-username').text(msgInfo.username + " added:");
    msgHtml.children('.message-info').children('.message-content-box').attr('onclick', "javascript:action_modal_imageViewInMsgBox('" + imgID + "','" + msgObj.filePath +"');");
	msgHtml.children('.message-info').children('.message-content-box').children('.message-content').html("<img id='" + imgID + "' src='" + msgObj.img + "', style='max-height: 200px; max-width: 200px'>");
    msgHtml.children('.message-time').text(timeStamp);
	$('.msg-content').append(msgHtml);
	$(".msg-content").scrollTop($(".msg-content")[0].scrollHeight);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add sent/received image to UI..
function addFileFromUser(msgObj, isSelf, isLoad){
    // format:{
    //     id: timeID,
    //     state: "ND",
    //     type: "GRP",
    //     msg_budge: contact.msg_budge + 1,
    //     contact_id: "Concierge_" + userSelf.email,           // OR grpID
    //     grpID: grpSelected.grpID,
    //     from: userSelf.email,
    //     to: grpSelected.grpUsers,
    //     filePath: filePath,
    //     fileIcon: fileIcon
    // };

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // For budge of message..
    var contact_id;
    if(!isLoad &&
        msgObj.contact_id != curConvId && msgObj.grpID != curConvId &&
        msgObj.type != "BOT") {
        contact_id = msgObj.contact_id != undefined ? msgObj.contact_id : msgObj.grpID;
        setMessageBudge(contact_id, msgObj.msg_budge);
        return;
    }

    if(!isLoad && !isSelf && msgObj.type != "BOT") {
        // Let server to reset its message budge..
        contact_id = msgObj.contact_id != undefined ? msgObj.contact_id : msgObj.grpID;
        var dataObj = {
            type: msgObj.type,
            email: userSelf.email,
            contact_id: contact_id
        };
        socket.emit("resetBudge", dataObj);
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var msgType = isSelf?"message-reply":"message-receive";
    var msgHtml = $('<div><div class="message-info">' +
                            '<div class="msguser-info">' +
                                '<img src="/images/man.jpg" class="user-avatar img-thumbnail"></div>' +
                            '<div class="message-username">TEST1</div>' +
                            '<a href="download?file=" class="message-content-box", style="background: transparent; box-shadow: 0px -1px 3px 1px #eeeeee; cursor: pointer;">' +
                                '<div class="arrow"></div>' +
                                '<div class="message-content">test</div></a></div>' +
                        '<div class="message-time">13:01 22/7/2016</div></div>');

    // Get current time stamp..
    var timeStamp;
    if(!isLoad) {
        timeStamp = getTimeStamp();
    }
    else {
        timeStamp = getTimeStamp(msgObj.timestamp);
    }

    var msgInfo = {};
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
        else if(msgObj.type == "CON"){
            msgInfo = {
                img: "/images/concierge.png",
                username: "Concierge"
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
            var grpID;
            if(isLoad) {
                grpID = msgObj.conv_id;
            }
            else {
                grpID = msgObj.grpID;
            }

            for(var i = 0; i < grpList.length; i++) {
                if(grpList[i].grpID == grpID) {
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

    var timeID = (new Date()).getTime();
    var fileID = msgObj.type + "_" + msgType + "_file" + timeID;
    msgHtml.addClass(msgType);
    msgHtml.children('.message-info').children('.msguser-info').children('.user-avatar').attr('src',msgInfo.img);
    msgHtml.children('.message-info').children('.msguser-info').children('.user-avatar').attr('title',msgInfo.username);
    msgHtml.children('.message-info').children('.message-username').text(msgInfo.username + " sent:");
    msgHtml.children('.message-info').children('.message-content-box').attr('href', "download?file=" + msgObj.filePath);
    msgHtml.children('.message-info').children('.message-content-box').children('.message-content').html("<img id='" + fileID + "' src='/images/icons/" + msgObj.fileIcon + "' style='max-height: 200px; max-width: 200px'>" +
    "<div style='font-size: 10px; text-align: right; color: #737272;'>Download file</div>");

    msgHtml.children('.message-time').text(timeStamp);
    $('.msg-content').append(msgHtml);
    $(".msg-content").scrollTop($(".msg-content")[0].scrollHeight + 300);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Set budge for the message..
function addFileToUploadList(fileData) {
    // var fileData = {
    //     fileID: timeId + "_" + i,
    //     fileData: files[i]
    // };

    outConsole('Files loaded', fileData);

    // Add file information to the upload list..
    var cloneSample = $('<li id="imgItem" style="display: list-item" class="addImg-item">' +
                            '<div id="btn-removeImgFromList" onclick="javascript:removeFromUploading(fileID);" style="float:left; cursor: pointer;" class="glyphicon glyphicon-remove"></div>' +
                            '<div id="panel-imageName" style="margin-left: 26px;">This is text</div></li>');

    var parentUl = $('.addImg-ul');

    cloneSample.attr('id', fileData.fileID);
    cloneSample.children('div:first').attr('onclick', "javascript:removeFileFromUploadList('" + fileData.fileID + "');");
    cloneSample.children('div:last').text(fileData.fileData.name);

    parentUl.append(cloneSample);

    uploadFiles.push(fileData);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Set budge for the message..
function removeFileFromUploadList(file_id) {
    var fileList = $('.addImg-ul').children('li');
    // $('.addImg-ul').remove(file_id);

    // Set user to select..
    for(var i = 0; i < fileList.length; i++) {
        var oneFile = fileList.get(i);
        if(oneFile.id == file_id) {
            outConsole("Remove item", oneFile);
            uploadFiles.splice(i, 1);
            break;
        }
    }

    outConsole("upload Files", uploadFiles);
    refreshUpdateList();
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Set budge for the message..
function refreshUpdateList() {
    // var fileData = {
    //     fileID: timeId + "_" + i,
    //     fileData: files[i]
    // };

    // Add file information to the upload list..
    var cloneSample = $('<li id="imgItem" style="display: list-item" class="addImg-item">' +
                            '<div id="btn-removeImgFromList" onclick="javascript:removeFromUploading(fileID);" style="float:left; cursor: pointer;" class="glyphicon glyphicon-remove"></div>' +
                            '<div id="panel-imageName" style="margin-left: 26px;">This is text</div></li>');

    var parentUl = $('.addImg-ul');
    parentUl.html('');

    for(var i in uploadFiles) {
        var cloneLi = cloneSample.clone();
        var fileData = uploadFiles[i];
        cloneLi.attr('id', fileData.fileID);
        cloneLi.children('div:first').attr('onclick', "javascript:removeFileFromUploadList('" + fileData.fileID + "');");
        cloneLi.children('div:last').text(fileData.fileData.name);
        parentUl.append(cloneLi);
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Set budge for the message..
function action_uploadFilesToServer() {
    // var fileList = [
    //      {
    //          fileID: timeId + "_" + i,
    //          fileData: files[i]
    //      }
    // ];


    // create a FormData object which will be sent as the data payload in the
    // AJAX request
    var formData = new FormData();

    // add the files to formData object for the data payload
    for(var i in uploadFiles) {
        var oneData = uploadFiles[i];
        outConsole("Data", oneData);
        formData.append('uploads[]', oneData.fileData, oneData.fileData.name + "_!_" + userSelf.email);
    }

    $.ajax({
        url: '/upload-board',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(data){
            action_addImgToBoard(uploadBoardID);
        }
        // , xhr: function() {
        //     // create an XMLHttpRequest
        //     var xhr = new XMLHttpRequest();
        //
        //     // listen to the 'progress' event
        //     xhr.upload.addEventListener('progress', function(evt) {
        //
        //         if (evt.lengthComputable) {
        //             // calculate the percentage of upload completed
        //             var percentComplete = evt.loaded / evt.total;
        //             percentComplete = parseInt(percentComplete * 100);
        //
        //             // update the Bootstrap progress bar with the new percentage
        //             $('.progress-bar').text(percentComplete + '%');
        //             $('.progress-bar').width(percentComplete + '%');
        //
        //             // once the upload reaches 100%, set the progress bar text to done
        //             if (percentComplete === 100) {
        //                 $('.progress-bar').html('Done');
        //             }
        //
        //         }
        //
        //     }, false);
        //
        //     return xhr;
        // }
    });
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Set budge for the message..
function finalizeUploading() {

}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Set budge for the message..
function setMessageBudge(contact_id, budge) {
    var parentUl = $('.user-content').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Set user to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        if(user.id == contact_id) {
            var budgeItem = user.children[0].children[1];
            if(budge != 0) {
                budgeItem.setAttribute("style", "");
                budgeItem.innerHTML = budge;
            }
            else {
                budgeItem.setAttribute("style", "display: none;");
            }
            break;
        }
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Add sent/received message in UI..
function showMessageResult(msgObj){
    // msgObj = {
    //      result: result,
    //      msgID: msgObj.id
    // }

    // Set color for send result at self message..
    var msgBar = document.getElementById("msg_" + msgObj.msgID);
    if(!msgBar)
        return;

    if(msgObj.result == "true") {
        msgBar.setAttribute('style', "color: #fff6ea;");
        var msgData = messageQueue.find(function(oneData) {
            return oneData.id === msgObj.msgID;
        });
        messageQueue.splice(messageQueue.indexOf(msgData), 1);
    }
    else if(msgObj.result == "false"){
        msgBar.setAttribute('style', "color: #e48f8f;");
        var msgData = messageQueue.find(function(oneData) {
            return oneData.id === msgObj.msgID;
        });
        msgData.state = "NS";
    }
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

    // Clear message contents..
    $('#messages').html('');

    // Set grp to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        if(user.id == grpID) {
            user.setAttribute("style", "background-color: #eee;");
            selectedIndex = i;
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

    curConvId = grpID;
    // Load conversation content of this user..
    var msgObj = {
        type: "GRP",
        from: userSelf.email,
        obj_email: grpSelected.grpUsers,
        contact_id: grpID
    };
    socket.emit('loadConv', msgObj);
    setMessageBudge(grpID, 0);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for selecting new user to chat with..
function selectUserFromList(name, contact_id, id, type){
    var parentUl = $('.user-content').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Clear message contents..
    $('#messages').html('');

    // Set user to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        if(user.id == contact_id) {
            user.setAttribute("style", "background-color: #eee;");
            selectedIndex = i;
        }
        else {
            user.setAttribute("style", "");
        }
    }

    disableActionButton();

    // Find selected user from the contact list..
    var contactUser = contactList.find(function(oneContactUser) {
        return oneContactUser.contact_id === contact_id;
    });

    var img;
    var email;
    if(contactUser == undefined && type == "SEARCH") {
        enableActionButton("add");
        email = contact_id;
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
        email = contactUser.email;
    }

    img = getUserImg(type, email);


    var oneUser = {
        id : id,
        contact_id: contact_id,
        username : name,
        email : email,
        img : img
    };

    selectFlag = "ONE";
    userSelected = oneUser;

    showUserInfo(oneUser);

    if(type == "CONTACT") {
        curConvId = contactUser.contact_id;
        // Load conversation content of this user..
        var msgObj = {
            type: "ONE",
            from: userSelf.email,
            obj_email: contactUser.email,
            contact_id: curConvId
        };
        socket.emit('loadConv', msgObj);
        setMessageBudge(contact_id, 0);
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for selecting new user to chat with..
function selectBotFromList(){
    var parentUl = $('.user-content').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Clear message contents..
    $('#messages').html('');

    // Set user to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        user.setAttribute("style", "");
    }
    users.get(1).setAttribute("style", "background-color: #eee;");
    selectedIndex = 1;

    disableActionButton();
    var oneUser = {
        id : "BOT",
        contact_id: "BOT",
        username : "CHAT BOT",
        email : "CHATEMAIL",
        img : "/images/bot.png"
    };

    selectFlag = "BOT";
    userSelected = oneUser;

    showUserInfo(oneUser);
    connectChatBot();

    curConvId = "BOT";
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for selecting new user to chat with..
function selectConciergeFromList(){
    var parentUl = $('.user-content').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Clear message contents..
    $('#messages').html('');

    // Set user to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        user.setAttribute("style", "");
    }
    users.get(0).setAttribute("style", "background-color: #eee;");
    selectedIndex = 0;

    disableActionButton();
    var oneUser = {
        id : "CONCIERGE",
        contact_id: "Concierge_" + userSelf.email,
        username : "Concierge",
        email : "CONCIERGE EMAIL",
        img : "/images/concierge.png"
    };

    selectFlag = "CON";
    userSelected = oneUser;

    showUserInfo(oneUser);

    curConvId = "Concierge_" + userSelf.email;
    // Load conversation content of this user..
    var msgObj = {
        from: userSelf.email,
        contact_id: "Concierge_" + userSelf.email
    };
    socket.emit('loadConv', msgObj);
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
                var toRemove = grpChatInfo.grpUsers.find(function(oneUser) {
                    return oneUser.email === userInfo.email;
                });
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


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for selecting new user to chat with..
function selectUserFromShareList(toEmail, filePath){
    var parentUl = $('#panel-contacts').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Set user to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        if(user.id == toEmail) {
            user.setAttribute("style", "background-color: #ffffff; cursor: pointer;");
            shareFlag = 0;
            userToShare = toEmail;
            sharePath = filePath;
        }
        else {
            user.setAttribute("style", "cursor: pointer;");
        }
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for selecting new user to chat with..
function selectUserFromSearchShareList(toEmail, filePath){
    var parentUl = $('#panel-contacts').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Set user to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        if(user.id == toEmail) {
            user.setAttribute("style", "background-color: #ffffff; cursor: pointer;");
            if(isContact == "true") {
                shareFlag = 0;
            }
            else {
                var isAvailable = contactList.find(function(one) {
                    return oneUser.email === toEmail;
                });
                if(isAvailable)
                    shareFlag  = 0;
                else
                    shareFlag = 2;
            }
            userToShare = toEmail;
            sharePath = filePath;
        }
        else {
            user.setAttribute("style", "cursor: pointer;");
        }
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action for selecting new user to chat with..
function selectGrpFromShareList(grpID, filePath){
    var parentUl = $('#panel-contacts').children('ul');
    var users = parentUl.children('li');
    var user = users.get(0);

    // Set user to select..
    for(var i = 0; i < users.length; i++) {
        user = users.get(i);
        if(user.id == grpID) {
            user.setAttribute("style", "background-color: #ffffff; cursor: pointer;");
            shareFlag = 1;
            userToShare = grpID;
            sharePath = filePath;
        }
        else {
            user.setAttribute("style", "cursor: pointer;");
        }
    }
}


//////////////////////////////////////////////////////////////////////////////////////
// Select a board from a pin modal..
function selectBoardFromPinModal(board_id, imgCount, collaboratorNum) {
    var parentUl = $('#panel-board-list').children('ul');
    var boardItems = parentUl.children('li');
    var boardItem = boardItems.get(0);

    // Set user to select..
    for(var i = 0; i < boardItems.length; i++) {
        boardItem = boardItems.get(i);
        if(boardItem.id == board_id) {
            boardItem.setAttribute("style", "background-color: #e8e8e8;");
        }
        else {
            boardItem.setAttribute("style", "");
        }
    }

    var suffix = "";
    if(imgCount > 1)    suffix = "s";
    $('#panel-board-info').children('div:first').text(imgCount + " Image" + suffix);

    if(collaboratorNum > 1){
        suffix = "s";
    }
    else {
        suffix = "";
    }
    $('#panel-board-info').children('div:last').text(collaboratorNum + " Collaborator" + suffix);
    selectedBoardFromPinModal = board_id;
}



//////////////////////////////////////////////////////////////////////////////////////
// Select a board from a pin modal..
function action_shareImgToUser() {
    var timeID = (new Date()).getTime();
    var msgObj;

    if(shareFlag == 0) {
        // Find selected user from the contact list..
        var contactUser = contactList.find(function(oneContactUser) {
            return oneContactUser.email === userToShare;
        });

        if(!contactUser) return;

        // Create data to send..
        msgObj = {
            id: timeID,
            state: "ND",
            type: "ONE",
            contact_id: contactUser.contact_id,
            from: userSelf.email,
            to: userToShare,
            filePath: sharePath,
            img: shareContent
        };
        sendImageToOne(msgObj);

        if(selectFlag == "ONE" && userSelected.email == userToShare) {
            addImgFromUser(msgObj, true, false);
        }
    }
    else if(shareFlag == 1) {
        // Find selected group from the grp list..
        var contactGrp = grpList.find(function(oneGrp) {
            return oneGrp.grpID === userToShare;
        });

        if(!contactGrp) return;

        msgObj = {
            id: timeID,
            state: "ND",
            type : "GRP",
            grpID : contactGrp.grpID,
            from : userSelf.email,
            to : contactGrp.grpUsers,
            filePath: sharePath,
            img : shareContent
        };
        // Send data..
        sendImageToGrp(msgObj);

        if(selectFlag == "GRP" && grpSelected.grpID == contactGrp.grpID) {
            addImgFromUser(msgObj, true, false);
        }
    }
    else if(shareFlag == 2) {
        // // Add to contact..
        // var newUser = {
        //     username:
        // }
        //
        // // Create data to send..
        // msgObj = {
        //     id: timeID,
        //     state: "ND",
        //     type: "ONE",
        //     contact_id: "",
        //     from: userSelf.email,
        //     to: userToShare,
        //     filePath: sharePath,
        //     img: shareContent,
        //     flag: "false"
        // };
        // sendImageToOne(msgObj);
        //
        // if(selectFlag == "ONE" && userSelected.email == userToShare) {
        //     addImgFromUser(msgObj, true, false);
        // }
    }

    $('#modal-shareImg').modal('hide');
}


//////////////////////////////////////////////////////////////////////////////////////
// Send request for pin to board to server..
function action_imgPinToBoard() {
    if(selectedImgContent == "" || selectedBoardFromPinModal == "")
        return;

    var msgObj = {
        from: userSelf.email,
        boardID: selectedBoardFromPinModal,
        imgPath: selectedImgPath,
        description: ""
    };

    socket.emit("pinToBoard", msgObj);

    $('#modal-addImgToBoard').modal('hide');

    selectedImgContent = "";
    selectedBoardFromPinModal = "";
    selectedImgPath = "";
}



//////////////////////////////////////////////////////////////////////////////////////
// Show create board dialog..
function action_createBoard() {
    actionQueue = 1;
    action_modal_addBoard();
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

    $('#other-infopanel').fadeIn(1000);

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
    var cloneSample = $("<li id='test2@outlook.com' style='display: list-item; min-height: 50px; margin-left: 0px; padding-top: 5px; border-bottom: 1px solid #f5f5f5;'>" +
                            "<div class='user' style='float:left;' onclick='javascript:selectUserInfoList(\'Test2\',\'test2@outlook.com\',\'YCTtcy7gs9HT0mtqAAAB\');'>" +
                                "<div class='avatar' style='float:left;'>" +
                                    "<img src='/images/man.png' class='info-avatar'>" +
                                    "<div class='status offline', style='margin-left: 30px; margin-top: -13px;'></div></div>" +
                                "<div style='padding-left: 50px; padding-top: 10px;' class='name'>Name</div></div></li>");

    parentUl.html('');

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

    // Set the name of this user to the main title..
    $('#span-mainTitle').text("Group : " + oneGrp.grpName);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Show selected user information..
function showSelfInfo(selfInfo) {
    var state = "";

    // Set user name, image of this user..
    $('#selfinfo-name').text(selfInfo.username);
    $('#selfinfo-img').attr('src', selfInfo.img);

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
        $('#selfinfo-mood').text(selfInfo.email);
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Show selected user information..
function showUserInfo(oneUser) {
    // Show user info bar if it's hidden..
    if(!infoVisibleFlag) {
        $('#other-userinfo').fadeIn(1000);
        infoVisibleFlag = true;
    }


    $('#panel-userinfo').fadeIn(1000);
    $('#other-infopanel').fadeOut(1000);

    var state = "";

    // Set user name, image of this user..
    $('#userinfo-name').text(oneUser.username);
    $('#userinfo-img').attr('src', oneUser.img);
    // Hide more details panel..
    $('#other-info').attr('style', 'display: none;');

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
function sendImageToOne(msgObj) {
    /*
    var msgObj = {
         id: timeID,
         state: "ND",
         type : "ONE",
         contact_id: userSelected.contact_id,
         from : userSelf.email,
         to : userSelected.email,
         img : e.target.result
    };
     */

    socket.emit('imgToOne', msgObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send image to one person..
function sendImageToGrp(msgObj) {
    /*
     var msgObj = {
         id: timeID,
         state: "ND",
         type : "GRP",
         grpID : grpSelected.grpID,
         from : userSelf.email,
         to : grpSelected.grpUsers,
         filePath: filePath,
         img : e.target.result
     };
     */

    socket.emit('imgToGrp', msgObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send message to one person..
function sendMessageToOne(msgObj) {

    if(msgObj.type == "BOT") {
        /*
         var msgObj = {
             type : "BOT",
             from : userSelf.email,
             to : userSelected.email,
             msg : msg
         };
         */
        socket.emit('msgToBot', msgObj);
    }
    else {
        // var msgObj = {
        //     id: timeID,
        //     state: "",
        //     type : "ONE",
        //     contact_id:      "CONCIERGE" / contact_id
        //     from : userSelf.email,
        //     to : "Concierge" / to receiver..
        //     msg : msg.val()
        // };

        socket.emit('msgToOne', msgObj);
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send message to one person..
function sendMessageToGrp(msgObj) {
    /*
     var msgObj = {
         id: timeID,
         state: "ND",
         type : "GRP",
         grpID : grpSelected.grpID,
         from : userSelf.email,
         to : grpSelected.grpUsers,
         msg : msg.val()
     };
     */

    socket.emit('msgToGrp', msgObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send image to one person..
function sendFileToOne(msgObj) {
    /*
     var msgObj = {
         id: timeID,
         state:                             "AS" - CON,                                 "ND" - ONE
         type : "ONE",
         contact_id:                        "Concierge_" + userSelf.email - CON,        contact_id - ONE
         from : userSelf.email,
         to :                               "Concierge" - CON,                          userSelected - ONE
         filePath: filePath,
         fileIcon: fileIcon
     };
     */

    socket.emit('fileToOne', msgObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send image to one person..
function sendFileToGrp(msgObj) {
    /*
     var msgObj = {
         id: timeID,
         state: "ND",
         type : "GRP",
         grpID : grpSelected.grpID,
         from : userSelf.email,
         to : grpSelected.grpUsers,
         filePath: filePath,
         fileIcon: fileIcon
     };
     */

    socket.emit('fileToGrp', msgObj);
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

    sendMessageToOne(dataObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Actions for others(key event, ..)
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send message enter function..
function keyEventMessage(e){
    var event1 = e || window.event;
    if(event1.keyCode == 13){
        $('#sendMsg').click();
        e.preventDefault();
    }
    else if(event1.keyCode == 10) {
        var text = $('#msg').val();
        $('#msg').val(text + "\n");
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
// Search share user input enter key function..
function keyEventSrchSharePerson(e){
    var event1 = e || window.event;
    if(event1.keyCode == 13){
        var search = $('#input-searchSharePerson').val();
        var dataObj = {
            from: userSelf.email,
            content: search
        };
        // socket.emit('ssPerson', dataObj);
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
function getTimeStamp(timeStamp) {
	var date;

    if(timeStamp != undefined) {
        date = new Date(parseInt(timeStamp) - (new Date()).getTimezoneOffset() * 60000);
    }
    else {
        date = new Date();
    }

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

    var timeid = (new Date()).getTime();
    var contact_id = userSelf.email + "_" + oneUser.email + "_" + timeid;
    var msgObj = {
        from: {
            username: userSelf.username,
            email: userSelf.email,
            password: userSelf.password,
            img: userSelf.img
        },
        toAdd: {
            state: userState,
            contact_id: contact_id,
            msg_budge: 0,
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
    };

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

    addMsgFromUser(msgObj, false, false);
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

    if(msgData.toLowerCase() == 'clear') {
        $('#messages').html('');
        return;
    }
    else if(msgData.toLowerCase() == 'restart'){
        count = 0;
        $('#messages').html('');
        connectChatBot();
        return;
    }
    else if(count == 0) {
        firstChoice = msgData.toLowerCase();
        if(firstChoice.indexOf('door') > -1){
            count++;
        }
        else if(firstChoice.indexOf('window') > -1){
            count += 2;
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
    sendMessageToOne(msgObj);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Get contact list user state..
function getRight(board_id) {
    var boardData = boardList.find(function(oneBoard) {
        return oneBoard.id === board_id;
    });

    if(boardData) {
        var mineInfo = boardData.collaborators.find(function(oneInfo) {
            return oneInfo.email === userSelf.email;
        });

        if(mineInfo) {
            return mineInfo.right;
        }
    }
    return "NOT";
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Get contact list user state..
function outConsole(msg, data) {
    console.log(msg + "----------");
    console.log(data);
}