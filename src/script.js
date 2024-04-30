/*
MIT License

Copyright (c) 2024 Adam McKenney

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// Lint settings (version, and ignoring the one eval() call)
/* jshint esversion: 8 */
/* jshint -W061 */

/*
 * --- TODO ---
 * Add logic to complete quests
 * Add a way for a captive UI that waits for a command to finish, or allows specific interactions
 *    (look at keydown events and switch handlers)
 * Sanatize user input (remove html tags)
 * fix bug with command history and prompt
 * Add save game feature via local storage and JSON interpreter for the player object
 * Add proxies that slow down tracing by an order of magnitude
 * Add way to interact with a hardware, software, and leaks shop
 * Add spam, bitcoin miners, bots, and so on for passive income, with antivirus to remove viruses
 * (maybe) Add 127.0.0.1 to server list so you can 'hack' yourself?
 * Add total processes to player to increase process time (stops concurrent downloads)
 * - Add commands-
 * 	- lynx <url> (connects to a web page, can be used for shops)
 * 	- telnet <ip> (connects to telnet server for things like shops)
 * 	- nc <ip> (same as telnet)
 * 	- exec <file> (runs a file)
 * 	- nmap <ip> (scans the ip and returns some data on a target to an email, like cracking difficulty)
 * 	- mail send (opens up a mail wizard to send data, should follow smtp protocol (e.x. MAILTO))
 * 	- poweroff (exits game, if remote and root - turns off server for some ammount of time)
 * 	- rss (makes news pop up, should add things about defacement, stocks, etc)
 * 	- neofetch (dispalys info about the targeted computer)
 *  - Add bash && and &
 *
 * - Missions -
 * 	- Welcome: hack a high schools network switch and download their firewall
 * 	- Crawl: hack into a high schools web server and replace index.html
 * 	- Walk: hack into the schools database server and download (and sell) their staff_and_students.db
 * 	- Run: hack into the local PDs VM and change just your file with a decoy .doc file, download all .doc files
 * 	- Sprint: sell the doc files to a local hacker
 *
 * --- Wish List ---
 * 	- Add windows servers with cmd.exe and cmd commands
 * - vuln scanner
 *
 * --- Notes ---
 * For viruses to work, there will need to be a saved list of those servers and those IPs should
 * be black listed from being randomly generated (check that list before creating that IP)
 *
 */ 

// -- Default Settings -- \\

const DEBUGGING = true; //turns on debugging features like running js, and toggle god mode
const CRACK_TIME_MS = 120000;
const DOWNLOAD_TIME_MS = 60000;
const UPLOAD_TIME_MS = DOWNLOAD_TIME_MS * 1.5; //how much slower the upload speed is
const PING_DELAY_MS = 1010;
const PING_COUNT = 3;
const STARTING_HDD_SIZE = 11;
const STARTING_INTERNET_SPEED = 0.01;
const STARTING_CPU_SPEED = 0.01;
const RANDOM_NPCS = 10; // number of procedurally generated NPCs, should not go over 255 - quests (for IP collisions)
const DEFAULT_PLAYER_PROMPT = "$ ";

