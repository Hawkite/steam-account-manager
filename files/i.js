var {ipcRenderer, remote} = require('electron');
var ipc = ipcRenderer;

//login form elements
var logInForm = document.querySelector(".logInForm");
var loginBtn = document.querySelector("#loginbtn");

//auth form elments
var authForm = document.querySelector(".authForm");
var authBtnSubmit = document.querySelector("#authBtn");

//email form elements
var emailForm = document.querySelector(".emailForm");
var emailBtnSubmit = document.querySelector("#emailBtn");

//loading screen elements
var loadingScreen = document.querySelector("#loadingScreen");
var mainScreen = document.querySelector(".main");
var statusBar = document.querySelector("#loadingStatus");

var screens = [authForm,emailForm,mainScreen,logInForm];

var theInfo = {};
var accinfos = 0;
var maxinfos = 4;
var firstLoad = true;

loginBtn.addEventListener("click",function(){
	var username = document.querySelector("input[name=username]").value;
	var password = document.querySelector("input[name=password]").value;
	setLoading("Logging In...");
	ipc.send("loginRequest",{username: username,password: password});
})

emailBtnSubmit.addEventListener("click",function(){
	var code = document.querySelector("input[name=emailcode]").value;
	var username = document.querySelector("input[name=username]").value;
	var password = document.querySelector("input[name=password]").value;
	ipc.send("loginRequest",{username: username,password: password,twoFactorCode: code});
	setLoading("Logging In...");
})

authBtnSubmit.addEventListener("click",function(){
	var code = document.querySelector("input[name=authcode]").value;
	var username = document.querySelector("input[name=username]").value;
	var password = document.querySelector("input[name=password]").value;
	ipc.send("loginRequest",{username: username,password: password,authCode: code});
	setLoading("Logging In...");
})








function setLoading(status){
	if(loadingScreen.classList.contains("hidden")){
		for(var i = 0;i < screens.length;i++)
			screens[i].classList.add("hidden");
		loadingScreen.classList.remove("hidden");
	}
	statusBar.innerText = status;
}

function stopLoading(screen){
	screen.classList.remove("hidden");
	loadingScreen.classList.add("hidden");
}

function addToInfos(key,data){
	if(firstLoad)
	{
		accinfos++;
		console.log(`${accinfos} out of ${maxinfos} received`);
	}

	theInfo[key] = data;
	if(accinfos == maxinfos){
		accinfos=0;
		stopLoading(mainScreen);
		firstLoad = false;
		console.log(theInfo);
	}
}




ipc.on("accountInfo",function(event,args){
	addToInfos("accountInfo",args);
}).on("emailInfo",function(event,args){
	addToInfos("emailInfo",args);
}).on("accountLimitations",function(event,args){
	addToInfos("accountLimitations",args);
}).on("wallet",function(event,args){
	addToInfos("wallet",args);
}).on("vacBans",function(event,args){
	addToInfos("vacBans",args);
});



ipc.on("ping",()=>{
	console.log("ping");
})

ipc.on("steamGuard",(event,args)=>{
	if(args.domain){
		stopLoading(emailForm);
	} else {
		stopLoading(authForm);
	}
});

ipc.on("loggedIn",(event,args)=>{
	setLoading("Logged in, gathering data");
});





//ipcRenderer.send("ping");
