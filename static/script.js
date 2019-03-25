let userStorageName = 'user';

function createUser(){
	let name = prompt('Enter Your Name');
	localStorage.setItem(userStorageName, name);
	return localStorage.getItem(userStorageName);
}

// window.localStorage.removeItem(userStorageName);
// localStorage.clear();
document.addEventListener('DOMContentLoaded', ()=>{
	// elms
	let joinBtns = document.querySelectorAll('.join-channel');
	let msgForm = document.querySelector('#msg-form');
	let createChannelForm = document.querySelector('#create-channel');
	let result = document.querySelector('#note');
	let channelHeader = document.querySelector('#channel-header');
	let msgs = document.querySelector('#msgs');
	let channelsContainer = document.querySelector('#channels-container');

	// get user or create one
	let user = localStorage.getItem(userStorageName);
	if(!user)
		user = createUser();

	result.innerHTML = `Welcome ${user}`;

	// start socket
	let socket = io.connect(location.protocol+'//'+document.domain+':'+location.port);
	

	socket.on('connect', ()=>{
		// every join button should emit event
		joinBtns.forEach(button=>{
			button.onclick = (e)=>{
				let channelName = button.dataset.name;

				joinBtns.forEach((btn)=>{btn.classList.remove('active')});
				button.classList.add('active');

				
				localStorage.setItem('lastChannel', channelName);
				socket.emit('joinChannel', {'channelName': channelName, 'username': user});
			};
		});

		createChannelForm.onsubmit = (e)=>{
			let channelName = e.target.children.channelName.value;
			e.target.children.channelName.value = '';
			if (channelName)
				socket.emit('createChannel',  channelName);
			return false;
		};


		let lastChannel = localStorage.getItem('lastChannel');
		if (lastChannel){
			document.querySelector(`#${lastChannel}`).click();
		}
	});

	socket.on('reloadChannels', (channels)=>{
		console.log(channels);
		channelsContainer.innerHTML = '';
		for(channel in channels){
			info = JSON.stringify( channels[channel] ).replace(/,/g, ',\n');

			html = `
				<li class="join-channel" id="${ channel }" data-name="${ channel }">
					<div class="d-flex bd-highlight">
						<div class="user_info">
							<span>${ channel }</span>
							<span class="info d-none">${ info }</span>
						</div>
					</div>
				</li>
			`
			channelsContainer.innerHTML += html;
		}

		let joinBtns = document.querySelectorAll('.join-channel');
		joinBtns.forEach(button=>{
			button.onclick = (e)=>{
				let channelName = button.dataset.name;
				socket.emit('joinChannel', {'channelName': channelName, 'username': user});
			};
		});
	});

	socket.on('afterJoin', (data)=>{
		document.querySelector('#'+data.name+' .info').innerHTML = JSON.stringify(data.info).replace(/,/g, ',\n');
	
		if (data.prevChannelName)
			document.querySelector('#'+data.prevChannelName+' .info').innerHTML = JSON.stringify(data.prevChannel).replace(/,/g, ',\n');

		channelHeader.innerHTML = `Welcome To ${data.name}`

		msgForm.dataset.name = data.name;

		result.innerHTML = `${data.username} is now in`



		msgs.innerHTML = ''
		for(msg of data.info.msgs){
			let html = `
			<div class="d-flex ${ msg.sender === user?  'justify-content-end' : 'justify-content-start' } mb-4">
				<div class="msg_cotainer ${ msg.sender === user?  'msg_cotainer_send' : '' }">
					${ msg.msg }
					<span class="msg_time">${ msg.sender }</span>
				</div>
			</div>
			`
			msgs.innerHTML += (html);
		}
		msgs.scrollBy(0, msgs.scrollHeight);
	});

	msgForm.onsubmit = (e)=>{
		let channelName = e.target.dataset.name;
		let msg = e.target.querySelector('#msg-area').value;
		if (channelName && msg){
			e.target.querySelector('#msg-area').value = '';
			socket.emit('sendMsg', {'msg': msg, 'channelName': channelName, 'senderName': user});
		}
		return false;
	};

	socket.on('spreadMsg', (data)=>{
		document.querySelector('#'+data.name+' .info').innerHTML = JSON.stringify(data.info).replace(/,/g, ',\n');
		let html = `
		<div class="d-flex ${ data.sender === user?  'justify-content-end' : 'justify-content-start' } mb-4">
			<div class="msg_cotainer ${ data.sender === user?  'msg_cotainer_send' : '' }">
				${ data.msg }
				<span class="msg_time">${ data.sender }</span>
			</div>
		</div>
		`
		msgs.innerHTML += (html);

		msgs.scrollBy(0, msgs.scrollHeight);
	});





});