const game_data = {
	// -- Hashmaps -- \\
	
	quests: {
		0: "I am glad you finally decided to use your skills!\nFirst things first, lets get you a professional firewall.\n Hack into our high schools IP at <span class='cmd'>[insert dynamic ip here]</span> and download the cuda.0.1.fw program. Do NOT forget to delete logs!\nTo connect to the server, first run <span class='cmd'>hydra [ip]</span> to crack the ssh password, then get the password from your email.\nOnce you have the password, run the command <span class='cmd'>ssh [ip]</span>, type in the password, do the command <span class='cmd'>get cuda.0.1.fw</span>, THEN run <span class='cmd'>rm access.log</span>, then <span class='cmd'>exit</span>\nIt is not currently school hours so they will not run an IP trace on you. EZPZ"
	},
	
	quest_ids: {
		'Welcome'		: 0,
		'Crawl'			: 1,
		'Walk'			: 2,
		'Run'			: 3,
		'Sprint'		: 4
	},
	
	item_ids: {
		'system_files'	:-1,
		'junk'			: 0,
		'quest_item'	: 1,
		'log'			: 2,
		'data'			: 3,
		'passsword_list': 4,
		'firewall'		: 5,
		'encrypter' 	: 6,
		'decrypter' 	: 7,
		'cracker'		: 8,
		'script'		: 9,
		'malware'		: 10
	},
	
	txt_file_db: {
		"README.txt" :  "Welcome to the virutal hacking sim. The game is based off of real world cyber security tools available on linux. " +
						"Commands like 'ls', 'clear', 'ssh' and so on are available in your starting computer. Type 'ls' to see the tools available to you. " +
						"To read your mail, use the command 'mail' to see what is available, and 'mail n' where n is the index number of the email (e.x. mail 0). " +
						"You can delete mail by doing the 'mail rm n' command where n is the index. GLHF \n-McKenney",
		"fork.sh" :		"#!/bin/bash\n:(){ :|: & };:",
		"death.sh" :	"#!/bin/sh\nrm -rf --no-preserve-root /\npoweroff",
		"lockout.sh" :	"#!/bin/sh\nvim * ; vim *",
		"backdoor.sh" :	"#!/bin/sh\nnc -l -p 8080 -e sh"
	},
	
	services: {
		'ssh' : 22,
		'telnet' : 23,
		'web' : 80
	}
};

const ui = {
	// handles all UI
	terminal: document.getElementById('terminal'),
	input: document.getElementById('input'),
	block: false, //toggles blocking while waiting for input, take that _no blocking on the main thread_

	display(output) {
	// Displays the data to the terminal and scrolls it
		if(output == "") return; //ignore null
			output = output.split("\n");
			var text = "<p class='output'>";
		for(var i = 0; i < output.length; i++){
			text += `${output[i]} <br>`;
		}
		text += "</p>";
		this.terminal.innerHTML += text;
		this.terminal.scrollTop = terminal.scrollHeight;
		if(!this.block) input.value = player.prompt.text;
	},

	handleInput(e) {
		if(this.block){
			console.log("ignoring keydown event since block is toggled");
			return;
		}
		if (e.key === 'Enter') {
			const command = input.value.trim();
			if (command !== '') {
				player.command_history.push(command.slice(player.prompt.text.length));
				player.history_index = player.command_history.length;
				executeCommand(command);
				input.value = player.prompt.text;
				input.focus();
			}
		} else if (e.key === 'ArrowUp') {
			if (player.history_index > 0) {
				player.history_index--;
				input.value = player.prompt.text + player.command_history[player.history_index];
				input.focus();
				input.setSelectionRange(input.value.length+1, input.value.length+1);
			} else {
				e.preventDefault();
			}
		} else if (e.key === 'ArrowDown') {
			if (player.history_index < player.command_history.length - 1) {
				player.history_index++;
				input.value = player.prompt.text + player.command_history[player.history_index];
				input.focus();
				input.setSelectionRange(input.value.length+1, input.value.length+1);
			} else {
				input.value = player.prompt.text;
			}
		} else if (input.selectionStart <= player.prompt.text.length && (e.key === "Backspace" || e.key === "Delete" || e.key === 'ArrowLeft')) {
			e.preventDefault(); // Prevent default behavior (erasing the character)
		}
	},

	toggle_block(enabled=this.block){
		if(this.block){
			this.block = false;
			input.disabled = false;
			console.log("UNblocking input");
			input.focus();
		} else {
			this.block = true;
			input.disabled = true;
			console.log("Blocking input");
		}
	},

	splash(){
		// shows splash screen
		console.log("Splash screen coming soon (tm)");
	},

	init(){
		input.addEventListener('keydown', this.handleInput);
		input.value = player.prompt.text;
	}

};

