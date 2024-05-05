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
/* jshint -W061 */ /* <-- ignores the eval() call in debugging mode */

/*
 * --- TODO ---
 * Add a random chance that an NPC has a useful hacking tool (e.x. password list)
 * Add a quest class, maybe randomly generate side quests for $$$
 * Change display to take a message type, e.x. display(output, ui.ids.error); make an ui.ids to make life easier
 * Add logic to complete quests
 * Add a way for a captive UI that waits for a command to finish, or allows specific interactions
 *    (look at keydown events and switch the handlers)
 * Sanatize user input (remove html tags)
 * Add save game feature via local storage and JSON interpreter for the player object
 * Add proxies that slow down tracing by an order of magnitude
 * Add way to interact with a hardware, software, and leaks shop
 * Add spam, bitcoin miners, bots, and so on for passive income, with antivirus to remove viruses
 * (maybe) Add 127.0.0.1 to server list so you can 'hack' yourself?
 * Add total processes to player to increase process time (stops concurrent downloads)
 * Move players prompt to the UI, make display(prompt=ui.prompt, data)
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
 * 	- vuln scanner
 *
 * --- Notes ---
 * For viruses to work, there will need to be a saved list of those servers and those IPs should
 *
 */ 

const game = {
	// -- Default Settings --
	defaults : {
		DEBUGGING : true, //turns on debugging features like running js, and toggle god mode
		CRACK_TIME_MS : 120000, //longest time it takes to brute force into a server
		DOWNLOAD_TIME_MS : 60000, //longest time it takes to download a file
		UPLOAD_TIME_MS : this.DOWNLOAD_TIME_MS * 1.5, //longest time it takes to upload a file to a server, should be slower than download
		PING_DELAY_MS : 1010, //how long to wait before sending another ping packet
		PING_COUNT : 3, //how many ping packets we send
		STARTING_HDD_SIZE : 11, //default hardrive size for players and npcs
		STARTING_INTERNET_SPEED : 0.01, //1.0 is fastest for network tasks (like up/downloads)
		STARTING_CPU_SPEED : 0.01, //1.0 is fastest for cpu tasks (like cracking)
		STARTING_MONEY : 1000, //money to buy things from shops, it is the USD equivelent to what the player has in BTC
		RANDOM_NPCS : 10, //how many NPCs that are randomly generated
		DEFAULT_PLAYER_PROMPT : "$ ", //What is displayed infront of what the player types
	},
	
	// -- Classes --
	Files: class {
		constructor(){
			this.storage = [];
			this.max_files = game.defaults.STARTING_HDD_SIZE;
		}
		
		find(name){
			for(let i = 0; i < this.storage.length; i++){
					if(this.storage[i].name == name) return i;
				}
				return -1; //if we did not find it
		}
		
		add(item){
			if(this.storage.length + 1 > this.max_files) {
				console.log("Storage full, cannot add ", item);
				return false;
			}
			var name = item.name;
			var end = '';
			for(let i = 1; this.find(name + end) != -1; end = '.' + i++){
				// Appends a number to the end of a file so you do not have more than one with the same name
			}
			if(end != '') item.name = name + end;
			this.storage.push(item);
			this.sort(); //TODO consider removing this call and making the constructors call if after for more speed
			return true;
		}
		
		del(name){
			var index = this.find(name);
			if(index != -1 && this.storage[index].id != game.data.item_ids.system_files){
				//if the item is found
				this.storage.splice(index, 1);
				console.log(`File at index ${index} removed successfully.`);
				this.sort();
				return true;
			}
			console.log(`Unable to delete '${name}'`);
			return false;
		}
		
		sort(){
			this.storage.sort((a, b) => a.name.localeCompare(b.name));
		}
		
		list(){ //TODO consider adding custom spans to this func
			var data = [];
			for(let i = 0; i < this.storage.length; i++){
				data.push(this.storage[i].name);
			}
			return data;
		}
	},
	Prompt: class {
		constructor(style_start, text, style_end, show){
			this.style_start = style_start;
			this.text = text;
			this.style_end = style_end;
			this.show = show;
			this.default_style_start = style_start;
			this.default_style_end = style_end;
			this.default_text = text;
		}
		display(){
			if(!this.show) return '';
			
			return this.style_start + this.text + this.style_end;
		}
		change(text, start='', end=''){
			this.text = text;
			if(start)
				this.style_start = start;
			if(end)
				this.style_end = end;
		}
		reset(){
			this.style_start = this.default_style_start;
			this.text = this.default_text;
			this.style_end = this.default_style_end;
		}
	},
	Computer: class {
		constructor(ip, items, password, password_strength, motd, prompt_text, prompt_start, prompt_end, prompt_show){
			this.ip = ip;
			
			// Add files
			this.files = new game.Files();
			// Add Default files
			this.files.add({name: "sh", id: game.data.item_ids.system_files, lvl: 0.0});
			this.files.add({name: "telnet", id: game.data.item_ids.system_files, lvl: 0.0});
			this.files.add({name: "ssh", id: game.data.item_ids.system_files, lvl: 0.0});
			this.files.add({name: "cat", id: game.data.item_ids.system_files, lvl: 0.0});
			for(let i = 0; i < items.length; i++){
				this.files.add(items[i]);
			}
			
			this.password = password;
			this.password_strength = password_strength;
			this.motd = motd;
			//this.prompt = new game.Prompt(prompt_start, prompt_text, prompt_end, prompt_show); //FIXME prompt start and end screws up all of the ui
			this.prompt = new game.Prompt("", prompt_text, "", prompt_show);
		}
	},
	Stats: class {
		//Handles progression and hardware
		constructor(money, cpu_speed, internet_speed){
			this.money = money;
			this.cpu_speed = cpu_speed;
			this.internet_speed = internet_speed;
			this.password_list_lvl = 0.0; // Defaults to none, use update() to change it after init
			this.firewall_lvl = 0.0; //     ^^^
		}
		
		update(items){
			for(var i = 0; i < items.length; i++){
				if(items[i].id == game.data.item_ids.password_list){
					if(items[i].lvl > this.password_list_lvl)
						this.password_list_lvl = items[i].lvl;
				} else if(items[i].id == game.data.item_ids.firewall){
					if(items[i].lvl > this.firewall_lvl)
						this.firewall_lvl = items[i].lvl;
				}
			}
		}
	},
	Mail: class {
		constructor(){
			this.db = [];
		}
		add(user, subject, body) {
			this.db.push({ user, subject, body });
			game.ui.display("You got mail.");
		}

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
		}

		list(){
			if(this.db.length == 0) return "Your inbox is empty";

			var output = "";
			for(var i = 0; i < this.db.length; i++){
				output += "[" + i + "] " + this.db[i].subject + "\n";
			}
			return output;
		}

		find(key){
			for(var i = 0; i < this.db.length; i++){
				if(this.db[i].subject == key) return i;
			}
			return -1; //if we did not find it
		}

		get_mail(i){
			var output = "";
			if(Number(i) >= this.db.length || Number(i) < 0)
				output = "<span class=\"error\">Cannot find email at index '" + i + "'</span>"; //TODO error / msg object
			else
				output = "<span class=\"mail\">FROM: " + this.db[i].user + "\nSUBJECT: " + this.db[i].subject + "\nBODY: \n" + this.db[i].body + "</span>";
			return output;
		}
	},
	NPC: class {
		// used to create servers / NPCs
		constructor(ip, items, password_strength, motd, trace_time, is_cracked, password, prompt_text) {
			this.computer = new game.Computer(ip, items, password, password_strength, motd, prompt_text);
			this.trace_time = trace_time;
			this.is_cracked = is_cracked;
			this.computer.files.add({name: "access.log", id: game.data.item_ids.log, lvl: 0.0});
		}
	
		async trace(){
			if(this.trace_time == -1) return; //if trace is off, skip
			await game.sleep(this.trace_time);
			if(this.computer.files.find("access.log") >= 0 || (game.player.remote.connected && game.player.remote.host == this.computer.ip)){
				game.new_game(); // womp womp
			} else {
				console.log("Trace from '" + this.computer.ip + "' ended.");
			}
		}
	
		disconnect(){
			game.ui.display("\nDisconnected.");
			game.player.remote.disconnect();
		}
	
		connect(service){
			game.player.remote.connect(this.computer.ip, service);
			game.ui.display(this.computer.motd);
			if(this.is_cracked){
				game.ui.display("Username: root\nPassword: " + this.computer.password + "\n\nWelcome root.");
				game.player.computer.prompt.text = "[" + this.computer.ip + "] # "; //TODO change this
				console.log("Trace started by '" + this.computer.ip + "'");
				this.trace();
			} else {
				game.ui.display("Username: root\nPassword: 1234");
				game.ui.display("<span class='error'> Invalid username or password </span>");
				this.disconnect();
			}
		}
	
		async crack(){
			await game.sleep(game.defaults.CRACK_TIME_MS - (game.defaults.CRACK_TIME_MS * game.player.stats.cpu_speed)); //sleeps based off of 2min - the cpu speed (if cpu speed is 1, crack done instantly)
			console.log("Crack complete.");
			if(game.player.stats.password_list_lvl >= this.computer.password_strength){
				game.player.mail.add("localhost", "Scan Results " + this.computer.ip, "w00t w00t got r00t. Password '" + this.computer.password + "'");
				this.is_cracked = true;
			} else {
				game.player.mail.add("localhost", "Scan Results " + this.computer.ip, "Passsword list exhausted. Unable to guess password. Maybe you need a better list?");
			}
		}
	
		async upload_to_player(file_index){
			//uploads file to player after a set time due to internet speed
			//file must exist and is checked by the calling function (remote_cmd)
			await game.sleep(game.defaults.DOWNLOAD_TIME_MS - (game.defaults.DOWNLOAD_TIME_MS * game.player.stats.internet_speed)); //sleeps based off internet speed
			var file = this.computer.files.storage[file_index];
			if(file.id == game.data.item_ids.system_files && game.player.computer.files.find(file.name) != -1){
				//if the player already has this file...skip so the HDD is not full of unremoveable files
				console.log("System file already on players HDD, skipping");
			} else {
				game.player.computer.files.add({name: file.name, id: file.id, lvl: file.lvl});
			}
			game.player.mail.add(this.computer.ip, "SFTP Download", "Download of '" + file.name + "' complete.");
			console.log("Download Complete: " + this.computer.ip + " | " + file.name);
		}
	
		async download_from_player(file_index){
			//uploads file to server after a set time due to internet speed
			//file must exist and is checked by the calling function (remote_cmd)
			await game.sleep(game.defaults.UPLOAD_TIME_MS - (game.defaults.UPLOAD_TIME_MS * game.player.stats.internet_speed)); //sleeps based off internet speed
			var file = game.player.computer.files.storage[file_index];
			this.computer.files.add({name: file.name,id: file.id, lvl: file.lvl});
			game.player.mail.add(this.computer.ip, "SFTP Upload", "Upload of '" + file.name + "' complete.");
			console.log("Upload Complete: " + this.computer.ip + " | " + file.name);
		}
	},
	Player: class {
		constructor(name){
			this.name = name;
			const items = [{name: "ping", id: game.data.item_ids.system_files, lvl: 0.0}, {name: "hydra", id: game.data.item_ids.system_files, lvl: 0.0}, 
				{name: "mail", id: game.data.item_ids.system_files, lvl: 0.0}, {name: "README.txt", id: game.data.item_ids.junk, lvl: 0.0}, 
				{name: "common.passwords.0.1.csv", id: game.data.item_ids.password_list, lvl: 0.1}];
			this.computer = new game.Computer("127.0.0.1", items, "1337_H@x3r_42069", 0.9, name + "'s PC", game.defaults.DEFAULT_PLAYER_PROMPT, "<span class='prompt'>", "</span>", true);
			this.stats = new game.Stats(game.defaults.STARTING_MONEY, game.defaults.STARTING_CPU_SPEED, game.defaults.STARTING_INTERNET_SPEED);
			this.stats.update(this.computer.files.storage); //Updates stats with the new files
			this.mail = new game.Mail();
			
			this.command_history = [];
			this.history_index = 0; //TODO check if needs to be a number
			this.quest = 0; //what quest we are on
			
			this.remote = {
			// Remote connections
				connected: false,
				host: "", //TODO add support for multiple connections and services
				service: "",
				connect(host, service){
					if(this.connected) return false; // disables connecting to multiple computers at once
					this.host = host;
					this.service = service;
					this.connected = true;
					return true;
				},
		
				disconnect(host) {
					//currently disconnects from everything
					this.host = "";
					this.service = "";
					this.connected = false;
					game.player.computer.prompt.reset();
					return true; //TODO check if we are already connected, if so disconnect, else return false
				}
			};
			
			this.god = false; // used for debugging
		}
		
		executeCommand(command) {
			// Handles commands
		
			command = command.slice(this.computer.prompt.text.length);
		
			if(command == "") return; //ignore empty lines
		
			if(this.computer.prompt.show) game.ui.display(`${game.player.computer.prompt.style_start}${game.player.computer.prompt.text}${game.player.computer.prompt.style_end} ${command}`);
			let cmd = command.split(' ');
		
			// if we are remote, change the state of the remote machine, unless the command is l for local (e.x. "l ls" shows local files, like sftp)
			if(this.remote.connected && cmd[0] != 'l')
				return game.npcs.remote_cmd(command, cmd);
			else if(cmd[0] == 'l')
				cmd.shift(); //pop off first element
		
			var output = '';
		
			// check and run commands
			if(cmd[0] == "clear"){
				game.ui.clear_terminal();
			} else if(cmd[0] == "ls"){
				output = this.computer.files.list().join(" ");
			} else if(cmd[0] == "mail"){
				if(cmd.length == 1){
					output = this.mail.list();
				} else if(Number(cmd[1]) >= 0){
					output = this.mail.get_mail(cmd[1]);
				} else if(cmd[1] == "rm" && cmd.length == 3 && (Number(cmd[2]) >= 0 || cmd[2] == '*')) {
					output = this.mail.del(cmd[2]);
				} else {
					output = "<span class='error'> sh: mail: '" + command + "': command not found</span>";
				}
			} else if(cmd[0] == 'hydra') {
				if(cmd.length == 2){
					output = "Running 'hydra -l root -P *.csv " + cmd[1] + " ssh' in the background\n";
					let server = game.npcs.find_ip(cmd[1]); //TODO check for localhost
					if(server == -1){
						output += "<span class='error'>Server not found.</span>";
					} else {
						game.npcs.servers[server].crack();
					}
				} else {
					output = "Invalid hydra syntax";
				}
			} else if(cmd[0] == "ssh"){
				if(cmd.length == 2){
					let server = game.npcs.find_ip(cmd[1]);
					if(this.remote.connected){
						output = "<span class='error'> sh: '" + cmd[0] + "': does not support multiple active connections</span>";
					} else if(server == -1){
						output = "Server not found.";
					} else {
						game.npcs.servers[server].connect(game.data.services.ssh);
					}
				} else {
					output = "<span class='error'>Invalid ssh syntax. Usage: ssh [IP]</span>";
				}
			} else if(cmd[0] == 'cat'){
				if(cmd.length == 1) return;
				for(var i = 1; i < cmd.length; i++){
					if(this.computer.files.find(cmd[i]) != -1){
						if(game.data.txt_file_db.hasOwnProperty(cmd[i])){ //pull from DB
							output += game.data.txt_file_db[cmd[i]] + "\n";
						} else if(cmd[i].endsWith(".csv")){
							output += `1234,6969,0420,${game.random.number(1000, 9999)},${game.random.number(1000, 9999)},${game.random.letters(4)}, ...  `;
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
						if(this.computer.files.del(cmd[i]) == false){
							output = "<span class='error'> sh: '" + command + "': file '" + cmd[i] + "'. Aborting.</span>";
							break;
						}
					}
				}
			} else if(cmd[0] == "ping") {
				if(cmd.length != 2){
					output = "<span class='error'> sh: '" + command + "': Usage ping [IP]</span>";
				} else { //TODO check if break statement will work instead of else
					game.npcs.ping(cmd[1]);
				}
			} else if(cmd[0] == "js" && game.defaults.DEBUGGING) {
				eval(command.slice(3)); // scary
			} else {
				output = "<span class='error'> sh: '" + command + "': command not found</span>";
			}
			game.ui.display(output);
		}
	},

	// -- Objects --
	ui : {
		// handles all UI
		terminal: document.getElementById('terminal'),
		terminal_container: document.getElementById('terminal-container'),
		input: document.getElementById('input'),
		block: false, //toggles blocking while waiting for input, take that _no blocking on the main thread_
	
		display(output) {
		// Displays the data to the terminal and scrolls it
			console.log(output);
			if(output == "") return; //ignore null
				output = output.split("\n");
				var text = "<p class='output'>";
			for(var i = 0; i < output.length; i++){
				text += `${output[i]}<br>`;
			}
			text += "</p>";
			this.terminal.innerHTML += text;
			if(!this.block) input.value = game.player.computer.prompt.display();
			this.terminal_container.scrollTop = this.terminal_container.scrollHeight; //scroll to bottom on output
		},
	
		handleInput(e) {
			if(this.block){
				console.log("ignoring keydown event since block is toggled");
				return;
			}
			if (e.key === 'Enter') {
				const command = input.value.trim();
				if (command !== '') {
					game.player.command_history.push(command.slice(game.player.computer.prompt.display().length));
					game.player.history_index = game.player.command_history.length;
					game.player.executeCommand(command);
					input.value = game.player.computer.prompt.display();
					input.focus();
				}
			} else if (e.key === 'ArrowUp') {
				if (game.player.history_index > 0) {
					game.player.history_index--;
					input.value = game.player.computer.prompt.display() + game.player.command_history[game.player.history_index];
					input.focus();
					input.setSelectionRange(input.value.length+1, input.value.length+1);
				} else {
					e.preventDefault();
				}
			} else if (e.key === 'ArrowDown') {
				if (game.player.history_index < game.player.command_history.length - 1) {
					game.player.history_index++;
					input.value = game.player.computer.prompt.display() + game.player.command_history[game.player.history_index];
					input.focus();
					input.setSelectionRange(input.value.length+1, input.value.length+1);
				} else {
					input.value = game.player.computer.prompt.display();
				}
			} else if (input.selectionStart <= game.player.computer.prompt.display().length && (e.key === "Backspace" || e.key === "Delete" || e.key === 'ArrowLeft')) {
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
			this.input.addEventListener('keydown', this.handleInput);
			this.input.value = game.player.computer.prompt.text;
		},
		
		clear_terminal(){
			this.terminal.innerHTML = "";
		}
	
	},
	data : {
		// -- Hashmaps -- \\
		
		quests: {
			0: "I am glad you finally decided to use your skills!\nFirst things first, lets get you a professional firewall. Hack into our high school's router and download the cuda.0.1.fw program. Do NOT forget to delete logs! To connect to the server, first run <span class='cmd'>hydra [ip]</span> to crack the ssh password, then get the password from your email. Once you have the password, run the command <span class='cmd'>ssh [ip]</span>, type in the password, do the command <span class='cmd'>get cuda.0.1.fw</span>, THEN run <span class='cmd'>rm access.log</span>, then <span class='cmd'>exit</span>\nIt is not currently school hours so they will not run an IP trace on you. EZPZ"
		},
		
		quest_ids: {
			'Welcome'		: 0,
			'Crawl'			: 1,
			'Walk'			: 2,
			'Run'				: 3,
			'Sprint'		: 4
		},
		
		item_ids: {
			'system_files'	:-1,
			'junk'					: 0,
			'quest_item'		: 1,
			'log'						: 2,
			'data'					: 3,
			'passsword_list': 4,
			'firewall'			: 5,
			'encrypter' 		: 6,
			'decrypter' 		: 7,
			'cracker'				: 8,
			'script'				: 9,
			'malware'				: 10
		},
		
		txt_file_db: {
			//Readable text files go here, aka you can use 'cat' on them
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
		},
	},
	npcs : {
		servers: [],
		reserved_ips: ["127.0.0.1", "0.0.0.0", ""],
		find_ip(ip){
			for(let i = 0; i < this.servers.length; i++){
				if(this.servers[i].computer.ip == ip) return i;
			}
			for(let i = 0; i < this.reserved_ips.length; i++){ //TODO revisit this addition
				if(this.reserved_ips[i] == ip) return i;
			}
			return -1;
		},
		generate_ip(){
			// Returns a valid, unused, ipv4 address. Can technically hang when all IP ranges are full
			var ip = `${game.random.number(0,255)}.${game.random.number(0,255)}.${game.random.number(0,255)}.${game.random.number(0,255)}`;
			while(this.find_ip(ip) != -1)
				ip = `${game.random.number(0,255)}.${game.random.number(0,255)}.${game.random.number(0,255)}.${game.random.number(0,255)}`;
			return ip;
		},
		async ping(ip){
			// The ammount of realism I put in this in insane...
			// Now you must be thinking, did you look up the source code to iputils' ping? That would have been easier
			game.ui.toggle_block(true); //block input while we run ping
			game.ui.display(`Running 'ping -c ${game.defaults.PING_COUNT} ${ip}'\n${ip} (${ip}) with 56(84) bytes of data.`);
			if(this.find_ip(ip) == -1){
				//If we cannot find the ip
				await game.sleep(game.defaults.PING_DELAY_MS * game.defaults.PING_COUNT);
				game.ui.display(`\n--- ${ip} ping statistics --- \n${game.defaults.PING_COUNT} packets transmitted, 0 received, 100% packet loss, time ${game.defaults.PING_DELAY_MS*game.defaults.PING_COUNT}`);
				game.ui.toggle_block(false); //block input while we run ping
				return;
			}
			var stats = [];
			var min = -1;
			var max = -1;
			var mdev = -1.0;
			var ran = -1.0;
			var avg = 0.0;
			for(let i = 0; i < game.defaults.PING_COUNT; i++){
				ran = game.random.number(11111, 99999);
				if(ip == "127.0.0.1" || ip == "0.0.0.0") ran = ran / 1000; //make the latency wayy lower since its localhost
				stats.push(ran);
				await game.sleep(game.defaults.PING_DELAY_MS);
				game.ui.display(`64 bytes from ${ip}: icmp_seq=${i} ttl=118 time=${(ran/1000).toFixed(3)} ms`);
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
			game.ui.display(`\n--- ${ip} ping statistics --- \n${game.defaults.PING_COUNT} packets transmitted, ${game.defaults.PING_COUNT} received, 0% packet loss, time ${game.defaults.PING_DELAY_MS*game.defaults.PING_COUNT}ms`);
			game.ui.display(`rtt min/avg/max/mdev = ${min}/${avg}/${max}/${mdev} ms`);
			game.ui.toggle_block(false); //block input while we run ping
		},
		generate(n){
			console.log(`Generating ${n} NPCs`);
			for(let i = 0; i < n; i++){
				let ip = this.generate_ip();
				
				items = [];
				let ammount = game.random.number(1, 4);
				for(let i = 0; i < ammount; i++){
					//Generates a random ammount of junk files
					items.push({name: `${game.random.number(100,2555)}${game.random.file_ext()}`, id: game.data.item_ids.junk, lvl: 0.0});
					items.push({name: `${game.random.letters(5)}${game.random.file_ext()}`, id: game.data.item_ids.junk, lvl: 0.0});
				}
				let password_strength = game.random.decimal();
				let motd = "| SERVER " + ip + " |";
				let trace_time = game.random.number(60000, 240000);
				let is_cracked = false;
				let password = `${game.random.number(10000000, 99999999)}${game.random.letters(5)}`;
		
				let new_npc = new game.NPC(ip, items, password_strength, motd, trace_time, is_cracked, password, "# ");
				this.servers.push(new_npc);
			}
			console.log(this.servers);
		},
		remote_cmd(command, cmd){
			// Handles remote commands when the player is connected to another server
			var server = this.servers[this.find_ip(game.player.remote.host)]; //assumes IP is not local, or else some weird bugs will prolly happen
			var output = "";
			if(cmd[0] == "clear"){
				game.ui.clear_terminal();
			} else if(cmd[0] == "ls"){
				output = server.computer.files.list().join(" ");
			} else if(cmd[0] == "exit"){ //TODO remove this and handle it in the regular command execution so npcs do not run player methods
				game.player.remote.disconnect();
			} else if(cmd[0] == "get"){
				if(cmd.length == 1){
					output = "<span class='error'> sh: '" + command + "': missing file to get</span>";
				}
				for(var i = 1; i < cmd.length; i++){
					let file_location = server.computer.files.find(cmd[i]);
					if(file_location == -1){ //if we cannot find it
						output = "<span class='error'> sh: '" + command + "': cannot find file '" + cmd[i] + "'. Aborting</span>";
						break;
					} else if(game.player.computer.files.storage.length + 1 > game.player.computer.files.max_files){ //if we run out off space
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
					let file_location = game.player.computer.files.find(cmd[i]);
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
					if(server.computer.files.del(cmd[i]) == false){
						output = "<span class='error'> sh: '" + command + "': file '" + cmd[i] + "'. Aborting.</span>";
						break;
					}
				}
			} else if(cmd[0] == "ssh" || cmd[0] == "telnet"){
				output = "<span class='error'> sh: '" + cmd[0] + "': does not support proxy connections</span>";
			} else {
				output = "<span class='error'> sh: '" + command + "': command not found</span>";
			}
			game.ui.display(output);
		}
	},
	random : {
		letter_list: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
		file_ext_list: ['.bat', '.exe', '.out', '.pdf', '.doc', '.zip', '.rar', '.png', '.jpg', '.gif', '.xml', '.html', '.css', '.js', '.ppt', '.xls', '.ini', '.cfg', '.7z', '.sql', '.md', '.php', '.java', '.cpp', '.hpp', '.dll', '.lib', '.obj', '.pdb', '.mp3', '.wav', '.mp4', '.avi', '.mov', '.mkv', '.wma', '.ogg', '.flv', '.swf', '.iso', '.img', '.vhd', '.vmx', '.ova', '.ovf'],

		number(min, max) {
		// Generate a random integer between min (inclusive) and max (exclusive)
	    min = Math.ceil(min);
	    max = Math.floor(max);
	    return Math.floor(Math.random() * (max - min)) + min;
		},
		letters(n){
			let output = '';
			for(let i = 0; i < n; i++){
				output += this.letter_list[this.number(0, this.letter_list.length-1)];
			}
			return output;
		},
		file_ext(){
			return this.file_ext_list[this.number(0, this.file_ext_list.length-1)];
		},
		decimal(){
			return Math.random();
		}
	},

	// -- Methods --
	sleep(ms){
		// sets a timer
		console.log("timer set for " + ms/1000 + " seconds");
		return new Promise(resolve => setTimeout(resolve, ms));
	},
	load_save(){
		//checks local storage for a saved game, if so, loads it and returns true, else, false
		return false;
	},
	new_game(){
		//check if we have a saved game, if not
		//init game
		
		if(this.initalized){
			//show death message
			//delete saved game
			//reset the game
			if(this.player.god){
				console.log("Ignoring reset in god mode");
				return;
			}
			console.log("You got traced. You lose.");
			alert("--- Asset Forfeiture ---\nYour PC was destroyed and your HDD, modem, and BTC wallet were confinscated. Keep your nose clean. We have our eye on you.\n--\nState Police\nCyber Crimes");
			location.reload(true); //HACK replace this with something cleaner
			return;
		}
		
		// Create the player
		this.player = new this.Player("Anonymous");
		
		// Generate the UI
		this.ui.init();
		this.ui.splash();
		
		// Generate NPCs
		this.npcs.generate(this.defaults.RANDOM_NPCS);
		
		// Generate Quests
		//TODO
		
		// Start the first quest
		this.run_quest(this.player.quest);
		
		// Show that we are initalized
		this.initalized = true;
		
	},
	run_quest(id){
		//handles quests
		switch(id){
			case 0:
				// 1 -  TODO add logic for quest completition
				var ip = this.npcs.generate_ip();
				var items = [{name: "cuda.0.1.fw", id: this.data.item_ids.firewall, lvl: 0.1}, {name: "todo.doc", id: this.data.item_ids.junk, lvl: 0.0}];
				var motd = "Region High School - Welcome to the home of the Wild Cats";
				let new_npc = new this.NPC(ip, items, 0.1, motd, -1, false, "G0_W1ldC@t$!");
				this.npcs.servers.push(new_npc);
				this.player.mail.add('ya-boi', 'Welcome', this.data.quests[this.data.quest_ids.Welcome] + "\nP.S. Here is the ip: " + ip);
				this.player.executeCommand(this.player.computer.prompt.text + "cat README.txt");
				break;
		}
	},
	tgm(power=0.95){
		//used for new games only
		if(!this.defaults.DEBUGGING){
			console.log("Debugging disabled, god mode blocked");
			return;
		}
		if(this.player.god == false){
			this.player.god = true;
			this.player.stats.cpu_speed = power;
			this.player.stats.internet_speed = power;
			this.player.stats.password_list_lvl = power;
			this.ui.display("<span class='meta'> God Mode Enabled. </span>");
			console.log("God mode enabled");
		} else {
			this.player.god = false;
			this.player.stats.cpu_speed = game.defaults.STARTING_CPU_SPEED;
			this.player.stats.internet_speed = game.defaults.STARTING_INTERNET_SPEED;
			this.player.stats.password_list_lvl = 0.1;
			this.ui.display("<span class='meta'> God Mode Disabled. </span>");
			console.log("God mode disabled");
		}
	},

	// -- Properties --
	initalized: false,
	
};

game.new_game();
