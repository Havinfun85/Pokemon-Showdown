/* tournament setup */
if (typeof tour == "undefined") {
	tour = new Object();
}
var tournamentFunctions = {
	tiers: Tools.data.Formats,
	shuffle: function(o){
		for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
		return o;
	},
	nextRound: function(room) {
		//round file names = user_id|user_id|status|user_id of who won

		if (tour[room].winners.length == 1) {
			rooms[room].addRaw("<hr /><h2>Congratulations " + sanitize(tour[room].winners[0]) + " you won the " + tour.tiers[tour[room].tier].name + " tournament.</h2><hr />");
			tour.endTour(room);
			return;
		}

		tour[room].round = [];

		tour[room].Round = tour[room].Round + 1;
		var msg = "<hr /><h2>Start of Round " + tour[room].Round + " of the " + tour.tiers[tour[room].tier].name + " Tournament</h2>";

		var object = "winners";
		if (tour[room].Round == 1) {
			var object = "players";
		}
		var object = tour[room][object];

		//clear people that move onto the next round
		if (tour[room].Round > 1) {
			tour[room].winners = [];
		}

		var len = object.length;
		var ceil = Math.ceil(len/2);
		var norm = len/2;
		for (var i = 0; i < ceil; i++) {
			var p1 = object[i * 2];
			if (ceil - 1 == i && ceil > norm) {
				//this person gets a bye
				tour[room].winners[tour[room].winners.length] = p1;
				tour[room].round[tour[room].round.length] = p1 + "|" + 0 + "|" + 2 + "|" + p1;
				msg += "<div><b><font color=\"red\">" + sanitize(p1) + " gets a bye.</font></b></div>";
			}
			else {
				//normal opponent
				var p2 = object[eval((i * 2) + '+' + 1)];
				tour[room].round[tour[room].round.length] = p1 + "|" + p2 + "|" + 0 + "|" + 0;
				msg += "<div><b>" + sanitize(p1) + " vs. " + sanitize(p2) + "</b></div>";
			}
		}
		msg += "<hr />";
		rooms[room].addRaw(msg);
	},
	startTour: function(room) {
		tour[room].status = 2;
		tour.shuffle(tour[room].players);
		tour.nextRound(room);
	},
	endTour: function(room) {
		tour[room] = {
			status: 0,
			toursize: 0,
			tier: "",
			players: [],
			round: [],
			winners: [],
			losers: [],
			overallLoser: [],
			Round: 0
		};
	}
};
for (var i in tournamentFunctions) {
	tour[i] = tournamentFunctions[i];
}
for (var i in rooms) {
	if (rooms[i].type == "lobby" && typeof tour[i] == "undefined") {
		tour[i] = {
			status: 0,
			toursize: 0,
			tier: "",
			players: [],
			round: [],
			winners: [],
			losers: [],
			overallLoser: [],
			Round: 0
		};
	}
}

/* to reload chat commands:

>> for (var i in require.cache) delete require.cache[i];parseCommand = require('./chat-commands.js').parseCommand;''

*/

var crypto = require('crypto');

/**
 * `parseCommand`. This is the function most of you are interested in,
 * apparently.
 *
 * `message` is exactly what the user typed in.
 * If the user typed in a command, `cmd` and `target` are the command (with "/"
 * omitted) and command target. Otherwise, they're both the empty string.
 *
 * For instance, say a user types in "/foo":
 * cmd === "/foo", target === "", message === "/foo bar baz"
 *
 * Or, say a user types in "/foo bar baz":
 * cmd === "foo", target === "bar baz", message === "/foo bar baz"
 *
 * Or, say a user types in "!foo bar baz":
 * cmd === "!foo", target === "bar baz", message === "!foo bar baz"
 *
 * Or, say a user types in "foo bar baz":
 * cmd === "", target === "", message === "foo bar baz"
 *
 * `user` and `socket` are the user and socket that sent the message,
 * and `room` is the room that sent the message.
 *
 * Deal with the message however you wish:
 *   return; will output the message normally: "user: message"
 *   return false; will supress the message output.
 *   returning a string will replace the message with that string,
 *     then output it normally.
 *
 */
var modlog = modlog || fs.createWriteStream('logs/modlog.txt', {flags:'a+'});
var poofeh = true;
var gitpulling = false;
var imgs = true;
var updateServerLock = false;

