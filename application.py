from flask import Flask, jsonify, render_template, request, redirect, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__, template_folder='templates', static_folder='static')
socketio = SocketIO(app)


# global variables (temp db)
channels = {}
users = {}
def channelMaker(channelName):
	notExist = False if channels.get(channelName) else True
	if notExist:
		channels[channelName] = {
			'msgs': [],
			'maxNumOfMsgs': 10,
			'sessions': [],
			'usernames': [],
		}
	return notExist

channelMaker('test1')
channelMaker('test2')

@app.route('/')
def index():
	context = {'channels': channels}
	return render_template('home.html', **context)


## socket ##
@socketio.on('connect')
def dd():
	print('\n\n\n\n connect : [', request.sid, ']\n\n\n')

@socketio.on('disconnect')
def xd():
	print('\n\n\n\n disconnect : [', request.sid, ']\n\n\n')
	sid = request.sid
	channel = users.get(sid)
	if channel:
		channelName = channel['channelName']
		username = channel['username']
		leave_room(channelName)
		channels[channelName]['sessions'].remove(sid)
		channels[channelName]['usernames'].remove(username)

		emit(
			'reloadChannels',
			channels,
			room = channelName,
		)



@socketio.on('createChannel')
def createChannel(channelName):
	if channelName and channelMaker(channelName):
		emit(
			'reloadChannels',
			channels,
			broadcast = True,
		)

@socketio.on('joinChannel')
def joinChannel(data):
	channelName = data['channelName']
	username = data['username']

	sid = request.sid
	channel = channels.get(channelName)
	if channel:	
		## leave previous chnnel if exist
		prevChannel = users.get(sid)
		if prevChannel:
			prevChannelName = prevChannel['channelName']
			leave_room(prevChannelName)
			# print(sid, channels[prevChannelName]['sessions'])
			channels[prevChannelName]['sessions'].remove(sid)
			channels[prevChannelName]['usernames'].remove(username)

		## join channel
		join_room(channelName)
		users[sid] = {
			'channelName': channelName,
			'username': username,
		}
		if sid not in channel['sessions']:
			channel['sessions'].append(sid)
			channel['usernames'].append(username)
		## tell all am here bitches
		data = {
			'info': channel, 
			'name': channelName, 
			'username': username, 
			'prevChannel': '', 
			'prevChannelName': ''
		}
		if prevChannel:
			data.update({'prevChannel': channels[prevChannelName], 'prevChannelName': prevChannelName})
		emit(
			'afterJoin', 
			data, 
			room=channelName,
		)

@socketio.on('sendMsg')
def sendMsg(data):
	msg = data['msg']
	channelName = data['channelName']
	sender = data['senderName']

	print(data, '\n\n\n')

	channel = channels.get(channelName)
	if channel:
		channel['msgs'].append({'msg': msg, 'sender': sender})
		if len(channel['msgs']) > channel['maxNumOfMsgs']:
			channel['msgs'].pop(0)

		emit(
			'spreadMsg',
			{'msg': msg, 'info': channel, 'name': channelName,'sender': sender},
			# broadcast=True,
			room=channelName,
		)





@app.errorhandler(404)
def page_not_found(err):
	return render_template('404.html'), 404