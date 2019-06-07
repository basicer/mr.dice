function Calculator() {
	this.buffer = "";
	this.command = null;
	this.result = null;
	this.showRaw = false;
	this.showCmd = false;
	this.showPreEval = true;
	this.logroot = []
	this.logstack = [this.logroot];
	this.thread = false;
	this.cmdbuffer = [];
	this.eventbuffer = {};

	this.interval = 10;

	this.onDisplayChanged;
}

Calculator.prototype = {
	/* Deferment goodness */
	addToBuffer: function() {
		if ( this.thread === false ) {
			var uvc = this;
			this.thread = setTimeout(function() { uvc.processBuffer(); }, this.interval);
		}
		this.cmdbuffer.push(Array.prototype.slice.call(arguments));

	},
	processBuffer: function() {
		var element = this.cmdbuffer.shift();
		if ( element == undefined ) {
			this.thread = false;
			return
		}
		var name = element.shift();
		this[name].apply(this, element);
		var uvc = this;
		setTimeout(function() { uvc.processBuffer(); }, this.interval) 
	},
	key: function(code) {
			 var last = this.buffer.substring(this.buffer.length -1);
			 switch ( code ) {
				 case 'C':
					 return this.clear();
				 case '=':
					 return this.crunch();
				 case '\u2190':
					 return this.backspace();
				 case '\u00B1':
					 if ( last == "+" ) {
			   			this.buffer = this.buffer.substring(0,this.buffer.length - 1);
						this.buffer += "\u2212";
					} else if ( last == "\u2212" || last == "-" ) {
			   			this.buffer = this.buffer.substring(0,this.buffer.length - 1);
						this.buffer += "+";
			 		} else {
						this.buffer += "+";
					 }
					 break;
				 case '\u0192':
					 return;
				 case 'd':
					 if ( last == 'd' ) return;
					 //Fallthough Intentional :]
				 default:
					 if ( this.result != null ) {
						 this.clear();
					 }
					 this.buffer += code;
					 break;
			}
			this.raise('onDisplayChanged');	 
	},
	raise: function(evt) {
		if ( this[evt] != null ) {
			if ( this.eventbuffer[evt] != undefined ) {
				clearTimeout(this.eventbuffer[evt]);
			}
			var uvt = this;
			this.eventbuffer[evt] = setTimeout(function() { uvt[evt].apply(uvt); }, 10);

		}

	},
	getValueBox: function() {
		if ( this.result != null ) {
				if ( !this.showCmd ) return this.getClean(this.result);
				return this.getClean(this.buffer + " = " + this.result);
		}
		return this.getClean(this.buffer);		 
	},
	getClean: function(buf) {
		if ( this.showRaw ) return buf;
		buf = "" + buf;
		buf = buf.replace(/\[F:([a-zA-Z]*)\]/g, function(a,b) { return " " + b + " " });
		buf = this.stripComments(buf);
		buf = buf.replace(/\s\s/g,' ');
		return buf;
	},
	backspace: function() {
		if ( this.result != null ) {
			this.result = null;
			this.command = null;
		} else {
			var last = this.buffer.substring(this.buffer.length -1);
			if ( last == "]" ) {
				this.buffer = this.buffer.replace(/\[F:[a-zA-Z]*?\]$/,'');
			} else {
			   this.buffer = this.buffer.substring(0,this.buffer.length - 1);
			}
		}
		this.raise('onDisplayChanged');	 
	},
	clear: function() {
			this.result = null;
			this.command = null;
			this.buffer = "";
			this.raise('onDisplayChanged');	 
		   },
	crunch: function() {
			this.logroot = []
			this.logstack = [this.logroot];
			if ( this.buffer.length < 1 ) return;
			this.command = this.buffer;
			this.result = this.calc(this.command)
			this.raise('onDisplayChanged');	 

	},
	calc: function(cmd, sub) {
			this.logOpen();
			console.log("CALC:" + cmd);
			var result;
			var calc = this;
			cmd = cmd.replace("\u2212","-");
			var c2 = null
			while ( c2 != cmd ) {
				c2 = cmd;
				cmd = cmd.replace(/^(.*?)\[F:([a-zA-Z]*?)\]([0-9]+)?$/, function(chunk, arg, name, opts) {
					var f = calc.funcs[name];
					var ch = calc.calc(calc.stripComments(arg), true);
					if ( f == null ) return arg;
					var result = f.call(calc,ch,opts,arg);
					calc.logAppend("=> {1}",calc.getClean(result));
					return result;
				});
			}
			cmd = cmd.replace(/(\d+|^)d(\d+)/g, function(x,a,b) { return calc.roll(a,b) });
			if ( sub ) { 
					this.logClose()
					//this.log("-> {1}", cmd);
					return cmd; 
			}
			var ev = eval(cmd);
			if ( ev == undefined ) ev = 0;
			result = cmd;
		    if ( cmd != ev ) {
					if ( this.showPreEval ) {
							result += " = " + ev;
					} else {
							result = ev;
					}
			}
			this.logClose()
			this.log("=> {1}", ev);
			return result;
		},
	isSaveable: function() {
		return this.command != null;
	},
	roll: function(x,y) {
			   var result = 0;
			   var flips = [];
			   if ( x == "" ) x = "1";
			   x = parseInt(x);
			   for ( var i = 0; i < x; ++i ) {
					var flip = Math.floor(Math.random() * y) + 1;
					flips.push(flip);
					result += flip;
			   }
			   this.log("Rolled {1}d{2} => {3}",x,y,flips.join(" ")); 
			   return flips.join("+")
	},
	keyFunction: function(name) {
		if ( this.result != null ) {
			this.result = null;
			this.command = null;
		}
		this.buffer += "[F:" + name + "]";
	},
	stripComments: function(arg) {
		return arg.replace(/\/\*.*?\*\//g, '');
	},
	embedComments: function(arg) {
		return arg.replace(/\/\*(.*?)\*\//g, function(a,m) { return "|*" + m + "*|";} );
	},
	load: function(arg) {
		this.buffer = arg;
		this.result = null;
		this.command = null;
	},
	split: function(arg) {
		return this.stripComments(arg).split("+")
	},
	log: function() {
		this.logstack[this.logstack.length - 1].push("");
		this.logAppend.apply(this,arguments);
    },
	logAppend: function(what) { 
		var args = arguments;
		var str = what.replace(/{(\d+)}/g, function(match, number) { 
			return typeof args[number] != 'undefined' ? args[number] : match;
		});
		var ptr = this.logstack[this.logstack.length - 1];
		var target = ptr.pop();
		if ( typeof(target) != "string" ) {
			ptr.push(target);
			target = "";
		} else {
			target += " ";
		}
		target += str;
		ptr.push(target);
		//console.log("LOGGING " + str + " @ " + this.logstack.length);
	},
	logOpen: function() {
		var nl = [];
		var lptr = this.logstack[this.logstack.length - 1];
		lptr.push(nl);
		this.logstack.push(nl);

	},
	logClose: function() {
		var oldpool = this.logstack.pop();
		if ( oldpool.length == 1 ) {
			var lptr = this.logstack[this.logstack.length - 1];
			lptr.pop();
			lptr.push(oldpool[0]);
		}
		console.log(this.logroot);
	}
}

Calculator.prototype.funcs = {
	dropLow: function(arg,opt) {
		var list = this.split(arg)
		if ( opt == null ) { opt = 1 }
		for ( i in list ) list[i] = parseInt(list[i]);
		list.sort(function(a,b) { return a - b; });
		var lost = "";
		for ( var x = 0; x < opt; ++x ) { lost += " " + list.shift() }
		this.log("Droped:{1}",lost,list.join(" "))
		return "/*DL:" + lost + "*/ " + list.join("+");
	},
	dropHigh: function(arg,opt) {
		var list = this.split(arg)
		if ( opt == null ) { opt = 1 }
		for ( i in list ) list[i] = parseInt(list[i]);
		list.sort(function(a,b) { return a - b; });
		var lost = "";
		for ( var x = 0; x < opt; ++x ) { lost += " " + list.pop() }
		this.log("Droped:{1}",lost,list.join(" "))
		return "/*DL:" + lost + " */ " + list.join("+");
	},
	sort: function(arg,opt) {
		var list = this.split(arg)
		for ( i in list ) list[i] = parseInt(list[i]);
		list.sort(function(a,b) { return a - b; });
		return list.join("+");
	},
	hit: function(arg,opt) {
		var list = this.split(arg)
		if ( opt == null ) { opt = 1 }
		for ( i in list ) list[i] = parseInt(list[i]) >= parseInt(opt) ? 1 :0;
		list.sort(function(a,b) { return a - b; });
		this.log(" hit {1}",opt,list.join(" "))
		return "/*H:" + this.embedComments(arg) + " */ " + list.join("+");
	},
	close: function(arg, opt, raw) {
		var list = this.split(arg)
		var extra = new Array();
		var targets = raw.match(/d([0-9]*)/);
		for ( var i in list ) {
				if ( parseInt(list[i]) >= opt ) extra.push("/*O:*/" + this.roll('1d' + targets[1]))
		}
		return list.concat(extra).join("+");
	},
	open: function(arg, opt, raw) {
		var list = this.split(arg)
		var extra = new Array();
		var targets = raw.match(/d([0-9]*)/);
		if ( opt == null ) { opt = targets[1]; }
		var count = 0;
		for ( var i in list ) {
			if ( parseInt(list[i]) >= opt ) count = count + 1;
		}
		while ( count > 0 ) {
			var roll = this.roll(1,targets[1]);
			extra.push("/*O:*/" + roll)
			if ( parseInt(roll) < opt ) --count;
		}
		return list.concat(extra).join("+");
	},
	monty: function(arg, opt, raw) {
		if ( opt == null ) { opt = 1000 }
		var sum = eval(arg);
		var dist = {};
		dist[sum] = 1;

		for ( var i = 1; i < opt; ++i ) {
			var rroll = this.calc(raw, true);
			var roll = eval(rroll);
			if ( dist[roll] == undefined ) dist[roll] = 0;
			dist[roll]++;
			sum += roll;
		}

		console.log(dist);
		return sum / opt;
	},
	bestof: function(arg, opt, raw, bias) {
		if ( opt == null ) { opt = 1 }
		if ( bias == null ) { bias = 1; }
		var best = arg;
		var max = eval(arg) * bias;

		for ( var i = 1; i < opt; ++i ) {
			var rroll = this.calc(raw, true);
			var roll = eval(rroll) * bias;
			if (roll > max ) {
				best = rroll;
				max = roll;
			}
		}

		return best;
	},
	worstof: function(arg, opt, raw) {
		return this.funcs.bestof.call(this,arg,opt,raw,-1);
	}
}