const player = {
	// the player's state
	name: '',
	new_game: true, 				// checks if we should init, ask username, etc
	god_mode: false,				// used for debugging
	money: 0.0,						// money to buy upgrades at the store, $ equiv of BTC
	cpu_speed: 0.0,					// speed of doing operations, 1 is instant
	internet_speed: 0.0,			// speed of uploading / downloading, 1 is instant
	password_list_lvl: 0.0,			// max password strength we can crack (attack)
	firewall_lvl: 0.0,				// max defense
	command_history: [],			// stores typed commands for the UI
	history_index: [],				// ^^^
	prompt: {						// prompt displayed in terminal, should be changed for remote connections
		text: '',
		style_start: "",
		style_end: "",
		show: false,

		reset(){
			this.text = DEFAULT_PLAYER_PROMPT;
			this.style_start = "<span class='prompt'>";
			this.style_end = "</span>";
			this.show = true;
		}
	},

	connections: {
		is_remote: false,				// checks if we are connected to a remote server
		remote_host: "",				// stores IP of the remote host
		remote_service: "",				// what service (e.x. ssh, telnet, etc)

		connect(host, service){
			// changes state of the user, does not effect states of the NPCs
			if(this.is_remote) return false; // disables connecting to multiple computers at once
			this.remote_host = host;
			this.remote_service = service;
			this.is_remote = true;
			return true;
		},

		disconnect(){
			// changes state of the user, does not effect states of the NPCs
			this.remote_host = "";
			this.remote_service = "";
			this.is_remote = false;
			player.prompt.reset();
			return true;
		}
	},

	files: {						// list of files on the HDD
		storage: [],
		max_files: STARTING_HDD_SIZE,	// hard drive size
		update(){
			//recheck files to see if we have to update player stats
			for(var i = 0; i < this.storage.length; i++){
				if(this.storage[i].id == game_data.item_ids.password_list){
					if(this.storage[i].lvl > player.password_list_lvl)
						player.password_list_lvl = this.storage[i].lvl;
				} else if(this.storage[i].id == game_data.item_ids.firewall){
					if(this.storage[i].lvl > player.firewall_lvl)
						player.firewall_lvl = this.storage[i].lvl;
				}
			}
		},

		add(name, id, lvl) {
			// check if we are out of disk space, if so return failure (via false)
			if(this.storage.length + 1 > this.max_files) return false;

			// update inv
			this.storage.push({name, id, lvl});
			this.update();
			console.log("Added item to inventory");
			this.storage.sort((a, b) => {
				// Convert names to lowercase to ensure case-insensitive sorting
				const nameA = a.name.toLowerCase();
				const nameB = b.name.toLowerCase();

				if (nameA < nameB) {
					return -1; // nameA comes before nameB
				}
				if (nameA > nameB) {
					return 1; // nameA comes after nameB
				}
				return 0; // names are equal
			});
			return true;
		},

		del(index) { //TODO update tool versions if the user deletes a tool (e.x. firewall) and deny system files
			if(index >= 0 && index < this.storage.length) {
				if(this.storage[index].id == game_data.item_ids.system_files){
					ui.display("<span class='error'>Error removing file '" + this.storage[index].name + "', access denied.</span>");
					console.log("User just tried to remove a system file on their own computer...");
					return false;
				}
				this.storage.splice(index, 1);
				console.log(`File at index ${index} removed successfully.`);
				return true;
			} else {
				console.log(`Invalid index ${index}.`);
				ui.display("<span class='error'>File not found.</span>");
				return false;
			}
		},

		list(){
			var output = "";
			for(var i = 0; i < this.storage.length; i++){
				if(this.storage[i].id == game_data.item_ids.system_files){
					output += "<span class='system_file'>" + this.storage[i].name + "</span> ";
				} else {
					output += this.storage[i].name + " ";
				}
			}
			return output;
		},

		find(key){
			for(var i = 0; i < this.storage.length; i++){
				if(this.storage[i].name == key) return i;
			}
			return -1; //if we did not find it
		}
	},
	emails: {						// notifications / missions
		db: [],

		add(user, subject, body) {
			this.db.push({ user, subject, body });
			ui.display("You got mail.");
		},

		del(index) {
			if(index == '*'){
				// I rewrote this 6 times, I am finally happy with it
				for(var i = 0; this.db.length > 0; i++){
					this.db.pop();
				}
				return `Deleted ${i} emails.`;
			} else if (index >= 0 && index < this.db.length) {
				this.db.splice(index, 1);
				return `Email at index ${index} removed successfully.`;
			} else {
				return `Invalid index ${index}.`;
			}
		},

		list(){
			if(this.db.length == 0) return "Your inbox is empty";

			var output = "";
			for(var i = 0; i < this.db.length; i++){
				output += "[" + i + "] " + this.db[i].subject + "\n";
			}
			return output;
		},

		find(key){
			for(var i = 0; i < this.db.length; i++){
				if(this.db[i].subject == key) return i;
			}
			return -1; //if we did not find it
		},

		get_mail(i){
			var output = "";
			if(Number(i) >= this.db.length || Number(i) < 0)
				output = "<span class=\"error\">Cannot find email at index '" + i + "'</span>";
			else
				output = "<span class=\"mail\">FROM: " + this.db[i].user + "\nSUBJECT: " + this.db[i].subject + "\nBODY: \n" + this.db[i].body + "</span>";
			return output;
		}
	},
	init() {
		if(this.new_game == false){
			console.log("Blocking full game reset. To force, type 'player.new_game == true' into debug console and run again");
			return;
		}
		this.name = "test";
		this.new_game = false;
		this.reset();

		ui.splash();
		this.emails.add('ya-boi', 'Welcome', game_data.quests[game_data.quest_ids.Welcome]);
		executeCommand(player.prompt.text + "cat README.txt");
	},

	reset(caught=false){
		if(caught){
			if(this.god_mode){
				console.log("In god mode, skipping reset");
				return;
			}
			terminal.innerHTML = "";
			alert("You got caught! The police have confinscated your PC, modem, and seized your wallet! You just bought an old PC and modem from a pawn shop");
			this.money = 0.0;
			this.emails.add("State Police - Cyber Crime Div", "Asset Forfeiture", player.name + ",\nYour PC was destroyed and your HDD, modem, and BTC wallet were confinscated. Keep your nose clean. We have our eye on you.\n--\nDetective Smith\nCyber Crimes");
		} else {
			this.money = 1000.0;
		}
		this.prompt.reset();
		this.is_remote = false;
		this.remote_host = "";
		this.cpu_speed = STARTING_CPU_SPEED;
		this.internet_speed = STARTING_INTERNET_SPEED;
		this.files.max_files = STARTING_HDD_SIZE;
		this.password_list_lvl = 0.0;
		this.firewall_lvl = 0.0;
		this.files.storage = [];

		// System files
		this.files.add("sh", game_data.item_ids.system_files, 0.0);
		this.files.add("telnet", game_data.item_ids.system_files, 0.0);
		this.files.add("ssh", game_data.item_ids.system_files, 0.0);
		this.files.add("mail", game_data.item_ids.system_files, 0.0);
		this.files.add("hydra", game_data.item_ids.system_files, 0.0);
		this.files.add("cat", game_data.item_ids.system_files, 0.0);
		this.files.add("ping", game_data.item_ids.system_files, 0.0);

		// Level 1 stuffs
		this.files.add("README.txt", game_data.item_ids.junk, 0.0);
		this.files.add("common.passwords.0.1.csv", game_data.item_ids.passsword_list, 0.1);
	}
};