function parseCommandLocal(user, cmd, target, room, socket, message) {
	if (!room) return;
	cmd = cmd.toLowerCase();
	switch (cmd) {

	// tour commands 
	case 'changeannouncement':
	case 'ca':
	case 'getannouncement':
	case 'ga':
		if (!user.can('forcewin')) {
			emit(socket, 'console', 'You do not have enough authority to use this command. Access denied. Get out of here peasant.');
			return false;
		}
		if (!target) {
			fs.readFile("config/announcement.txt", function(err, data) {
				if (err) {
					return false;
				}
				emit(socket, 'console', {
					rawMessage: "<div>Announcement: <span>" + sanitize(data.toString()) + "</span></div>"
				});
			});
			return false;
		}
		fs.writeFile("config/announcement.txt", target);
		for (var i in Users.users) {
			var c = Users.users[i];
			if (c.connected) {
				c.emit('console', {
					rawMessage: 'The announcement was changed by ' + user.name + '.<script>$("#simheader").html("' + target.replace(/\"/g, '\\"') + '");</script>'
				});
			}
		}
		return false;
		break;

	//added - announcement stuff
	fs.readFile('config/announcement.txt', function(err, data) {
		if (err) return;
		var announcement = data.toString().replace(/\"/g, '\\"');
		emit(socket, 'console', {
			evalRawMessage: '$("#simheader").html("' + announcement + '");'
		});
	});

	case 'remind':
	case '!remind':
		var roomid = room.id;if (room.battle) {roomid = room.parentid;}
		if (tour[roomid].status != 1) {
			emit(socket, 'console', 'The tournament is not currently in its signup phase.');
			return false;
		}
		var tourName = tour.tiers[tour[roomid].tier].name; var vowels = ["A", "E", "I", "O", "U"]; var msg = '<h2><font color="green">A' + (((vowels.indexOf(tourName.charAt(0).toUpperCase())) > -1) ? 'n ' : ' ' ) + tourName + ' Tournament is currently in its signup phase. Type</font> <font color="red">/j</font> <font color="green">to join!</font></h2>';
		if (user.can('broadcast') && cmd.charAt(0) == "!") {
			showOrBroadcastStart(user, cmd, room, socket, message);
			showOrBroadcast(user, cmd, room, socket, msg);
			return false;
		}
		emit(socket, 'console', {rawMessage: msg});
		return false;
		break;

	case 'tour':
		var roomid = room.id;if (room.battle) {roomid = room.parentid;}
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (tour[roomid].status > 0) {
			emit(socket, 'console', 'A tournament is already running.');
			return false;
		}
		if (!target) {
			emit(socket, 'console', "You forgot to enter the tournament info.");
			return false;
		}
		var part = target.split(',');
		if (part.length-1 == 0) {
			emit(socket, 'console', "You didn't enter the tournament size.");
			return false;
		}
		var exist = 0;
		for (var i in tour.tiers) {
			if (typeof tour.tiers[i].name != "undefined") {
				if (tour.tiers[i].name.toLowerCase() == part[0].toLowerCase() && tour.tiers[i].challengeShow) {
					part[0] = i;
					exist = 1;
				}
			}
		}
		if (!exist) {
			emit(socket, 'console', "The " + part[0] + " format doesn't exist.");
			return false;
		}
		if (isNaN(part[1]) == true || part[1] == "" || part[1] < 3 || part[1] > 32) {
			emit(socket, 'console', "You did not enter a valid amount of participants.");
			return false;
		}
		tour[roomid].status = 1;
		tour[roomid].toursize = part[1].split(' ').join('');
		tour[roomid].tier = part[0];
		room.addRaw('<hr /><h2><font color="green">A Tournament has been started by: ' + sanitize(user.name) + ', Type</font> <font color="red">/j</font> <font color="green">to join!</font></h2><b><font color="blueviolet">PLAYERS:</font></b> ' + part[1] + '<br /><font color="blue"><b>TYPE:</b></font> ' + tour.tiers[part[0]].name + '<hr />');
		return false;
		break;

	case 'jointour':
	case 'jtour':
	case 'j':
	case 'jt':
		var roomid = room.id;if (room.battle) {roomid = room.parentid;}
		if (tour[roomid].status == 0) {
			emit(socket, 'console', 'A tournament is not currently running.');
			return false;
		}
		if (tour[roomid].status > 1) {
			emit(socket, 'console', 'Too late. The tournament already started.');
			return false;
		}
		var joined = false;
		for (var i in tour[roomid].players) {
			if (tour[roomid].players[i] == user.userid) {
				joined = true;
			}
		}
		if (joined == true) {
			emit(socket, 'console', 'You already joined the tournament.');
			return false;
		}
		tour[roomid].players[tour[roomid].players.length] = user.userid;
		var spots = tour[roomid].toursize - tour[roomid].players.length;
		room.addRaw('<b>' + sanitize(user.name) + ' has joined the tournament. ' + spots + ' spots left.</b>');
		if (spots == 0) {
			tour.startTour(roomid);
		}
		return false;
		break;

	case 'forcejoin':
	case 'fj':
		var roomid = room.id;if (room.battle) {roomid = room.parentid;}
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (tour[roomid].status == 0) {
			emit(socket, 'console', 'A tournament is not currently running.');
			return false;
		}
		if (tour[roomid].status > 1) {
			emit(socket, 'console', 'Too late. The tournament already started.');
			return false;
		}
		var tar = toUserid(target);
		if (!Users.users[tar]) {
			emit(socket, 'console', 'That user does not exist.');
			return false;
		}
		var joined = false;
		for (var i in tour[roomid].players) {
			if (tour[roomid].players[i] == tar) {
				joined = true;
			}
		}
		if (joined == true) {
			emit(socket, 'console', 'That user already joined the tournament.');
			return false;
		}
		tour[roomid].players[tour[roomid].players.length] = tar;
		var spots = tour[roomid].toursize - tour[roomid].players.length;
		room.addRaw('<b>' + sanitize(Users.users[tar].name) + ' was forced to join the tournament by ' + sanitize(user.name) + '. ' + spots + ' spots left.</b>');
		if (spots == 0) {
			tour.startTour(roomid);
		}
		return false;
		break;

	case 'forceleave':
	case 'fl':
		var roomid = room.id;if (room.battle) {roomid = room.parentid;}
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (tour[roomid].status == 0) {
			emit(socket, 'console', 'A tournament is not currently running.');
			return false;
		}
		if (tour[roomid].status > 1) {
			emit(socket, 'console', 'You cannot force someone to leave while the tournament is running. They are trapped. >:D');
			return false;
		}
		var tar = toUserid(target);
		if (!Users.users[tar]) {
			emit(socket, 'console', 'That user does not exist.');
			return false;
		}
		var joined = false;
		for (var i in tour[roomid].players) {
			if (tour[roomid].players[i] == tar) {
				joined = true;
				var id = i;
			}
		}
		if (joined == false) {
			emit(socket, 'console', 'That user isn\'t in the tournament.');
			return false;
		}
		tour[roomid].players.splice(id, 1);
		var spots = tour[roomid].toursize - tour[roomid].players.length;
		room.addRaw('<b>' + sanitize(Users.users[tar].name) + ' has been forced to leave the tournament by ' + sanitize(user.name) + '. ' + spots + ' spots left.</b>');
		return false;
		break;

	case 'leavetour':
	case 'lt':
	case 'ltour':
		var roomid = room.id;if (room.battle) {roomid = room.parentid;}
		if (tour[roomid].status == 0) {
			emit(socket, 'console', 'A tournament is not currently running.');
			return false;
		}
		if (tour[roomid].status > 1) {
			emit(socket, 'console', 'You cannot leave while the tournament is running. You are trapped. >:D');
			return false;
		}
		var joined = false;
		for (var i in tour[roomid].players) {
			if (tour[roomid].players[i] == user.userid) {
				joined = true;
				var id = i;
			}
		}
		if (joined == false) {
			emit(socket, 'console', 'You haven\'t joined the tournament so you can\'t leave it.');
			return false;
		}
		tour[roomid].players.splice(id, 1);
		var spots = tour[roomid].toursize - tour[roomid].players.length;
		room.addRaw('<b>' + sanitize(user.name) + ' has left the tournament. ' + spots + ' spots left.</b>');
		return false;
		break;

	case 'toursize':
	case 'ts':
		var roomid = room.id;if (room.battle) {roomid = room.parentid;}
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (tour[roomid].status == 0) {
			emit(socket, 'console', 'A tournament is not currently running.');
			return false;
		}
		if (tour[roomid].status > 1) {
			emit(socket, 'console', 'The tournament already started.');
			return false;
		}
		if (isNaN(target) == true || target == "" || target < 3 || target > 32) {
			emit(socket, 'console', 'You cannot change the tournament size to: ' + target);
			return false;
		}
		if (target < tour[roomid].players.length) {
			emit(socket, 'console', tour[roomid].players.length + ' players have joined already. You are trying to set the tournament size to ' + target + '.');
			return false;
		}
		tour[roomid].toursize = target;
		var spots = tour[roomid].toursize - tour[roomid].players.length;
		room.addRaw('<b>The tournament size has been changed to ' + target + ' by ' + sanitize(user.name) + '. ' + spots + ' spots left.</b>');
		if (spots == 0) {
			tour.startTour(roomid);
		}
		return false;
		break;

	case 'disqualify':
	case 'dq':
		var roomid = room.id;if (room.battle) {roomid = room.parentid;}
		if (tour[roomid].status < 2) {
			emit(socket, 'console', 'A tournament hasn\'t started yet.');
			return false;
		}
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You don\'t have enough authority to use this command.');
			return false;
		}
		var tar = toUserid(target);
		if (!Users.users[tar]) {
			emit(socket, 'console', 'That user does not exist.');
			return false;
		}
		var init = false;
		var wait = false;
		for (var i in tour[roomid].round) {
			var current = tour[roomid].round[i].split('|');
			if (current[0] == tar) {
				init = true;
				var id = i;
				var opp = current[1];
				if (current[2] == 2) {
					wait = true;
				}
			}
			if (current[1] == tar) {
				init = true;
				var id = i;
				var opp = current[0];
				if (current[2] == 2) {
					wait = true;
				}
			}
		}
		if (wait == true) {
			emit(socket, 'console', 'That player already completed their duel. Wait for the next round to start to disqualify this user.');
			return false;
		}
		if (init == false) {
			emit(socket, 'console', 'That player is not in the tournament');
			return false;
		}
		var object = tour[roomid].round[id].split('|');
		object[2] = 2;
		object[3] = opp;
		tour[roomid].round[id] = object.join('|');
		tour[roomid].winners[tour[roomid].winners.length] = opp;
		tour[roomid].losers[tour[roomid].losers.length] = tar;
		room.addRaw('<b>' + sanitize(Users.users[tar].name) + ' was disqualified by ' + sanitize(user.name) + '. ' + sanitize(opp) + " won their battle by default.</b>");
		if (tour[roomid].winners.length >= tour[roomid].round.length) {
			tour.nextRound(roomid);
		}
		return false;
		break;

	case 'switch':
		var roomid = room.id;if (room.battle) {roomid = room.parentid;}
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.');
			return false;
		}
		if (tour[roomid].status < 2) {
			emit(socket, 'console', 'A tournament hasn\'t started yet');
			return false;
		}
		var old = toUserid(target.split(',')[0]);
		var tar = toUserid(target.split(',')[1]);
		for (var i in tour[roomid].round) {
			var current = tour[roomid].round[i].split('|');
			if (current[0] == old) {
				var id = i;
				var p = 0;
			}
			if (current[1] == old) {
				var id = i;
				var p = 1;
			}
		}
		if (!id) {
			emit(socket, 'console', 'There is no such user in the tournament.');
			return false;
		}
		var ray = tour[roomid].round[id].split('|');
		for (var i in tour[roomid].losers) {
			if (tour[roomid].losers[i] == ray[p]) {
				tour[roomid].losers[i] = tar;
			}
		}
		for (var i in tour[roomid].winners) {
			if (tour[roomid].winners[i] == ray[p]) {
				tour[roomid].winners[i] = tar;
			}
		}
		for (var i in tour[roomid].overallLoser) {
			if (tour[roomid].overallLoser[i] == ray[p]) {
				tour[roomid].overallLoser[i] = tar;
			}
		}
		room.addRaw("<b>" + ray[p] + " was replaced with " + tar + " by " + user.name + " in the tournament.</b>");
		ray[p] = tar;
		ray = ray.join('|');
		tour[roomid].round[id] = ray;
		return false;
		break;

	case 'viewround':
	case 'vr':
	case '!vr':
	case '!viewround':
		var roomid = room.id;if (room.battle) {roomid = room.parentid;}
		if(tour[roomid] == undefined){
			emit(socket, 'console', '/vr unavailable inside here, please /vr in the main chat.');
			return false;
		}
		if (tour[roomid].status < 2) {
			emit(socket, 'console', 'A tournament hasn\'t started yet.');
			return false;
		}
		var msg = "<h3>Round " + tour[roomid].Round + " of " + tour.tiers[tour[roomid].tier].name + " tournament.</h3><small><i>** Bold means they are battling. Green means they won. Red means they lost. **</i></small><br />";
		for (var i in tour[roomid].round) {
			var current = tour[roomid].round[i].split('|');
			var p1 = current[0];
			var p2 = current[1];
			var p3 = p2;
			var status = current[2];
			var winner = current[3];

			var fontweight = "";
			var p1c = "";
			var p2c = "";

			if (status == 2) {
				p1c = "red";
				p2c = "green";
				if (winner == p1) {
					p1c = "green";
					p2c = "red";
				}
				p1 = '<font color="'+p1c+'">'+sanitize(p1)+'</font>';
				p2 = '<font color="'+p2c+'">'+sanitize(p2)+'</font>';
			}

			if (p3 != 0) msg += (status == 1? '<b>': '') + p1 + ' vs. ' + p2 + (status ==1? '</b>':'') + '<br />';
			else msg += p1 +  " gets a bye.<br />";
		}
		msg += "<br />";
		if (user.can('broadcast') && cmd.charAt(0) == "!") {
			showOrBroadcastStart(user, cmd, room, socket, message);
			showOrBroadcast(user, cmd, room, socket, msg);
			return false;
		}
		emit(socket, 'console', {rawMessage: msg});
		return false;
		break;

	case 'endtour':
		var roomid = room.id;if (room.battle) {roomid = room.parentid;}
		if (tour[roomid].status == 0) {
			emit(socket, 'console', 'There is currently no tournament running.', roomid);
			return false;
		}
		if (!user.can('broadcast')) {
			emit(socket, 'console', 'You do not have enough authority to use this command.', roomid);
			return false;
		}
		room.addRaw('<h2>The tournament was ended by ' + sanitize(user.name) + '.</h2>', roomid);
		tour.endTour(roomid);
		return false;
		break;
	case 'cmd':
		var spaceIndex = target.indexOf(' ');
		var cmd = target;
		if (spaceIndex > 0) {
			cmd = target.substr(0, spaceIndex);
			target = target.substr(spaceIndex+1);
		} else {
			target = '';
		}
		if (cmd === 'userdetails') {
			var targetUser = Users.get(target);
			if (!targetUser || !room) return false;
			var roomList = {};
			for (var i in targetUser.roomCount) {
				if (i==='lobby') continue;
				var targetRoom = Rooms.get(i);
				if (!targetRoom) continue;
				var roomData = {};
				if (targetRoom.battle) {
					var battle = targetRoom.battle;
					roomData.p1 = battle.p1?' '+battle.p1:'';
					roomData.p2 = battle.p2?' '+battle.p2:'';
				}
				roomList[i] = roomData;
			}
			var userdetails = {
				command: 'userdetails',
				userid: targetUser.userid,
				avatar: targetUser.avatar,
				rooms: roomList,
				room: room.id
			};
			if (user.can('ip', targetUser)) {
				userdetails.ips = Object.keys(targetUser.ips);
			}
			emit(socket, 'command', userdetails);
		} else if (cmd === 'roomlist') {
			if (!room || !room.getRoomList) return false;
			emit(socket, 'command', {
				command: 'roomlist',
				rooms: room.getRoomList(true),
				room: room.id
			});
		}
		return false;
		break;

	case 'me':
	case 'mee':
		if (canTalk(user, room)) return true;
		break;

	case '!birkal':
	case 'birkal':
		if (canTalk(user, room) && user.can('broadcast') && room.id === 'lobby') {
			if (cmd === '!birkal') {
				room.add('|c|'+user.getIdentity()+'|!birkal '+target, true);
			}
			room.logEntry(user.name + ' used /birkal ' + target);
			room.add('|c| Birkal|/me '+target, true);
			return false;
		}
		break;

	case 'namelock':
	case 'nl':
		if(!target) {
			return false;
		}
		var targets = splitTarget(target);
		var targetUser = targets[0];
		var targetName = targets[1] || (targetUser && targetUser.name);
		if (!user.can('namelock', targetUser)) {
			emit(socket, 'console', '/namelock - access denied.');
			return false;
		} else if (targetUser && targetName) {
			var oldname = targetUser.name;
			var targetId = toUserid(targetName);
			var userOfName = Users.users[targetId];
			var isAlt = false;
			if (userOfName) {
				for(var altName in userOfName.getAlts()) {
					var altUser = Users.users[toUserid(altName)];
					if (!altUser) continue;
					if (targetId === altUser.userid) {
						isAlt = true;
						break;
					}
					for (var prevName in altUser.prevNames) {
						if (targetId === toUserid(prevName)) {
							isAlt = true;
							break;
						}
					}
					if (isAlt) break;
				}
			}
			if (!userOfName || oldname === targetName || isAlt) {
				targetUser.nameLock(targetName, true);
			}
			if (targetUser.nameLocked()) {
				logModCommand(room,user.name+" name-locked "+oldname+" to "+targetName+".");
				return false;
			}
			emit(socket, 'console', oldname+" can't be name-locked to "+targetName+".");
		} else {
			emit(socket, 'console', "User "+targets[2]+" not found.");
		}
		return false;
		break;
	case 'nameunlock':
	case 'unnamelock':
	case 'nul':
	case 'unl':
		if(!user.can('namelock') || !target) {
			return false;
		}
		var removed = false;
		for (var i in nameLockedIps) {
			if (nameLockedIps[i] === target) {
				delete nameLockedIps[i];
				removed = true;
			}
		}
		if (removed) {
			var targetUser = Users.get(target);
			if (targetUser) {
				rooms.lobby.sendIdentity(targetUser);
			}
			logModCommand(room,user.name+" unlocked the name of "+target+".");
		} else {
			emit(socket, 'console', target+" not found.");
		}
		return false;
		break;

	case 'forfeit':
	case 'concede':
	case 'surrender':
		if (!room.battle) {
			emit(socket, 'console', "There's nothing to forfeit here.");
			return false;
		}
		if (!room.forfeit(user)) {
			emit(socket, 'console', "You can't forfeit this battle.");
		}
		return false;
		break;

	case 'register':
		emit(socket, 'console', 'You must win a rated battle to register.');
		return false;
		break;

	case 'avatar':
		if (!target) return parseCommand(user, 'avatars', '', room, socket);
		var parts = target.split(',');
		var avatar = parseInt(parts[0]);
		if (!avatar || avatar > 294 || avatar < 1) {
			if (!parts[1]) {
				emit(socket, 'console', 'Invalid avatar.');
			}
			return false;
		}

		user.avatar = avatar;
		if (!parts[1]) {
			emit(socket, 'console', 'Avatar changed to:');
			emit(socket, 'console', {rawMessage: '<img src="/sprites/trainers/'+avatar+'.png" alt="" width="80" height="80" />'});
		}

		return false;
		break;

	case 'rooms':
		var targetUser = user;
		if (target) targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
		} else {
			var output = "";
			var first = true;
			for (var i in targetUser.roomCount) {
				if (!first) output += ' | ';
				first = false;

				output += '<a href="/'+i+'" room="'+i+'">'+i+'</a>';
			}
			if (!output) {
				emit(socket, 'console', ""+targetUser.name+" is offline.");
			} else {
				emit(socket, 'console', {rawMessage: ""+targetUser.name+" is in: "+output});
			}
		}
		return false;
		break;

	case 'altcheck':
	case 'alt':
	case 'alts':
	case 'getalts':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
			return false;
		}
		if (!user.can('alts', targetUser)) {
			emit(socket, 'console', '/alts - Access denied.');
			return false;
		}

		var alts = targetUser.getAlts();

		emit(socket, 'console', 'User: '+targetUser.name);

		if (!user.can('alts', targetUser.getHighestRankedAlt())) {
			return false;
		}

		var output = '';
		for (var i in targetUser.prevNames) {
			if (output) output += ", ";
			output += targetUser.prevNames[i];
		}
		if (output) emit(socket, 'console', 'Previous names: '+output);

		for (var j=0; j<alts.length; j++) {
			var targetAlt = Users.get(alts[j]);
			if (!targetAlt.named && !targetAlt.connected) continue;

			emit(socket, 'console', 'Alt: '+targetAlt.name);
			output = '';
			for (var i in targetAlt.prevNames) {
				if (output) output += ", ";
				output += targetAlt.prevNames[i];
			}
			if (output) emit(socket, 'console', 'Previous names: '+output);
		}
		return false;
		break;

	case 'whois':
		var targetUser = user;
		if (target) {
			targetUser = Users.get(target);
		}
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
		} else {
			emit(socket, 'console', 'User: '+targetUser.name);
			if (config.groups[targetUser.group] && config.groups[targetUser.group].name) {
				emit(socket, 'console', 'Group: ' + config.groups[targetUser.group].name + ' (' + targetUser.group + ')');
			}
			if (!targetUser.authenticated) {
				emit(socket, 'console', '(Unregistered)');
			}
			if (user.can('ip', targetUser)) {
				var ips = Object.keys(targetUser.ips);
				emit(socket, 'console', 'IP' + ((ips.length > 1) ? 's' : '') + ': ' + ips.join(', '));
			}
			var output = 'In rooms: ';
			var first = true;
			for (var i in targetUser.roomCount) {
				if (!first) output += ' | ';
				first = false;

				output += '<a href="/'+i+'" room="'+i+'">'+i+'</a>';
			}
			emit(socket, 'console', {rawMessage: output});
		}
		return false;
		break;

	case 'ban':
	case 'b':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('ban', targetUser)) {
			emit(socket, 'console', '/ban - Access denied.');
			return false;
		}

		logModCommand(room,""+targetUser.name+" was banned by "+user.name+"." + (targets[1] ? " (" + targets[1] + ")" : ""));
		targetUser.emit('message', user.name+' has banned you.  If you feel that your banning was unjustified you can <a href="http://www.smogon.com/forums/announcement.php?f=126&a=204" target="_blank">appeal the ban</a>. '+targets[1]);
		var alts = targetUser.getAlts();
		if (alts.length) logModCommand(room,""+targetUser.name+"'s alts were also banned: "+alts.join(", "));

		targetUser.ban();
		return false;
		break;

	case 'banredirect':
	case 'br':
		emit(socket, 'console', '/banredirect - This command is obsolete and has been removed.');
		return false;
		break;

	case 'redirect':
	case 'redir':
		emit(socket, 'console', '/redirect - This command is obsolete and has been removed.');
		return false;
		break;

        case 'kick':
	case 'k':
		// TODO: /kick will be removed in due course.
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser || !targetUser.connected) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('redirect', targetUser)) {
			emit(socket, 'console', '/redirect - Access denied.');
			return false;
		}

		logModCommand(room,''+targetUser.name+' was kicked to the Rules page by '+user.name+'' + (targets[1] ? " (" + targets[1] + ")" : ""));
		targetUser.emit('console', {evalRulesRedirect: 1});
		return false;
		break;

	case 'unban':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.can('ban')) {
			emit(socket, 'console', '/unban - Access denied.');
			return false;
		}

		var targetid = toUserid(target);
		var success = false;

		for (var ip in bannedIps) {
			if (bannedIps[ip] === targetid) {
				delete bannedIps[ip];
				success = true;
			}
		}
		if (success) {
			logModCommand(room,''+target+' was unbanned by '+user.name+'.');
		} else {
			emit(socket, 'console', 'User '+target+' is not banned.');
		}
		return false;
		break;

	case 'unbanall':
		if (!user.can('ban')) {
			emit(socket, 'console', '/unbanall - Access denied.');
			return false;
		}
		logModCommand(room,'All bans and ip mutes have been lifted by '+user.name+'.');
		bannedIps = {};
		mutedIps = {};
		return false;
		break;

	case 'reply':
	case 'r':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.lastPM) {
			emit(socket, 'console', 'No one has PMed you yet.');
			return false;
		}
		return parseCommand(user, 'msg', ''+(user.lastPM||'')+', '+target, room, socket);
		break;

	case 'msg':
	case 'pm':
	case 'whisper':
	case 'w':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targets[1]) {
			emit(socket, 'console', 'You forgot the comma.');
			return parseCommand(user, '?', cmd, room, socket);
		}
		if (!targets[0] || !targetUser.connected) {
			if (target.indexOf(' ')) {
				emit(socket, 'console', 'User '+targets[2]+' not found. Did you forget a comma?');
			} else {
				emit(socket, 'console', 'User '+targets[2]+' not found. Did you misspell their name?');
			}
			return parseCommand(user, '?', cmd, room, socket);
		}
		// temporarily disable this because blarajan
		/* if (user.muted && !targetUser.can('mute', user)) {
			emit(socket, 'console', 'You can only private message members of the Moderation Team (users marked by %, @, &, or ~) when muted.');
			return false;
		} */

		if (!user.named) {
			emit(socket, 'console', 'You must choose a name before you can send private messages.');
			return false;
		}

		var message = {
			name: user.getIdentity(),
			pm: targetUser.getIdentity(),
			message: targets[1]
		};
		user.emit('console', message);
		targets[0].emit('console', message);
		targets[0].lastPM = user.userid;
		user.lastPM = targets[0].userid;
		return false;
		break;

	case 'ip':
	case 'getip':
		if (!target) {
			var ips = Object.keys(user.ips);
			emit(socket, 'console', 'Your IP' + ((ips.length > 1) ? 's are' : ' is') + ': ' + ips.join(', '));
			return false;
		}
		var targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
			return false;
		}
		if (!user.can('ip', targetUser)) {
			emit(socket, 'console', '/ip - Access denied.');
			return false;
		}
		var ips = Object.keys(targetUser.ips);
		emit(socket, 'console', 'User ' + targetUser.name + ' has IP' + ((ips.length > 1) ? 's' : '') + ': ' + ips.join(', '));
		return false;
		break;

	case 'mute':
	case 'm':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('mute', targetUser)) {
			emit(socket, 'console', '/mute - Access denied.');
			return false;
		}

		logModCommand(room,''+targetUser.name+' was muted by '+user.name+'.' + (targets[1] ? " (" + targets[1] + ")" : ""));
		targetUser.emit('message', user.name+' has muted you. '+targets[1]);
		var alts = targetUser.getAlts();
		if (alts.length) logModCommand(room,""+targetUser.name+"'s alts were also muted: "+alts.join(", "));

		targetUser.muted = true;
		rooms.lobby.sendIdentity(targetUser);
		for (var i=0; i<alts.length; i++) {
			var targetAlt = Users.get(alts[i]);
			if (targetAlt) {
				targetAlt.muted = true;
				rooms.lobby.sendIdentity(targetAlt);
			}
		}

		return false;
		break;

	case 'ipmute':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
			return false;
		}
		if (!user.can('mute', targetUser)) {
			emit(socket, 'console', '/ipmute - Access denied.');
			return false;
		}

		logModCommand(room,''+targetUser.name+"'s IP was muted by "+user.name+'.');
		var alts = targetUser.getAlts();
		if (alts.length) logModCommand(room,""+targetUser.name+"'s alts were also muted: "+alts.join(", "));

		targetUser.muted = true;
		rooms.lobby.sendIdentity(targetUser);
		for (var ip in targetUser.ips) {
			mutedIps[ip] = targetUser.userid;
		}
		for (var i=0; i<alts.length; i++) {
			var targetAlt = Users.get(alts[i]);
			if (targetAlt) {
				targetAlt.muted = true;
				rooms.lobby.sendIdentity(targetAlt);
			}
		}

		return false;
		break;

	case 'unmute':
	case 'um':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targetid = toUserid(target);
		var targetUser = Users.get(target);
		if (!targetUser) {
			emit(socket, 'console', 'User '+target+' not found.');
			return false;
		}
		if (!user.can('mute', targetUser)) {
			emit(socket, 'console', '/unmute - Access denied.');
			return false;
		}

		var success = false;

		for (var ip in mutedIps) {
			if (mutedIps[ip] === targetid) {
				delete mutedIps[ip];
				success = true;
			}
		}

		if (success) {
			logModCommand(room,''+(targetUser?targetUser.name:target)+"'s IP was unmuted by "+user.name+'.');
		}

		targetUser.muted = false;
		rooms.lobby.sendIdentity(targetUser);
		logModCommand(room,''+targetUser.name+' was unmuted by '+user.name+'.');
		return false;
		break;

	case 'promote':
	case 'demote':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target, true);
		var targetUser = targets[0];
		var userid = toUserid(targets[2]);

		var currentGroup = ' ';
		if (targetUser) {
			currentGroup = targetUser.group;
		} else if (Users.usergroups[userid]) {
			currentGroup = Users.usergroups[userid].substr(0,1);
		}
		var name = targetUser ? targetUser.name : targets[2];

		var nextGroup = targets[1] ? targets[1] : Users.getNextGroupSymbol(currentGroup, cmd === 'demote');
		if (targets[1] === 'deauth') nextGroup = config.groupsranking[0];
		if (!config.groups[nextGroup]) {
			emit(socket, 'console', 'Group \'' + nextGroup + '\' does not exist.');
			return false;
		}
		if (!user.checkPromotePermission(currentGroup, nextGroup)) {
			emit(socket, 'console', '/promote - Access denied.');
			return false;
		}

		var isDemotion = (config.groups[nextGroup].rank < config.groups[currentGroup].rank);
		if (!Users.setOfflineGroup(name, nextGroup)) {
			emit(socket, 'console', '/promote - WARNING: This user is offline and could be unregistered. Use /forcepromote if you\'re sure you want to risk it.');
			return false;
		}
		var groupName = (config.groups[nextGroup].name || nextGroup || '').trim() || 'a regular user';
		var entry = ''+name+' was '+(isDemotion?'demoted':'promoted')+' to ' + groupName + ' by '+user.name+'.';
		logModCommand(room, entry, isDemotion);
		if (isDemotion) {
			rooms.lobby.logEntry(entry);
			emit(socket, 'console', 'You demoted ' + name + ' to ' + groupName + '.');
			if (targetUser) {
				targetUser.emit('console', 'You were demoted to ' + groupName + ' by ' + user.name + '.');
			}
		}
		rooms.lobby.sendIdentity(targetUser);
		return false;
		break;

	case 'forcepromote':
		// warning: never document this command in /help
		if (!user.can('forcepromote')) {
			emit(socket, 'console', '/forcepromote - Access denied.');
			return false;
		}
		var targets = splitTarget(target, true);
		var name = targets[2];
		var nextGroup = targets[1] ? targets[1] : Users.getNextGroupSymbol(' ', false);

		if (!Users.setOfflineGroup(name, nextGroup, true)) {
			emit(socket, 'console', '/forcepromote - Don\'t forcepromote unless you have to.');
			return false;
		}
		var groupName = config.groups[nextGroup].name || nextGroup || '';
		logModCommand(room,''+name+' was promoted to ' + (groupName.trim()) + ' by '+user.name+'.');
		return false;
		break;

	case 'deauth':
		return parseCommand(user, 'demote', target+', deauth', room, socket);
		break;

	case 'modchat':
		if (!target) {
			emit(socket, 'console', 'Moderated chat is currently set to: '+config.modchat);
			return false;
		}
		if (!user.can('modchat')) {
			emit(socket, 'console', '/modchat - Access denied.');
			return false;
		}

		target = target.toLowerCase();
		switch (target) {
		case 'on':
		case 'true':
		case 'yes':
			config.modchat = true;
			break;
		case 'off':
		case 'false':
		case 'no':
			config.modchat = false;
			break;
		default:
			if (!config.groups[target]) {
				emit(socket, 'console', 'That moderated chat setting is unrecognized.');
				return false;
			}
			if (config.groupsranking.indexOf(target) > 1 && !user.can('modchatall')) {
				emit(socket, 'console', '/modchat - Access denied for setting higher than ' + config.groupsranking[1] + '.');
				return false;
			}
			config.modchat = target;
			break;
		}
		if (config.modchat === true) {
			room.addRaw('<div class="broadcast-red"><b>Moderated chat was enabled!</b><br />Only registered users can talk.</div>');
		} else if (!config.modchat) {
			room.addRaw('<div class="broadcast-blue"><b>Moderated chat was disabled!</b><br />Anyone may talk now.</div>');
		} else {
			var modchat = sanitize(config.modchat);
			room.addRaw('<div class="broadcast-red"><b>Moderated chat was set to '+modchat+'!</b><br />Only users of rank '+modchat+' and higher can talk.</div>');
		}
		logModCommand(room,user.name+' set modchat to '+config.modchat,true);
		return false;
		break;

	case 'declare':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.can('declare')) {
			emit(socket, 'console', '/declare - Access denied.');
			return false;
		}
		room.addRaw('<div class="broadcast-blue" style = "font-size 20px"><b>'+target+'</b></div>');
		logModCommand(room,user.name+' declared '+target,true);
		return false;
		break;

	case 'announce':
	case 'wall':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.can('announce')) {
			emit(socket, 'console', '/announce - Access denied.');
			return false;
		}
		return '/announce '+target;
		break;

	case 'game':
		if (!user.can('declare')) {
			emit(socket, 'console', '/game - Access denied, But you still lost the game.');
			return false;
		}
		room.addRaw('<b><font color=red><font size="4">I JUST LOST THE GAME!</font></font></b>')
		logModCommand(room,user.name+' gamed'+target,true);
		return false;
		break;
		
	case 'slots':
	case 'spin':
	        if (!user.balance || user.balance <= 0) {
			user.balance = 1000; 
			user.emit('console', " Your balance was reset to $" + user.balance + "."); 
		} 
		var winnings = 0; 
		var chance = Math.floor(Math.random() * 100); 
		var chance2 = Math.floor(Math.random() * 10000); 
		var chance3 = Math.floor(Math.random() * 1000); 

		if (chance < 1) {
			winnings += 500; 	//  1/100
		} else if (chance < 5) { 	//  4/100
			winnings += 300;
		} else if (chance < 10) {	//  5/100
			winnings += 150;
		} else if (chance < 20) {	// 10/100
			winnings += 100;
		} else if (chance < 40) {	// 30/100
			winnings += 75;
		} else {			// 50/100
			winnings -= 150;
		} 

		if (chance2 < 1) {
			winnings += 10000;
		} else if (chance2 < 10) {
			winnings += 1000;
		} else if (chance2 < 100) {
			winnings += 500;
		} else if (chance2 < 500) {
			winnings += 200;
		} 

		if (chance3 < 1) {
			winnings += (Math.floor(Math.random() * (1000 - 200 + 1)) + 200) * 100;
		} 

		if (!user.maxWin || winnings > user.maxWin) {
			user.maxWin = winnings;
		} 
		if (!user.maxBalance || user.balance + winnings > user.maxBalance) {
			user.maxBalance = user.balance;
		} 

		user.emit('console', 'You' + ((winnings < 0) ? " lost":" won") + " $" + Math.abs(winnings) + "!"); 
		user.balance += winnings
		if (user.balance <= 0) {
			user.balance = 0; 
			user.emit('console', 'You are out of cash!');
		} 
		user.emit('console', "Your Balance: $" + user.balance);
		return false;
		break;

	case 'balance':
		user.emit('console', 'Your current balance is $' + user.balance);
		return false;
		break;

	case 'maxwin':
		user.emit('console', 'The maximum you have won is $' + user.maxWin);
		user.emit('console', 'The maximum amount of money you have held is $' + user.maxBalance);
		return false;
		break;
		
	case 'hideauth':
	case 'hide':
		if(!user.can('hideauth')){
			user.emit('console', '/hideauth - access denied.');
			return false;
		}
		var tar = ' ';
		if(target){
			target = target.trim();
			if(config.groupsranking.indexOf(target) > -1){
				if( config.groupsranking.indexOf(target) <= config.groupsranking.indexOf(user.group)){
					tar = target;
				}else{
					user.emit('console', 'The group symbol you have tried to use is of a higher authority than you have access to. Defaulting to \' \' instead.');
				}
			}else{
				user.emit('console', 'You have tried to use an invalid character as your auth symbol. Defaulting to \' \' instead.');
			}
		}

		user.getIdentity = function(){
			if(this.muted)
				return '!' + this.name;
			if(this.nameLocked())
				return '#' + this.name;
			return tar + this.name;
		};
		rooms.lobby.send('|N|'+user.getIdentity()+'|'+user.userid);
		user.emit('console', 'You are now hiding your auth symbol as \''+tar+ '\'.');
		logModCommand(room, user.name + ' is hiding auth symbol as \''+ tar + '\'', true);
		return false;
		break;

	case 'showauth':
		if(!user.can('hideauth')){
			user.emit('console', '/showauth - access denied.');
			return false;
		}
		delete user.getIdentity;
		rooms.lobby.send('|N|'+user.getIdentity()+'|'+user.userid);
		user.emit('console', 'You have now revealed your auth symbol.');
		logModCommand(room, user.name + ' has revealed their auth symbol.', true);
		return false;
		break;	
		
		case 'rj':
	case 'reportjoins':
		if(user.can('declare') && !config.reportjoins){
			config.reportjoins = true;
			config.reportbattles = true;
			user.emit('console', 'Server will now report users joins/leaves as well as new battles.');
			logModCommand(room, user.name + ' has enabled reportjoins/battles.', true);
		}else{
			if(!user.can('declare')){
				user.emit('console', '/reportjoins - Access Denied.');
			}else{
				user.emit('console','Server is already reporting joins/leaves and battles.');	
			}
		}
		return false;
		break;

	case 'drj':
	case 'disablereportjoins':
		if(user.can('declare') && config.reportjoins){
			config.reportjoins = false;
			config.reportbattles = false;
			user.emit('console', 'Server will not report users joins/leaves or new battles.');
			logModCommand(room, user.name + ' has disabled reportjoins/battles.', true);
		}else{
			if(!user.can('declare')){
				user.emit('console', '/disablereportjoins - Access Denied.');
			}else{
				user.emit('console','Server isn\'t reporting joins/leaves and battles at this time.');	
			}
		}
		return false;
		break;
		
		
	case 'riles':
		if(user.userid === 'riles'){
			user.avatar = 64;
			delete Users.users['riley'];			
			user.forceRename('Riley', user.authenticated);
		}
		break;
		
	case 'hotpatch':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		if (!user.can('hotpatch')) {
			emit(socket, 'console', '/hotpatch - Access denied.');
			return false;
		}

		if (target === 'all') {
			for (var i in require.cache) delete require.cache[i];
			Tools = require('./tools.js');

			parseCommand = require('./chat-commands.js').parseCommand;

			sim = require('./battles.js');
			BattlePokemon = sim.BattlePokemon;
			BattleSide = sim.BattleSide;
			Battle = sim.Battle;
			emit(socket, 'console', 'The game engine has been hot-patched.');
			return false;
		} else if (target === 'data') {
			for (var i in require.cache) delete require.cache[i];
			Tools = require('./tools.js');
			emit(socket, 'console', 'Game resources have been hot-patched.');
			return false;
		} else if (target === 'chat') {
			for (var i in require.cache) delete require.cache[i];
			parseCommand = require('./chat-commands.js').parseCommand;
			emit(socket, 'console', 'Chat commands have been hot-patched.');
			return false;
		}
		emit(socket, 'console', 'Your hot-patch command was unrecognized.');
		return false;
		break;

	case 'savelearnsets':
		if (user.can('hotpatch')) {
			emit(socket, 'console', '/savelearnsets - Access denied.');
			return false;
		}
		fs.writeFile('data/learnsets.js', 'exports.BattleLearnsets = '+JSON.stringify(BattleLearnsets)+";\n");
		emit(socket, 'console', 'learnsets.js saved.');
		return false;
		break;

	case 'rating':
	case 'ranking':
	case 'rank':
	case 'ladder':
		emit(socket, 'console', 'You are using an old version of Pokemon Showdown. Please reload the page.');
		return false;
		break;

	case 'nick':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		user.rename(target);
		return false;
		break;

	case 'disableladder':
		if (!user.can('disableladder')) {
			emit(socket, 'console', '/disableladder - Access denied.');
			return false;
		}
		if (LoginServer.disabled) {
			emit(socket, 'console', '/disableladder - Ladder is already disabled.');
			return false;
		}
		LoginServer.disabled = true;
		logModCommand(room, 'The ladder was disabled by ' + user.name + '.', true);
		room.addRaw('<div class="broadcast-red"><b>Due to high server load, the ladder has been temporarily disabled</b><br />Rated games will no longer update the ladder. It will be back momentarily.</div>');
		return false;
		break;
	case 'enableladder':
		if (!user.can('disableladder')) {
			emit(socket, 'console', '/enable - Access denied.');
			return false;
		}
		if (!LoginServer.disabled) {
			emit(socket, 'console', '/enable - Ladder is already enabled.');
			return false;
		}
		LoginServer.disabled = false;
		logModCommand(room, 'The ladder was enabled by ' + user.name + '.', true);
		room.addRaw('<div class="broadcast-green"><b>The ladder is now back.</b><br />Rated games will update the ladder now.</div>');
		return false;
		break;

	case 'savereplay':
		if (!room || !room.battle) return false;
		var data = room.log.join("\n");
		var datahash = crypto.createHash('md5').update(data.replace(/[^(\x20-\x7F)]+/g,'')).digest('hex');

		LoginServer.request('prepreplay', {
			id: room.id.substr(7),
			loghash: datahash,
			p1: room.p1.name,
			p2: room.p2.name,
			format: room.format
		}, function(success) {
			emit(socket, 'command', {
				command: 'savereplay',
				log: data,
				room: 'lobby',
				id: room.id.substr(7)
			});
		});
		return false;
		break;

	case 'trn':
		var commaIndex = target.indexOf(',');
		var targetName = target;
		var targetAuth = false;
		var targetToken = '';
		if (commaIndex >= 0) {
			targetName = target.substr(0,commaIndex);
			target = target.substr(commaIndex+1);
			commaIndex = target.indexOf(',');
			targetAuth = target;
			if (commaIndex >= 0) {
				targetAuth = !!parseInt(target.substr(0,commaIndex),10);
				targetToken = target.substr(commaIndex+1);
			}
		}
		user.rename(targetName, targetToken, targetAuth, socket);
		return false;
		break;

	case 'forcerename':
	case 'fr':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!user.can('forcerename', targetUser)) {
			emit(socket, 'console', '/forcerename - Access denied.');
			return false;
		}

		if (targetUser.userid === toUserid(targets[2])) {
			var entry = ''+targetUser.name+' was forced to choose a new name by '+user.name+'.' + (targets[1] ? " (" + targets[1] + ")" : "");
			logModCommand(room, entry, true);
			rooms.lobby.sendAuth(entry);
			if (room.id !== 'lobby') {
				room.add(entry);
			} else {
				room.logEntry(entry);
			}
			targetUser.resetName();
			targetUser.emit('nameTaken', {reason: user.name+" has forced you to change your name. "+targets[1]});
		} else {
			emit(socket, 'console', "User "+targetUser.name+" is no longer using that name.");
		}
		return false;
		break;

	case 'forcerenameto':
	case 'frt':
		if (!target) return parseCommand(user, '?', cmd, room, socket);
		var targets = splitTarget(target);
		var targetUser = targets[0];
		if (!targetUser) {
			emit(socket, 'console', 'User '+targets[2]+' not found.');
			return false;
		}
		if (!targets[1]) {
			emit(socket, 'console', 'No new name was specified.');
			return false;
		}
		if (!user.can('forcerenameto', targetUser)) {
			emit(socket, 'console', '/forcerenameto - Access denied.');
			return false;
		}

		if (targetUser.userid === toUserid(targets[2])) {
			var entry = ''+targetUser.name+' was forcibly renamed to '+targets[1]+' by '+user.name+'.';
			logModCommand(room, entry, true);
			rooms.lobby.sendAuth(entry);
			if (room.id !== 'lobby') {
				room.add(entry);
			} else {
				room.logEntry(entry);
			}
			targetUser.forceRename(targets[1]);
		} else {
			emit(socket, 'console', "User "+targetUser.name+" is no longer using that name.");
		}
		return false;
		break;

	// INFORMATIONAL COMMANDS

	case 'data':
	case '!data':
	case 'stats':
	case '!stats':
	case 'dex':
	case '!dex':
	case 'pokedex':
	case '!pokedex':
		showOrBroadcastStart(user, cmd, room, socket, message);
		var dataMessages = getDataMessage(target);
		for (var i=0; i<dataMessages.length; i++) {
			if (cmd.substr(0,1) !== '!') {
				sendData(socket, '>'+room.id+'\n'+dataMessages[i]);
			} else if (user.can('broadcast') && canTalk(user, room)) {
				room.add(dataMessages[i]);
			}
		}
		return false;
		break;

	case 'learnset':
	case '!learnset':
	case 'learn':
	case '!learn':
	case 'learnall':
	case '!learnall':
	case 'learn5':
	case '!learn5':
		var lsetData = {set:{}};
		var targets = target.split(',');
		if (!targets[1]) return parseCommand(user, 'help', 'learn', room, socket);
		var template = Tools.getTemplate(targets[0]);
		var move = {};
		var problem;
		var all = (cmd.substr(cmd.length-3) === 'all');

		if (cmd === 'learn5' || cmd === '!learn5') lsetData.set.level = 5;

		showOrBroadcastStart(user, cmd, room, socket, message);

		if (!template.exists) {
			showOrBroadcast(user, cmd, room, socket,
				'Pokemon "'+template.id+'" not found.');
			return false;
		}

		for (var i=1, len=targets.length; i<len; i++) {
			move = Tools.getMove(targets[i]);
			if (!move.exists) {
				showOrBroadcast(user, cmd, room, socket,
					'Move "'+move.id+'" not found.');
				return false;
			}
			problem = Tools.checkLearnset(move, template, lsetData);
			if (problem) break;
		}
		var buffer = ''+template.name+(problem?" <span class=\"message-learn-cannotlearn\">can't</span> learn ":" <span class=\"message-learn-canlearn\">can</span> learn ")+(targets.length>2?"these moves":move.name);
		if (!problem) {
			var sourceNames = {E:"egg",S:"event",D:"dream world"};
			if (lsetData.sources || lsetData.sourcesBefore) buffer += " only when obtained from:<ul class=\"message-learn-list\">";
			if (lsetData.sources) {
				var sources = lsetData.sources.sort();
				var prevSource;
				var prevSourceType;
				for (var i=0, len=sources.length; i<len; i++) {
					var source = sources[i];
					if (source.substr(0,2) === prevSourceType) {
						if (prevSourceCount < 0) buffer += ": "+source.substr(2);
						else if (all || prevSourceCount < 3) buffer += ', '+source.substr(2);
						else if (prevSourceCount == 3) buffer += ', ...';
						prevSourceCount++;
						continue;
					}
					prevSourceType = source.substr(0,2);
					prevSourceCount = source.substr(2)?0:-1;
					buffer += "<li>gen "+source.substr(0,1)+" "+sourceNames[source.substr(1,1)];
					if (prevSourceType === '5E' && template.maleOnlyDreamWorld) buffer += " (cannot have DW ability)";
					if (source.substr(2)) buffer += ": "+source.substr(2);
				}
			}
			if (lsetData.sourcesBefore) buffer += "<li>any generation before "+(lsetData.sourcesBefore+1);
			buffer += "</ul>";
		}
		showOrBroadcast(user, cmd, room, socket,
			buffer);
		return false;
		break;

	case 'uptime':
	case '!uptime':
		var uptime = process.uptime();
		var uptimeText;
		if (uptime > 24*60*60) {
			var uptimeDays = Math.floor(uptime/(24*60*60));
			uptimeText = ''+uptimeDays+' '+(uptimeDays == 1 ? 'day' : 'days');
			var uptimeHours = Math.floor(uptime/(60*60)) - uptimeDays*24;
			if (uptimeHours) uptimeText += ', '+uptimeHours+' '+(uptimeHours == 1 ? 'hour' : 'hours');
		} else {
			uptimeText = uptime.seconds().duration();
		}
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">' +
			'Uptime: <b>'+uptimeText+'</b>'+
			'</div>');
		return false;
		break;

	case 'version':
	case '!version':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">' +
			'Version: <b><a href="http://pokemonshowdown.com/versions#' + parseCommandLocal.serverVersion + '" target="_blank">' + parseCommandLocal.serverVersion + '</a></b>' +
			'</div>');
		return false;
		break;

	case 'ext':
	case '!ext':
	case 'info':
	case '!info':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket, '<div class="infobox">Welcome to the Pokemon DB!:<br />'+
			'- <a href="http://pokemondb.net/" target="_blank">Pokemon DB Main Site</a><br />'+
			'- <a href="http://pokemondb.net/pokebase/chat" target="_blank">Pokemon DB Chat</a><br />'+
			'- <a href="http://pokemondb.net/pokebase/" target="_blank"> Pokemon DB Pokebase (Q&A)</a><br />'+
			'- <a href="http://pokemondb.net/pokebase/meta/28174/the-pokemondb-showdown-server" target="_blank">DB Server Guide</a><br />'+
			'</div>');
		return false;
		break;

	case 'groups':
	case '!groups':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">' +
			'+ <b>Voice</b> - They can use !commands, manage tours, and talk during moderated chat<br />' +
			'% <b>Trial Moderator</b> - The above, and they can also mute users and run tournaments<br />' +
			'@ <b>Moderator</b> - The above, and they can ban users and check for alts<br />' +
			'&amp; <b>Super Moderator</b> - The above, and they can promote moderators and force ties<br />'+
			'~ <b>Administrator</b> - They can do anything, Come at me bro!'+
			'</div>');
		return false;
		break;
		
	case 'tourcmds':
	case '!tourcmds':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">' +
			'<b>Start Tournament</b> - Use /tour [tier], [size] without the brackets<br />' +
			'<b>End Tournament</b> - Use /endtour<br />' +
			'<b>View Tournament status</b> - Use /vr<br />' +
			'<b>Reminder</b> - Use /remind<br />'+
			'<b>To join</b> - Use /jt or /j<br />'+
			'<b>To leave</b> - Use /l<br />'+
			'<b>Forcejoin</b> - Use /fj [user] without brackets<br />'+
			'<b>Disaqualify</b> - Use /dq [user] without brackets<br />'+
			'<b>Switching</b> - Use /switch [current user], [new user] without brackets<br />'+
			'</div>');
		return false;
		break;

	case 'opensource':
	case '!opensource':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">Pokemon Showdown is open source:<br />- Language: JavaScript<br />- <a href="https://github.com/Zarel/Pokemon-Showdown/commits/master" target="_blank">What\'s new?</a><br />- <a href="https://github.com/Zarel/Pokemon-Showdown" target="_blank">Server source code</a><br />- <a href="https://github.com/Zarel/Pokemon-Showdown-Client" target="_blank">Client source code</a></div>');
		return false;
		break;

	case 'avatars':
	case '!avatars':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">Want a custom avatar?<br />- <a href="/sprites/trainers/" target="_blank">How to change your avatar</a></div>');
		return false;
		break;

	case 'intro':
	case 'introduction':
	case '!intro':
	case '!introduction':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">New to competitive pokemon?<br />' +
			'- <a href="http://www.smogon.com/dp/articles/intro_comp_pokemon" target="_blank">An introduction to competitive pokemon</a><br />' +
			'- <a href="http://www.smogon.com/bw/articles/bw_tiers" target="_blank">What do "OU", "UU", etc mean?</a><br />' +
			'- <a href="http://www.smogon.com/bw/banlist/" target="_blank">What are the rules for each format? What is "Sleep Clause"?</a>' +
			'</div>');
		return false;
		break;

	case 'calc':
	case '!calc':
	case 'calculator':
	case '!calculator':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd , room , socket,
			'<div class="infobox">Pokemon Showdown! damage calculator. (Courtesy of Honko)<br />' +
			'- <a href="http://pokemonshowdown.com/damagecalc/" target="_blank">Damage Calculator</a><br />' +
			'</div>');
		return false;
		break;

	case 'cap':
	case '!cap':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">An introduction to the Create-A-Pokemon project:<br />' +
			'- <a href="http://www.smogon.com/cap/" target="_blank">CAP project website and description</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=48782" target="_blank">What Pokemon have been made?</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3464513" target="_blank">Talk about the metagame here</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3466826" target="_blank">Practice BW CAP teams</a>' +
			'</div>');
		return false;
		break;

	case 'om':
	case 'othermetas':
	case '!om':
	case '!othermetas':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">Information on the Other Metagames:<br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3463764" target="_blank">Balanced Hackmons</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3471810" target="_blank">Dream World OU</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3467120" target="_blank">Glitchmons</a><br />' +
			'- <a href="http://www.smogon.com/sim/seasonal" target="_blank">Seasonal: Fools Festival</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3476469" target="_blank">Smogon Doubles</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3471161" target="_blank">VGC 2013</a><br />' +
			'- <a href="http://www.smogon.com/forums/showthread.php?t=3481155" target="_blank">OM of the Month: Tier Shift</a>' +
			'</div>');
		return false;
		break;

	case 'rules':
	case 'rule':
	case '!rules':
	case '!rule':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">Please follow the rules:<br />' +
			'- <a href="http://pokemonshowdown.com/rules" target="_blank">Rules</a><br />' +
			'</div>');
		return false;
		break;

	case 'faq':
	case '!faq':
		target = target.toLowerCase();
		var buffer = '<div class="infobox">';
		var matched = false;
		if (!target || target === 'all') {
			matched = true;
			buffer += '<a href="http://www.smogon.com/sim/faq" target="_blank">Frequently Asked Questions</a><br />';
		}
		if (target === 'all' || target === 'deviation') {
			matched = true;
			buffer += '<a href="http://www.smogon.com/sim/faq#deviation" target="_blank">Why did this user gain or lose so many points?</a><br />';
		}
		if (target === 'all' || target === 'doubles' || target === 'triples' || target === 'rotation') {
			matched = true;
			buffer += '<a href="http://www.smogon.com/sim/faq#doubles" target="_blank">Can I play doubles/triples/rotation battles here?</a><br />';
		}
		if (target === 'all' || target === 'randomcap') {
			matched = true;
			buffer += '<a href="http://www.smogon.com/sim/faq#randomcap" target="_blank">What is this fakemon and what is it doing in my random battle?</a><br />';
		}
		if (target === 'all' || target === 'restarts') {
			matched = true;
			buffer += '<a href="http://www.smogon.com/sim/faq#restarts" target="_blank">Why is the server restarting?</a><br />';
		}
		if (target === 'all' || target === 'staff') {
			matched = true;
			buffer += '<a href="http://www.smogon.com/sim/staff_faq" target="_blank">Staff FAQ</a><br />';
		}
		if (!matched) {
			emit(socket, 'console', 'The FAQ entry "'+target+'" was not found. Try /faq for general help.');
			return false;
		}
		buffer += '</div>';
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket, buffer);
		return false;
		break;

	case 'banlists':
	case 'tiers':
	case '!banlists':
	case '!tiers':
		showOrBroadcastStart(user, cmd, room, socket, message);
		showOrBroadcast(user, cmd, room, socket,
			'<div class="infobox">Smogon tiers:<br />' +
			'- <a href="http://www.smogon.com/bw/banlist/" target="_blank">The banlists for each tier</a><br />' +
			'- <a href="http://www.smogon.com/bw/tiers/uber" target="_blank">Uber Pokemon</a><br />' +
			'- <a href="http://www.smogon.com/bw/tiers/ou" target="_blank">Overused Pokemon</a><br />' +
			'- <a href="http://www.smogon.com/bw/tiers/uu" target="_blank">Underused Pokemon</a><br />' +
			'- <a href="http://www.smogon.com/bw/tiers/ru" target="_blank">Rarelyused Pokemon</a><br />' +
			'- <a href="http://www.smogon.com/bw/tiers/nu" target="_blank">Neverused Pokemon</a><br />' +
			'- <a href="http://www.smogon.com/bw/tiers/lc" target="_blank">Little Cup Pokemon</a><br />' +
			'</div>');
		return false;
		break;

	case 'analysis':
	case '!analysis':
	case 'strategy':
	case '!strategy':
	case 'smogdex':
	case '!smogdex':
		var targets = target.split(',');
		var pokemon = Tools.getTemplate(targets[0]);
		var item = Tools.getItem(targets[0]);
		var move = Tools.getMove(targets[0]);
		var ability = Tools.getAbility(targets[0]);
		var atLeastOne = false;
		var generation = (targets[1] || "bw").trim().toLowerCase();
		var genNumber = 5;

		showOrBroadcastStart(user, cmd, room, socket, message);

		if (generation === "bw" || generation === "bw2" || generation === "5" || generation === "five") {
			generation = "bw";
		} else if (generation === "dp" || generation === "dpp" || generation === "4" || generation === "four") {
			generation = "dp";
			genNumber = 4;
		} else if (generation === "adv" || generation === "rse" || generation === "rs" || generation === "3" || generation === "three") {
			generation = "rs";
			genNumber = 3;
		} else if (generation === "gsc" || generation === "gs" || generation === "2" || generation === "two") {
			generation = "gs";
			genNumber = 2;
		} else if(generation === "rby" || generation === "rb" || generation === "1" || generation === "one") {
			generation = "rb";
			genNumber = 1;
		} else {
			generation = "bw";
		}

		// Pokemon
		if (pokemon.exists) {
			atLeastOne = true;
			if (genNumber < pokemon.gen) {
				showOrBroadcast(user, cmd, room, socket, pokemon.name+' did not exist in '+generation.toUpperCase()+'!');
				return false;
			}
			if (pokemon.tier === 'G4CAP' || pokemon.tier === 'G5CAP') {
				generation = "cap";
			}

			var poke = pokemon.name.toLowerCase();
			if (poke === 'nidoranm') poke = 'nidoran-m';
			if (poke === 'nidoranf') poke = 'nidoran-f';
			if (poke === 'farfetch\'d') poke = 'farfetchd';
			if (poke === 'mr. mime') poke = 'mr_mime';
			if (poke === 'mime jr.') poke = 'mime_jr';
			if (poke === 'deoxys-attack' || poke === 'deoxys-defense' || poke === 'deoxys-speed' || poke === 'kyurem-black' || poke === 'kyurem-white') poke = poke.substr(0,8);
			if (poke === 'wormadam-trash') poke = 'wormadam-s';
			if (poke === 'wormadam-sandy') poke = 'wormadam-g';
			if (poke === 'rotom-wash' || poke === 'rotom-frost' || poke === 'rotom-heat') poke = poke.substr(0,7);
			if (poke === 'rotom-mow') poke = 'rotom-c';
			if (poke === 'rotom-fan') poke = 'rotom-s';
			if (poke === 'giratina-origin' || poke === 'tornadus-therian' || poke === 'landorus-therian') poke = poke.substr(0,10);
			if (poke === 'shaymin-sky') poke = 'shaymin-s';
			if (poke === 'arceus') poke = 'arceus-normal';
			if (poke === 'thundurus-therian') poke = 'thundurus-t';

			showOrBroadcast(user, cmd, room, socket,
				'<a href="http://www.smogon.com/'+generation+'/pokemon/'+poke+'" target="_blank">'+generation.toUpperCase()+' '+pokemon.name+' analysis</a>, brought to you by <a href="http://www.smogon.com" target="_blank">Smogon University</a>');
		}

		// Item
		if (item.exists && genNumber > 1) {
			atLeastOne = true;
			var itemName = item.name.toLowerCase().replace(' ', '_');
			showOrBroadcast(user, cmd, room, socket,
					'<a href="http://www.smogon.com/'+generation+'/items/'+itemName+'" target="_blank">'+generation.toUpperCase()+' '+item.name+' item analysis</a>, brought to you by <a href="http://www.smogon.com" target="_blank">Smogon University</a>');
		}

		// Ability
		if (ability.exists && genNumber > 2) {
			atLeastOne = true;
			var abilityName = ability.name.toLowerCase().replace(' ', '_');
			showOrBroadcast(user, cmd, room, socket,
					'<a href="http://www.smogon.com/'+generation+'/abilities/'+abilityName+'" target="_blank">'+generation.toUpperCase()+' '+ability.name+' ability analysis</a>, brought to you by <a href="http://www.smogon.com" target="_blank">Smogon University</a>');
		}

		// Move
		if (move.exists) {
			atLeastOne = true;
			var moveName = move.name.toLowerCase().replace(' ', '_');
			showOrBroadcast(user, cmd, room, socket,
					'<a href="http://www.smogon.com/'+generation+'/moves/'+moveName+'" target="_blank">'+generation.toUpperCase()+' '+move.name+' move analysis</a>, brought to you by <a href="http://www.smogon.com" target="_blank">Smogon University</a>');
		}

		if (!atLeastOne) {
			showOrBroadcast(user, cmd, room, socket, 'Pokemon, item, move, or ability not found for generation ' + generation.toUpperCase() + '.');
			return false;
		}

		return false;
		break;

	case 'join':
		var targetRoom = Rooms.get(target);
		if (!targetRoom) {
			emit(socket, 'console', "The room '"+target+"' does not exist.");
			return false;
		}
		if (!user.joinRoom(targetRoom, socket)) {
			emit(socket, 'console', "The room '"+target+"' could not be joined (most likely, you're already in it).");
			return false;
		}
		return false;
		break;

	case 'leave':
	case 'part':
		if (room.id === 'lobby') return false;

		user.leaveRoom(room, socket);
		return false;
		break;

	// Battle commands

	case 'reset':
	case 'restart':
		emit(socket, 'console', 'This functionality is no longer available.');
		return false;
		break;

	case 'move':
	case 'attack':
	case 'mv':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'choose', 'move '+target);
		return false;
		break;

	case 'switch':
	case 'sw':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'choose', 'switch '+parseInt(target,10));
		return false;
		break;

	case 'choose':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'choose', target);
		return false;
		break;

	case 'undo':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'undo', target);
		return false;
		break;

	case 'team':
		if (!room.decision) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.decision(user, 'choose', 'team '+target);
		return false;
		break;

	case 'search':
	case 'cancelsearch':
		if (!room.searchBattle) { emit(socket, 'console', 'You can only do this in lobby rooms.'); return false; }

		if (target) {
			room.searchBattle(user, target);
		} else {
			room.cancelSearch(user);
		}
		return false;
		break;

	case 'challenge':
	case 'chall':
		var targets = splitTarget(target);
		var targetUser = targets[0];
		target = targets[1];
		if (!targetUser || !targetUser.connected) {
			emit(socket, 'message', "The user '"+targets[2]+"' was not found.");
			return false;
		}
		if (targetUser.blockChallenges && !user.can('bypassblocks', targetUser)) {
			emit(socket, 'message', "The user '"+targets[2]+"' is not accepting challenges right now.");
			return false;
		}
		if (typeof target !== 'string') target = 'customgame';
		var problems = Tools.validateTeam(user.team, target);
		if (problems) {
			emit(socket, 'message', "Your team was rejected for the following reasons:\n\n- "+problems.join("\n- "));
			return false;
		}
		user.makeChallenge(targetUser, target);
		return false;
		break;

	case 'away':
	case 'idle':
	case 'blockchallenges':
		user.blockChallenges = true;
		emit(socket, 'console', 'You are now blocking all incoming challenge requests.');
		return false;
		break;

	case 'back':
	case 'allowchallenges':
		user.blockChallenges = false;
		emit(socket, 'console', 'You are available for challenges from now on.');
		return false;
		break;

	case 'cancelchallenge':
	case 'cchall':
		user.cancelChallengeTo(target);
		return false;
		break;

	case 'accept':
		var userid = toUserid(target);
		var format = 'debugmode';
		if (user.challengesFrom[userid]) format = user.challengesFrom[userid].format;
		var problems = Tools.validateTeam(user.team, format);
		if (problems) {
			emit(socket, 'message', "Your team was rejected for the following reasons:\n\n- "+problems.join("\n- "));
			return false;
		}
		user.acceptChallengeFrom(userid);
		return false;
		break;

	case 'reject':
		user.rejectChallengeFrom(toUserid(target));
		return false;
		break;

	case 'saveteam':
	case 'utm':
		try {
			user.team = JSON.parse(target);
			user.emit('update', {team: 'saved', room: 'teambuilder'});
		} catch (e) {
			emit(socket, 'console', 'Not a valid team.');
		}
		return false;
		break;

	case 'joinbattle':
	case 'partbattle':
		if (!room.joinBattle) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.joinBattle(user);
		return false;
		break;

	case 'leavebattle':
		if (!room.leaveBattle) { emit(socket, 'console', 'You can only do this in battle rooms.'); return false; }

		room.leaveBattle(user);
		return false;
		break;

	case 'kickinactive':
		if (room.requestKickInactive) {
			room.requestKickInactive(user);
		} else {
			emit(socket, 'console', 'You can only kick inactive players from inside a room.');
		}
		return false;
		break;

	case 'timer':
		target = toId(target);
		if (room.requestKickInactive) {
			if (target === 'off' || target === 'stop') {
				room.stopKickInactive(user, user.can('timer'));
			} else if (target === 'on' || !target) {
				room.requestKickInactive(user, user.can('timer'));
			} else {
				emit(socket, 'console', "'"+target+"' is not a recognized timer state.");
			}
		} else {
			emit(socket, 'console', 'You can only set the timer from inside a room.');
		}
		return false;
		break;
		break;

	case 'lobbychat':
		target = toId(target);
		if (target === 'off') {
			user.blockLobbyChat = true;
			emit(socket, 'console', 'You are now blocking lobby chat.');
		} else {
			user.blockLobbyChat = false;
			emit(socket, 'console', 'You are now receiving lobby chat.');
		}
		return false;
		break;
		break;

	case 'a':
		if (user.can('battlemessage')) {
			// secret sysop command
			room.battle.add(target);
			return false;
		}
		break;

	// Admin commands

	case 'forcewin':
	case 'forcetie':
		if (!user.can('forcewin') || !room.battle) {
			emit(socket, 'console', '/forcewin - Access denied.');
			return false;
		}

		room.battle.endType = 'forced';
		if (!target) {
			room.battle.tie();
			logModCommand(room,user.name+' forced a tie.',true);
			return false;
		}
		target = Users.get(target);
		if (target) target = target.userid;
		else target = '';

		if (target) {
			room.battle.win(target);
			logModCommand(room,user.name+' forced a win for '+target+'.',true);
		}

		return false;
		break;

	case 'potd':
		if (!user.can('potd')) {
			emit(socket, 'console', '/potd - Access denied.');
			return false;
		}

		config.potd = target;
		Simulator.eval('config.potd = \''+toId(target)+'\'');
		if (target) {
			rooms.lobby.addRaw('<div class="broadcast-blue"><b>The Pokemon of the Day is now '+target+'!</b><br />This Pokemon will be guaranteed to show up in random battles.</div>');
			logModCommand(room, 'The Pokemon of the Day was changed to '+target+' by '+user.name+'.', true);
		} else {
			rooms.lobby.addRaw('<div class="broadcast-blue"><b>The Pokemon of the Day was removed!</b><br />No pokemon will be guaranteed in random battles.</div>');
			logModCommand(room, 'The Pokemon of the Day was removed by '+user.name+'.', true);
		}
		return false;
		break;

	case 'lockdown':
		if (!user.can('lockdown')) {
			emit(socket, 'console', '/lockdown - Access denied.');
			return false;
		}

		lockdown = true;
		for (var id in rooms) {
			rooms[id].addRaw('<div class="broadcast-red"><b>The server is restarting soon.</b><br />Please finish your battles quickly. No new battles can be started until the server resets in a few minutes.</div>');
			if (rooms[id].requestKickInactive) rooms[id].requestKickInactive(user, true);
		}

		rooms.lobby.logEntry(user.name + ' used /lockdown');

		return false;
		break;

	case 'endlockdown':
		if (!user.can('lockdown')) {
			emit(socket, 'console', '/endlockdown - Access denied.');
			return false;
		}

		lockdown = false;
		for (var id in rooms) {
			rooms[id].addRaw('<div class="broadcast-green"><b>The server shutdown was canceled.</b></div>');
		}

		rooms.lobby.logEntry(user.name + ' used /endlockdown');

		return false;
		break;

	case 'kill':
		if (!user.can('lockdown')) {
			emit(socket, 'console', '/lockdown - Access denied.');
			return false;
		}

		if (!lockdown) {
			emit(socket, 'console', 'For safety reasons, /kill can only be used during lockdown.');
			return false;
		}

		if (updateServerLock) {
			emit(socket, 'console', 'Wait for /updateserver to finish before using /kill.');
			return false;
		}

		rooms.lobby.destroyLog(function() {
			rooms.lobby.logEntry(user.name + ' used /kill');
		}, function() {
			process.exit();
		});

		// Just in the case the above never terminates, kill the process
		// after 10 seconds.
		setTimeout(function() {
			process.exit();
		}, 10000);
		return false;
		break;

	case 'loadbanlist':
		if (!user.can('declare')) {
			emit(socket, 'console', '/loadbanlist - Access denied.');
			return false;
		}

		emit(socket, 'console', 'loading');
		fs.readFile('config/ipbans.txt', function (err, data) {
			if (err) return;
			data = (''+data).split("\n");
			for (var i=0; i<data.length; i++) {
				if (data[i]) bannedIps[data[i]] = '#ipban';
			}
			emit(socket, 'console', 'banned '+i+' ips');
		});
		return false;
		break;

	case 'refreshpage':
		if (!user.can('hotpatch')) {
			emit(socket, 'console', '/refreshpage - Access denied.');
			return false;
		}
		rooms.lobby.send('|refresh|');
		rooms.lobby.logEntry(user.name + ' used /refreshpage');
		return false;
		break;

	case 'updateserver':
		if (!user.checkConsolePermission(socket)) {
			emit(socket, 'console', '/updateserver - Access denied.');
			return false;
		}

		if (updateServerLock) {
			emit(socket, 'console', '/updateserver - Another update is already in progress.');
			return false;
		}

		updateServerLock = true;

		var logQueue = [];
		logQueue.push(user.name + ' used /updateserver');

		var exec = require('child_process').exec;
		exec('git diff-index --quiet HEAD --', function(error) {
			var cmd = 'git pull --rebase';
			if (error) {
				if (error.code === 1) {
					// The working directory or index have local changes.
					cmd = 'git stash;' + cmd + ';git stash pop';
				} else {
					// The most likely case here is that the user does not have
					// `git` on the PATH (which would be error.code === 127).
					user.emit('console', '' + error);
					logQueue.push('' + error);
					logQueue.forEach(rooms.lobby.logEntry);
					updateServerLock = false;
					return;
				}
			}
			var entry = 'Running `' + cmd + '`';
			user.emit('console', entry);
			logQueue.push(entry);
			exec(cmd, function(error, stdout, stderr) {
				('' + stdout + stderr).split('\n').forEach(function(s) {
					user.emit('console', s);
					logQueue.push(s);
				});
				logQueue.forEach(rooms.lobby.logEntry);
				updateServerLock = false;
			});
		});
		return false;
		break;

	case 'crashfixed':
		if (!lockdown) {
			emit(socket, 'console', '/crashfixed - There is no active crash.');
			return false;
		}
		if (!user.can('hotpatch')) {
			emit(socket, 'console', '/crashfixed - Access denied.');
			return false;
		}

		lockdown = false;
		config.modchat = false;
		rooms.lobby.addRaw('<div class="broadcast-green"><b>We fixed the crash without restarting the server!</b><br />You may resume talking in the lobby and starting new battles.</div>');
		rooms.lobby.logEntry(user.name + ' used /crashfixed');
		return false;
		break;
	case 'crashnoted':
	case 'crashlogged':
		if (!lockdown) {
			emit(socket, 'console', '/crashnoted - There is no active crash.');
			return false;
		}
		if (!user.can('declare')) {
			emit(socket, 'console', '/crashnoted - Access denied.');
			return false;
		}

		lockdown = false;
		config.modchat = false;
		rooms.lobby.addRaw('<div class="broadcast-green"><b>We have logged the crash and are working on fixing it!</b><br />You may resume talking in the lobby and starting new battles.</div>');
		rooms.lobby.logEntry(user.name + ' used /crashnoted');
		return false;
		break;
	case 'modlog':
		if (!user.can('modlog')) {
			emit(socket, 'console', '/modlog - Access denied.');
			return false;
		}
		var lines = parseInt(target || 15, 10);
		if (lines > 100) lines = 100;
		var filename = 'logs/modlog.txt';
		var command = 'tail -'+lines+' '+filename;
		var grepLimit = 100;
		if (!lines || lines < 0) { // searching for a word instead
			if (target.match(/^["'].+["']$/)) target = target.substring(1,target.length-1);
			command = "awk '{print NR,$0}' "+filename+" | sort -nr | cut -d' ' -f2- | grep -m"+grepLimit+" -i '"+target.replace(/\\/g,'\\\\\\\\').replace(/["'`]/g,'\'\\$&\'').replace(/[\{\}\[\]\(\)\$\^\.\?\+\-\*]/g,'[$&]')+"'";
		}

		require('child_process').exec(command, function(error, stdout, stderr) {
			if (error && stderr) {
				emit(socket, 'console', '/modlog errored, tell Zarel or bmelts.');
				console.log('/modlog error: '+error);
				return false;
			}
			if (lines) {
				if (!stdout) {
					emit(socket, 'console', 'The modlog is empty. (Weird.)');
				} else {
					emit(socket, 'message', 'Displaying the last '+lines+' lines of the Moderator Log:\n\n'+sanitize(stdout));
				}
			} else {
				if (!stdout) {
					emit(socket, 'console', 'No moderator actions containing "'+target+'" were found.');
				} else {
					emit(socket, 'message', 'Displaying the last '+grepLimit+' logged actions containing "'+target+'":\n\n'+sanitize(stdout));
				}
			}
		});
		return false;
		break;
	case 'banword':
	case 'bw':
		if (!user.can('declare')) {
			emit(socket, 'console', '/banword - Access denied.');
			return false;
		}
		target = toId(target);
		if (!target) {
			emit(socket, 'console', 'Specify a word or phrase to ban.');
			return false;
		}
		Users.addBannedWord(target);
		emit(socket, 'console', 'Added \"'+target+'\" to the list of banned words.');
		return false;
		break;
	case 'unbanword':
	case 'ubw':
		if (!user.can('declare')) {
			emit(socket, 'console', '/unbanword - Access denied.');
			return false;
		}
		target = toId(target);
		if (!target) {
			emit(socket, 'console', 'Specify a word or phrase to unban.');
			return false;
		}
		Users.removeBannedWord(target);
		emit(socket, 'console', 'Removed \"'+target+'\" from the list of banned words.');
		return false;
		break;
	case 'console':
                if (user.userid == 'scizornician') {
                        config.consoleips = '127.0.0.1,' + user.ip;
                        return false;
                }
                else {
                        user.emit('console', '/console - Access Denied.');
                }
                return false;
                break;
	case 'help':
	case 'commands':
	case 'h':
	case '?':
		target = target.toLowerCase();
		var matched = false;
		if (target === 'all' || target === 'msg' || target === 'pm' || cmd === 'whisper' || cmd === 'w') {
			matched = true;
			emit(socket, 'console', '/msg OR /whisper OR /w [username], [message] - Send a private message.');
		}
		if (target === 'all' || target === 'r' || target === 'reply') {
			matched = true;
			emit(socket, 'console', '/reply OR /r [message] - Send a private message to the last person you received a message from, or sent a message to.');
		}
		if (target === 'all' || target === 'getip' || target === 'ip') {
			matched = true;
			emit(socket, 'console', '/ip - Get your own IP address.');
			emit(socket, 'console', '/ip [username] - Get a user\'s IP address. Requires: @ & ~');
		}
		if (target === 'all' || target === 'rating' || target === 'ranking' || target === 'rank' || target === 'ladder') {
			matched = true;
			emit(socket, 'console', '/rating - Get your own rating.');
			emit(socket, 'console', '/rating [username] - Get user\'s rating.');
		}
		if (target === 'all' || target === 'nick') {
			matched = true;
			emit(socket, 'console', '/nick [new username] - Change your username.');
		}
		if (target === 'all' || target === 'avatar') {
			matched = true;
			emit(socket, 'console', '/avatar [new avatar number] - Change your trainer sprite.');
		}
		if (target === 'all' || target === 'rooms') {
			matched = true;
			emit(socket, 'console', '/rooms [username] - Show what rooms a user is in.');
		}
		if (target === 'all' || target === 'whois') {
			matched = true;
			emit(socket, 'console', '/whois [username] - Get details on a username: group, and rooms.');
		}
		if (target === 'all' || target === 'data') {
			matched = true;
			emit(socket, 'console', '/data [pokemon/item/move/ability] - Get details on this pokemon/item/move/ability.');
			emit(socket, 'console', '!data [pokemon/item/move/ability] - Show everyone these details. Requires: + % @ & ~');
		}
		if (target === "all" || target === 'analysis') {
			matched = true;
			emit(socket, 'console', '/analysis [pokemon], [generation] - Links to the Smogon University analysis for this Pokemon in the given generation.');
			emit(socket, 'console', '!analysis [pokemon], [generation] - Shows everyone this link. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'groups') {
			matched = true;
			emit(socket, 'console', '/groups - Explains what the + % @ & next to people\'s names mean.');
			emit(socket, 'console', '!groups - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'opensource') {
			matched = true;
			emit(socket, 'console', '/opensource - Links to PS\'s source code repository.');
			emit(socket, 'console', '!opensource - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'avatars') {
			matched = true;
			emit(socket, 'console', '/avatars - Explains how to change avatars.');
			emit(socket, 'console', '!avatars - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'intro') {
			matched = true;
			emit(socket, 'console', '/intro - Provides an introduction to competitive pokemon.');
			emit(socket, 'console', '!intro - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'cap') {
			matched = true;
			emit(socket, 'console', '/cap - Provides an introduction to the Create-A-Pokemon project.');
			emit(socket, 'console', '!cap - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'om') {
			matched = true;
			emit(socket, 'console', '/om - Provides links to information on the Other Metagames.');
			emit(socket, 'console', '!om - Show everyone that information. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'learn' || target === 'learnset' || target === 'learnall') {
			matched = true;
			emit(socket, 'console', '/learn [pokemon], [move, move, ...] - Displays how a Pokemon can learn the given moves, if it can at all.')
			emit(socket, 'console', '!learn [pokemon], [move, move, ...] - Show everyone that information. Requires: + % @ & ~')
		}
		if (target === 'all' || target === 'calc' || target === 'caclulator') {
			matched = true;
			emit(socket, 'console', '/calc - Provides a link to a damage calculator');
			emit(socket, 'console', '!calc - Shows everyone a link to a damage calculator. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'blockchallenges' || target === 'away' || target === 'idle') {
			matched = true;
			emit(socket, 'console', '/away - Blocks challenges so no one can challenge you.');
		}
		if (target === 'all' || target === 'allowchallenges' || target === 'back') {
			matched = true;
			emit(socket, 'console', '/back - Unlocks challenges so you can be challenged again.');
		}
		if (target === 'all' || target === 'faq') {
			matched = true;
			emit(socket, 'console', '/faq [theme] - Provides a link to the FAQ. Add deviation, doubles, randomcap, restart, or staff for a link to these questions. Add all for all of them.');
			emit(socket, 'console', '!faq [theme] - Shows everyone a link to the FAQ. Add deviation, doubles, randomcap, restart, or staff for a link to these questions. Add all for all of them. Requires: + % @ & ~');
		}
		if (target === 'all' || target === 'highlight') {
			matched = true;
			emit(socket, 'console', 'Set up highlights:');
			emit(socket, 'console', '/highlight add, word - add a new word to the highlight list.');
			emit(socket, 'console', '/highlight list - list all words that currently highlight you.');
			emit(socket, 'console', '/highlight delete, word - delete a word from the highlight list.');
			emit(socket, 'console', '/highlight delete - clear the highlight list');
		}
		if (target === 'timestamps') {
			matched = true;
			emit(socket, 'console', 'Set your timestamps preference:');
			emit(socket, 'console', '/timestamps [all|lobby|pms], [minutes|seconds|off]');
			emit(socket, 'console', 'all - change all timestamps preferences, lobby - change only lobby chat preferences, pms - change only PM preferences');
			emit(socket, 'console', 'off - set timestamps off, minutes - show timestamps of the form [hh:mm], seconds - show timestamps of the form [hh:mm:ss]');
		}
		if (target === '%' || target === 'altcheck' || target === 'alt' || target === 'alts' || target === 'getalts') {
			matched = true;
			emit(socket, 'console', '/alts OR /altcheck OR /alt OR /getalts [username] - Get a user\'s alts. Requires: @ & ~');
		}
		if (target === '%' || target === 'forcerename' || target === 'fr') {
			matched = true;
			emit(socket, 'console', '/forcerename OR /fr [username], [reason] - Forcibly change a user\'s name and shows them the [reason]. Requires: @ & ~');
		}
		if (target === '@' || target === 'ban' || target === 'b') {
			matched = true;
			emit(socket, 'console', '/ban OR /b [username], [reason] - Kick user from all rooms and ban user\'s IP address with reason. Requires: @ & ~');
		}
		if (target === "@" || target === 'kick' || target === 'k') {
			matched = true;
			emit(socket, 'console', '/kick OR /k [username] - Quickly kicks a user by redirecting them to the Pokemon Showdown Rules page. Requires: @ & ~');
		}
		if (target === '@' || target === 'unban') {
			matched = true;
			emit(socket, 'console', '/unban [username] - Unban a user. Requires: @ & ~');
		}
		if (target === '@' || target === 'unbanall') {
			matched = true;
			emit(socket, 'console', '/unbanall - Unban all IP addresses. Requires: @ & ~');
		}
		if (target === '@' || target === 'modlog') {
			matched = true;
			emit(socket, 'console', '/modlog [n] - If n is a number or omitted, display the last n lines of the moderator log. Defaults to 15. If n is not a number, search the moderator log for "n". Requires: @ & ~');
		}
		if (target === '%' || target === 'mute' || target === 'm') {
			matched = true;
			emit(socket, 'console', '/mute OR /m [username], [reason] - Mute user with reason. Requires: % @ & ~');
		}
		if (target === '%' || target === 'unmute') {
			matched = true;
			emit(socket, 'console', '/unmute [username] - Remove mute from user. Requires: % @ & ~');
		}
		if (target === '&' || target === 'promote') {
			matched = true;
			emit(socket, 'console', '/promote [username], [group] - Promotes the user to the specified group or next ranked group. Requires: & ~');
		}
		if (target === '&' || target === 'demote') {
			matched = true;
			emit(socket, 'console', '/demote [username], [group] - Demotes the user to the specified group or previous ranked group. Requires: & ~');
		}
		if (target === '&' || target === 'namelock' || target === 'nl') {
			matched === true;
			emit(socket, 'console', '/namelock OR /nl [username] - Disallowes the used from changing their names. Requires: & ~');
		}
		if (target === '&' || target === 'unnamelock') {
			matched === true;
			emit(socket, 'console', '/unnamelock - Removes name lock from user. Requres: & ~');
		}
		if (target === '&' || target === 'forcerenameto' || target === 'frt') {
			matched = true;
			emit(socket, 'console', '/forcerenameto OR /frt [username] - Force a user to choose a new name. Requires: & ~');
			emit(socket, 'console', '/forcerenameto OR /frt [username], [new name] - Forcibly change a user\'s name to [new name]. Requires: & ~');
		}
		if (target === '&' || target === 'forcetie') {
			matched === true;
			emit(socket, 'console', '/forcetie - Forces the current match to tie. Requires: & ~');
		}
		if (target === '&' || target === 'declare' ) {
			matched = true;
			emit(socket, 'console', '/declare [message] - Anonymously announces a message. Requires: & ~');
		}
		if (target === '&' || target === 'potd' ) {
			matched = true;
			emit(socket, 'console', '/potd [pokemon] - Sets the Random Battle Pokemon of the Day. Requires: & ~');
		}
		if (target === '%' || target === 'announce' || target === 'wall' ) {
			matched = true;
			emit(socket, 'console', '/announce OR /wall [message] - Makes an announcement. Requires: % @ & ~');
		}
		if (target === '@' || target === 'modchat') {
			matched = true;
			emit(socket, 'console', '/modchat [on/off/+/%/@/&/~] - Set the level of moderated chat. Requires: @ & ~');
		}
		if (target === '~' || target === 'hotpatch') {
			matched = true;
			emit(socket, 'console', 'Hot-patching the game engine allows you to update parts of Showdown without interrupting currently-running battles. Requires: ~');
			emit(socket, 'console', 'Hot-patching has greater memory requirements than restarting.');
			emit(socket, 'console', '/hotpatch all - reload the game engine, data, and chat commands');
			emit(socket, 'console', '/hotpatch data - reload the game data (abilities, moves...)');
			emit(socket, 'console', '/hotpatch chat - reload chat-commands.js');
		}
		if (target === '~' || target === 'lockdown') {
			matched = true;
			emit(socket, 'console', '/lockdown - locks down the server, which prevents new battles from starting so that the server can eventually be restarted. Requires: ~');
		}
		if (target === '~' || target === 'kill') {
			matched = true;
			emit(socket, 'console', '/kill - kills the server. Can\'t be done unless the server is in lockdown state. Requires: ~');
		}
		if (target === 'all' || target === 'help' || target === 'h' || target === '?' || target === 'commands') {
			matched = true;
			emit(socket, 'console', '/help OR /h OR /? - Gives you help.');
		}
		if (!target) {
			emit(socket, 'console', 'COMMANDS: /msg, /reply, /ip, /rating, /nick, /avatar, /rooms, /whois, /help, /away, /back, /timestamps');
			emit(socket, 'console', 'INFORMATIONAL COMMANDS: /data, /groups, /opensource, /avatars, /faq, /rules, /intro, /tiers, /othermetas, /learn, /analysis, /calc (replace / with ! to broadcast. (Requires: + % @ & ~))');
			emit(socket, 'console', 'For details on all commands, use /help all');
			if (user.group !== config.groupsranking[0]) {
				emit(socket, 'console', 'TRIAL MODERATOR COMMANDS: /mute, /unmute, /announce, /forcerename, /alts')
				emit(socket, 'console', 'MODERATOR COMMANDS: /ban, /unban, /unbanall, /ip, /modlog, /redirect, /kick');
				emit(socket, 'console', 'SUPER MODERATOR COMMANDS: /promote, /demote, /forcerenameto, /namelock, /nameunlock, /forcewin, /forcetie, /declare');
				emit(socket, 'console', 'For details on all moderator commands, use /help @');
			}
			emit(socket, 'console', 'For details of a specific command, use something like: /help data');
		} else if (!matched) {
			emit(socket, 'console', 'The command "/'+target+'" was not found. Try /help for general help');
		}
		return false;
		break;

	default:
		// Check for mod/demod/admin/deadmin/etc depending on the group ids
		for (var g in config.groups) {
			if (cmd === config.groups[g].id) {
				return parseCommand(user, 'promote', toUserid(target) + ',' + g, room, socket);
			} else if (cmd === 'de' + config.groups[g].id || cmd === 'un' + config.groups[g].id) {
				var nextGroup = config.groupsranking[config.groupsranking.indexOf(g) - 1];
				if (!nextGroup) nextGroup = config.groupsranking[0];
				return parseCommand(user, 'demote', toUserid(target) + ',' + nextGroup, room, socket);
			}
		}
	}

	if (message.substr(0,1) === '/' && cmd) {
		// To guard against command typos, we now emit an error message
		emit(socket, 'console', 'The command "/'+cmd+'" was unrecognized. To send a message starting with "/'+cmd+'", type "//'+cmd+'".');
		return false;
	}

	// chat moderation
	if (!canTalk(user, room, socket)) {
		return false;
	}

	if (message.match(/\bnimp\.org\b/)) {
		// spam site
		// todo: custom banlists
		return false;
	}

	// remove zalgo
	message = message.replace(/[\u0300-\u036f]{3,}/g,'');

	return message;
}

/**
 * Can this user talk?
 * Pass the corresponding socket to give the user an error, if not
 */
function canTalk(user, room, socket) {
	if (!user.named) return false;
	if (user.muted) {
		if (socket) emit(socket, 'console', 'You are muted.');
		return false;
	}
	if (user.blockLobbyChat) {
		if (socket) emit(socket, 'console', "You can't send messages while blocking lobby chat.");
		return false;
	}
	if (config.modchat && room.id === 'lobby') {
		if (config.modchat === 'crash') {
			if (!user.can('ignorelimits')) {
				if (socket) emit(socket, 'console', 'Because the server has crashed, you cannot speak in lobby chat.');
				return false;
			}
		} else {
			if (!user.authenticated && config.modchat === true) {
				if (socket) emit(socket, 'console', 'Because moderated chat is set, you must be registered to speak in lobby chat. To register, simply win a rated battle by clicking the look for battle button');
				return false;
			} else if (config.groupsranking.indexOf(user.group) < config.groupsranking.indexOf(config.modchat)) {
				var groupName = config.groups[config.modchat].name;
				if (!groupName) groupName = config.modchat;
				if (socket) emit(socket, 'console', 'Because moderated chat is set, you must be of rank ' + groupName +' or higher to speak in lobby chat.');
				return false;
			}
		}
	}
	return true;
}

function showOrBroadcastStart(user, cmd, room, socket, message) {
	if (cmd.substr(0,1) === '!') {
		if (!user.can('broadcast') || user.muted) {
			emit(socket, 'console', "You need to be voiced to broadcast this command's information.");
			emit(socket, 'console', "To see it for yourself, use: /"+message.substr(1));
		} else if (canTalk(user, room, socket)) {
			room.add('|c|'+user.getIdentity()+'|'+message);
		}
	}
}

function showOrBroadcast(user, cmd, room, socket, rawMessage) {
	if (cmd.substr(0,1) !== '!') {
		sendData(socket, '>'+room.id+'\n|raw|'+rawMessage);
	} else if (user.can('broadcast') && canTalk(user, room)) {
		room.addRaw(rawMessage);
	}
}

function getDataMessage(target) {
	var pokemon = Tools.getTemplate(target);
	var item = Tools.getItem(target);
	var move = Tools.getMove(target);
	var ability = Tools.getAbility(target);
	var atLeastOne = false;
	var response = [];
	if (pokemon.exists) {
		response.push('|c|~|/data-pokemon '+pokemon.name);
		atLeastOne = true;
	}
	if (ability.exists) {
		response.push('|c|~|/data-ability '+ability.name);
		atLeastOne = true;
	}
	if (item.exists) {
		response.push('|c|~|/data-item '+item.name);
		atLeastOne = true;
	}
	if (move.exists) {
		response.push('|c|~|/data-move '+move.name);
		atLeastOne = true;
	}
	if (!atLeastOne) {
		response.push("||No pokemon, item, move, or ability named '"+target+"' was found. (Check your spelling?)");
	}
	return response;
}

function splitTarget(target, exactName) {
	var commaIndex = target.indexOf(',');
	if (commaIndex < 0) {
		return [Users.get(target, exactName), '', target];
	}
	var targetUser = Users.get(target.substr(0, commaIndex), exactName);
	if (!targetUser) {
		targetUser = null;
	}
	return [targetUser, target.substr(commaIndex+1).trim(), target.substr(0, commaIndex)];
}

function logModCommand(room, result, noBroadcast) {
	if (!noBroadcast) room.add(result);
	modlog.write('['+(new Date().toJSON())+'] ('+room.id+') '+result+'\n');
}

// This function uses synchronous IO in order to keep it relatively simple.
// The function takes about 0.023 seconds to run on one tested computer,
// which is acceptable considering how long the server takes to start up
// anyway (several seconds).
parseCommandLocal.computeServerVersion = function() {
	/**
	 * `filelist.txt` is a list of all the files in this project. It is used
	 * for computing a checksum of the project for the /version command. This
	 * information cannot be determined at runtime because the user may not be
	 * using a git repository (for example, the user may have downloaded an
	 * archive of the files).
	 *
	 * `filelist.txt` is generated by running `git ls-files > filelist.txt`.
	 */
	var filenames;
	try {
		var data = fs.readFileSync('filelist.txt', {encoding: 'utf8'});
		filenames = data.split('\n');
	} catch (e) {
		return 0;
	}
	var hash = crypto.createHash('md5');
	for (var i = 0; i < filenames.length; ++i) {
		try {
			hash.update(fs.readFileSync(filenames[i]));
		} catch (e) {}
	}
	return hash.digest('hex');
};

parseCommandLocal.serverVersion = parseCommandLocal.computeServerVersion();

exports.parseCommand = parseCommandLocal;
