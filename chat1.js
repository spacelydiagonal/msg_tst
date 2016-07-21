var io = require('socket.io')();
var _ = require('underscore');

var userList = [];
//var socketList = [];
io.on('connection',function(socket){
	//login function
	socket.on('login',function(user){
		user.id = socket.id;
		userList.push(user);
		//socketList.push(socket);
		//send the userlist to all client
		io.emit('userList',userList);
		//send the client information to client
		socket.emit('userInfo',user);
		//send login info to all.
		socket.broadcast.emit('loginInfo',user.name+" connected.");
	});

	//log out
	socket.on('disconnect',function(){
		var user = _.findWhere(userList,{id:socket.id});
		if(user){
			userList = _.without(userList,user);
			//socketList = _.without(socketList,socket);
			//send the userlist to all client
			io.emit('userList',userList);
			//send login info to all.
			socket.broadcast.emit('loginInfo',user.name+" disconnected。");
		}
	});

	//send to all
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
		socket.broadcast.emit('toAll',msgObj);
	});
	//sendImageToALL
	socket.on('sendImageToALL',function(msgObj){
		/*
			format:{
				from:{
					name:"",
					img:"",
					id:""
				},
				img:""
			}
		*/
		socket.broadcast.emit('sendImageToALL',msgObj);
	})


	//send to one
	socket.on('toOne',function(msgObj){
		/*
			format:{
				from:{
					name:"",
					img:"",
					id:""
				},
				to:"",  //socketid
				msg:""
			}
		*/
		//var toSocket = _.findWhere(socketList,{id:msgObj.to});
		var toSocket = _.findWhere(io.sockets.sockets,{id:msgObj.to});
		console.log(toSocket);
		toSocket.emit('toOne', msgObj);
	});
});

exports.listen = function(_server){
	io.listen(_server);
};