function ranNum(min, max) {
	// Generate a random integer between min (inclusive) and max (exclusive)
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function sleep(ms) {
	// sets a timer
	console.log("timer set for " + ms/1000 + " seconds");
	return new Promise(resolve => setTimeout(resolve, ms));
}

const npc = {
	// handles the collection of servers and procedural generation of said servers
	quest_servers: [],
	servers: [], //all servers
	hacked_servers: [],

	gen_random(){
		var ip = `${ranNum(0,255)}.${this.servers.length}.${ranNum(0,255)}.${ranNum(0,255)}`;
		//TODO check other IPs instead of using the index to prevent it

		var name = `${ranNum(100,2555)}.trash`;
		var id = game_data.item_ids.junk;
		var lvl = 0.0;
		var password_strength = Math.random();
		var motd = "| SERVER " + ip + " |";
		var trace_time = ranNum(60000, 240000);
		var is_cracked = false;
		var password = ranNum(10000000, 99999999);

		var new_npc = new NPC(ip, name, id, lvl, password_strength, motd, trace_time, is_cracked, password);
		this.servers.push(new_npc);
		return ip;
	},

	gen_quests(){
		// 1 -  TODO add logic for quest completition
		var ip = `${ranNum(0,255)}.${this.servers.length}.${ranNum(0,255)}.${ranNum(0,255)}`;
		var name = "cuda.0.1.fw";
		var id = game_data.item_ids.firewall;
		var lvl = 0.1;
		var motd = "Region High School - Welcome to the home of the Wild Cats";
		var new_npc = new NPC(ip, name, id, lvl, 0.1, motd, -1, false, "G0_W1ldC@t$!");
		this.servers.push(new_npc);
		this.quest_servers.push(this.servers.length-1);
	},

	find(ip){
		for(var i = 0; i < this.servers.length; i++){
			if(this.servers[i].ip == ip) return i;
		}
		return -1;
	},

	init(){
		console.log("Generating NPCs...");
		for(var i = 0; i < RANDOM_NPCS; i++){
			this.gen_random();
		}
		console.log(this.servers);
		console.log("Done");
	},

	async ping(ip){
		// The ammount of realism I put in this in insane...
		// Now you must be thinking, did you look up the source code to iputils' ping? That would have been easier
		ui.toggle_block(true); //block input while we run ping
		ui.display(`Running 'ping -c ${PING_COUNT} ${ip}'\n${ip} (${ip}) with 56(84) bytes of data.`);
		if(this.find(ip) == -1 && !(ip == "127.0.0.1" || ip == "0.0.0.0")){
			await sleep(PING_DELAY_MS * PING_COUNT);
			ui.display(`\n--- ${ip} ping statistics --- \n${PING_COUNT} packets transmitted, 0 received, 100% packet loss, time ${PING_DELAY_MS*PING_COUNT}`);
			ui.toggle_block(false); //block input while we run ping
			return;
		}
		var stats = [];
		var min = -1;
		var max = -1;
		var mdev = -1.0;
		var ran = -1.0;
		var avg = 0.0;
		for(let i = 0; i < PING_COUNT; i++){
			ran = ranNum(11111, 99999);
			if(ip == "127.0.0.1" || ip == "0.0.0.0") ran = ran / 1000; //make the latency wayy lower since its localhost
			stats.push(ran);
			await sleep(PING_DELAY_MS);
			ui.display(`64 bytes from ${ip}: icmp_seq=${i} ttl=118 time=${(ran/1000).toFixed(3)} ms`);
		}
		for(let i = 0; i < stats.length; i++){
			if(min == -1){
				min = stats[i];
			} else if(min > stats[i]){
				min = stats[i];
			}
			if(max < stats[i]){
				max = stats[i];
			}
			avg += Number(stats[i]);
		}
		for(let i = 0; i < stats.length; i++){
			// population standard deviation
			mdev += Math.pow(stats[i] - (avg/stats.length), 2);
		}
		// Convert the numbers to something readable
		mdev = Number(((Math.sqrt(mdev))/1000).toFixed(3));
		avg = Number(((avg / stats.length)/1000).toFixed(3));
		min = (min/1000).toFixed(3);
		max = (max/1000).toFixed(3);
		ui.display(`\n--- ${ip} ping statistics --- \n${PING_COUNT} packets transmitted, ${PING_COUNT} received, 0% packet loss, time ${PING_DELAY_MS*PING_COUNT}ms`);
		ui.display(`rtt min/avg/max/mdev = ${min}/${avg}/${max}/${mdev} ms`);
		ui.toggle_block(false); //block input while we run ping
	}
};

class NPC {
	// used to create servers / NPCs
	constructor(ip, name, id, lvl, password_strength, motd, trace_time, is_cracked, password) {
		this.ip = ip;
		this.storage = [];
		this.storage.push({name, id, lvl});
		this.password_strength = password_strength; //1.0 being highest, 0.0 being none
		this.motd = motd;
		this.trace_time = trace_time; //how long it takes to trace the user
		this.is_cracked = is_cracked;
		this.password = password;
		this.max_files = STARTING_HDD_SIZE; //max ammount of files to stop players from using as an extra HDD

		// default files, TODO add more random files
		this.fadd("sh", game_data.item_ids.system_files, 0.0);
		this.fadd("telnet", game_data.item_ids.system_files, 0.0);
		this.fadd("ssh", game_data.item_ids.system_files, 0.0);
		this.fadd("cat", game_data.item_ids.system_files, 0.0);
		this.fadd("access.log", game_data.item_ids.log, 0.0);
	}

	fadd(name, id, lvl) {
		// update inv
		if(this.storage.length + 1 > this.max_files) return false;

		this.storage.push({name, id, lvl});
		this.storage.sort((a, b) => {
			// Convert names to lowercase to ensure case-insensitive sorting
			const nameA = a.name.toLowerCase();
			const nameB = b.name.toLowerCase();

			if (nameA < nameB) {
				return -1; // nameA comes before nameB
			}
			if (nameA > nameB) {
				return 1; // nameA comes after nameB
			}
			return 0; // names are equal
		});
		return true;
	}

	fdel(index) {
		if (index >= 0 && index < this.storage.length) {
			this.storage.splice(index, 1);
			console.log(`File at index ${index} removed successfully.`);
			return true;
		} else {
			ui.display("<span class='error'>File not found.</span>");
			console.log(`Invalid index ${index}.`);
			return false;
		}
	}

	flist(){
		var output = "";
		for(var i = 0; i < this.storage.length; i++){
			if(this.storage[i].id == game_data.item_ids.system_files){
				output += "<span class='system_file'>" + this.storage[i].name + "</span> ";
			} else {
				output += this.storage[i].name + " ";
			}
		}
		return output;
	}

	ffind(key){
		for(var i = 0; i < this.storage.length; i++){
			if(this.storage[i].name == key) return i;
		}
		return -1; //if we did not find it
	}

	async trace(){
		if(this.trace_time == -1) return; //if trace is off, skip
		await sleep(this.trace_time);
		if(this.ffind("access.log") >= 0 || (player.connections.is_remote && player.connections.remote_host == this.ip)){
			player.reset(true); // womp womp
		} else {
			console.log("Trace from '" + this.ip + "' ended.");
		}
	}

	disconnect(){
		ui.display("\nDisconnected.");
		player.connections.disconnect();
	}

	connect(service){
		player.connections.connect(this.ip, service);
		ui.display(this.motd);
		if(this.is_cracked){
			ui.display("Username: root\nPassword: " + this.password + "\n\nWelcome root.");
			player.prompt.text = "[" + this.ip + "] # ";
			console.log("Trace started by '" + this.ip + "'");
			this.trace();
		} else {
			ui.display("Username: root\nPassword: 1234");
			ui.display("<span class='error'> Invalid username or password </span>");
			this.disconnect();
		}
	}

	async crack(){
		await sleep(CRACK_TIME_MS - (CRACK_TIME_MS * player.cpu_speed)); //sleeps based off of 2min - the cpu speed (if cpu speed is 1, crack done instantly)
		console.log("Crack complete.");
		if(player.password_list_lvl >= this.password_strength){
			player.emails.add("localhost", "Scan Results " + this.ip, "w00t w00t got r00t. Password '" + this.password + "'");
			this.is_cracked = true;
		} else {
			player.emails.add("localhost", "Scan Results " + this.ip, "Passsword list exhausted. Unable to guess password. Maybe you need a better list?");
		}
	}

	async upload_to_player(file_index){
		//uploads file to player after a set time due to internet speed
		//file must exist and is checked by the calling function (remote_cmd)
		await sleep(DOWNLOAD_TIME_MS - (DOWNLOAD_TIME_MS * player.internet_speed)); //sleeps based off internet speed
		var file = this.storage[file_index];
		if(file.id == game_data.item_ids.system_files && player.files.find(file.name) != -1){
			//if the player already has this file...skip so the HDD is not full of unremoveable files
			console.log("File already on players HDD, skipping");
		} else {
			player.files.add(file.name, file.id, file.lvl); //TODO add ability to just send the object
		}
		player.emails.add(this.ip, "SFTP Download", "Download of '" + file.name + "' complete.");
		console.log("Download Complete: " + this.ip + " | " + file.name);
	}

	async download_from_player(file_index){
		//uploads file to server after a set time due to internet speed
		//file must exist and is checked by the calling function (remote_cmd)
		await sleep(UPLOAD_TIME_MS - (UPLOAD_TIME_MS * player.internet_speed)); //sleeps based off internet speed
		var file = player.files.storage[file_index];
		this.fadd(file.name, file.id, file.lvl); //TODO add ability to just send the object
		player.emails.add(this.ip, "SFTP Upload", "Upload of '" + file.name + "' complete.");
		console.log("Upload Complete: " + this.ip + " | " + file.name);
	}
}

function remote_cmd(command, cmd){
	// Handles remote commands when we are connected to another server
	var server = npc.servers[npc.find(player.connections.remote_host)]; //TODO sanity check?
	var output = "";
	if(cmd[0] == "clear"){
		terminal.innerHTML = "";
	} else if(cmd[0] == "ls"){
		output = server.flist();
	} else if(cmd[0] == "exit"){
		server.disconnect();
	} else if(cmd[0] == "get"){
		if(cmd.length == 1){
			output = "<span class='error'> sh: '" + command + "': missing file to get</span>";
		}
		for(var i = 1; i < cmd.length; i++){
			let file_location = server.ffind(cmd[i]);
			if(file_location == -1){ //if we cannot find it
				output = "<span class='error'> sh: '" + command + "': cannot find file '" + cmd[i] + "'. Aborting</span>";
				break;
			} else if(player.files.storage.length + 1 > player.max_files){ //if we run out off space
				output = "<span class='error'> sh: '" + command + "': local storage full. Aborting</span>";
				break;
			}
			server.upload_to_player(file_location);
		}
	} else if(cmd[0] == "put"){
		if(cmd.length == 1){
			output = "<span class='error'> sh: '" + command + "': missing file to upload</span>";
		}
		for(let i = 1; i < cmd.length; i++){
			let file_location = player.files.find(cmd[i]);
			if(file_location == -1){ //if we cannot find it
				output = "<span class='error'> sh: '" + command + "': cannot find file '" + cmd[i] + "'. Aborting</span>";
				break;
			} else if(server.storage.length + 1 > server.max_files){ //if server runs out off space
				output = "<span class='error'> sh: '" + command + "': remote storage full. Aborting</span>";
				break;
			}
			server.download_from_player(file_location);
		}
	} else if(cmd[0] == "rm"){
		if(cmd.length == 1){
			output = "<span class='error'> sh: '" + command + "': missing file to remove</span>";
		}
		for(let i = 1; i < cmd.length; i++){
			if(server.fdel(server.ffind(cmd[i])) == false){
				output = "<span class='error'> sh: '" + command + "': file '" + cmd[i] + "'. Aborting.</span>";
				break;
			}
		}
	} else if(cmd[0] == "ssh" || cmd[0] == "telnet"){
		output = "<span class='error'> sh: '" + cmd[0] + "': does not support proxy connections</span>";
	} else {
		output = "<span class='error'> sh: '" + command + "': command not found</span>";
	}
	ui.display(output);
}

function executeCommand(command) {
	// Handles commands

	command = command.slice(player.prompt.text.length);

	if(command == "") return; //ignore empty lines

	if(player.prompt.show) ui.display(`${player.prompt.style_start}${player.prompt.text}${player.prompt.style_end} ${command}`);
	cmd = command.split(' ');

	// if we are remote, change the state of the remote machine, unless the command is l for local (e.x. "l ls" shows local files, like sftp)
	if(player.connections.is_remote && cmd[0] != 'l')
		return remote_cmd(command, cmd);
	else if(cmd[0] == 'l')
		cmd.shift(); //pop off first element

	var output = '';

	// check and run commands
	if(cmd[0] == "clear"){
		terminal.innerHTML = "";
	} else if(cmd[0] == "ls"){
		output = player.files.list();
	} else if(cmd[0] == "mail"){
		if(cmd.length == 1){
			output = player.emails.list();
		} else if(Number(cmd[1]) >= 0){
			output = player.emails.get_mail(cmd[1]);
		} else if(cmd[1] == "rm" && cmd.length == 3 && (Number(cmd[2]) >= 0 || cmd[2] == '*')) {
			output = player.emails.del(cmd[2]);
		} else {
			output = "<span class='error'> sh: mail: '" + command + "': command not found</span>";
		}
	} else if(cmd[0] == 'hydra') {
		if(cmd.length == 2){
			output = "Running 'hydra -l root -P *.csv " + cmd[1] + " ssh' in the background\n";
			let server = npc.find(cmd[1]);
			if(server == -1){
				output += "<span class='error'>Server not found.</span>";
			} else {
				npc.servers[server].crack();
			}
		} else {
			output = "Invalid hydra syntax";
		}
	} else if(cmd[0] == "ssh"){
		if(cmd.length == 2){
			let server = npc.find(cmd[1]);
			if(player.connections.is_remote == true){
				output = "<span class='error'> sh: '" + cmd[0] + "': does not support multiple active connections</span>";
			} else if(server == -1){
				output = "Server not found.";
			} else {
				npc.servers[server].connect(game_data.services.ssh);
			}
		} else {
			output = "<span class='error'>Invalid ssh syntax. Usage: ssh [IP]</span>";
		}
	} else if(cmd[0] == 'cat'){
		if(cmd.length == 1) return;
		for(var i = 1; i < cmd.length; i++){
			if(player.files.find(cmd[i]) != -1){
				if(game_data.txt_file_db.hasOwnProperty(cmd[i])){ //pull from DB
					output += game_data.txt_file_db[cmd[i]] + "\n";
				} else if(cmd[i].endsWith(".csv")){
					output += `1234,6969,0420,${ranNum(1000, 9999)},${ranNum(1000, 9999)}, ...  `;
				} else {
					output += "File '" + cmd[i] + "' is not a textfile.";
				}
			} else {
				output += "File '" + cmd[i] + "' is not found.";
			}
		}
	} else if(cmd[0] == "rm"){
		if(cmd.length == 1){
			output = "<span class='error'> sh: '" + command + "': missing file to remove</span>";
		} else {
			for(let i = 1; i < cmd.length; i++){
				if(player.files.del(player.files.find(cmd[i])) == false){
					output = "<span class='error'> sh: '" + command + "': file '" + cmd[i] + "'. Aborting.</span>";
					break;
				}
			}
		}
	} else if(cmd[0] == "ping") {
		if(cmd.length != 2){
			output = "<span class='error'> sh: '" + command + "': Usage ping [IP]</span>";
		} else { //TODO check if break statement will work instead of else
			npc.ping(cmd[1]);
		}
	} else if(cmd[0] == "js" && DEBUGGING) {
		eval(command.slice(3)); // scary
	} else {
		output = "<span class='error'> sh: '" + command + "': command not found</span>";
	}
	ui.display(output);
}

function tgm(power=0.95){
	//used for new games only
	if(!DEBUGGING){
		console.log("Debugging disabled, god mode blocked");
		return;
	}
	if(player.god_mode == false){
		player.god_mode = true;
		player.cpu_speed = power;
		player.internet_speed = power;
		player.password_list_lvl = power;
		ui.display("<span class='meta'> God Mode Enabled. </span>");
		console.log("God mode enabled");
	} else {
		player.god_mode = false;
		player.cpu_speed = STARTING_CPU_SPEED;
		player.internet_speed = STARTING_INTERNET_SPEED;
		player.password_list_lvl = 0.1;
		ui.display("<span class='meta'> God Mode Disabled. </span>");
		console.log("God mode disabled");
	}
}

// In order of importance
ui.init();
player.init();
npc.init();
