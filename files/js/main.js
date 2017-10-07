'use strict';
var {ipcRenderer, remote} = require('electron');
var ipc = ipcRenderer;
//must be required in the front end or else
var SteamUser = require('steam-user');

let accounts = remote.getGlobal("functions").loadAccounts();

var filterObject = (obj, predicate) =>
  Object.keys(obj)
      .filter( key => predicate(obj[key]) )
      .reduce( (res, key) => (res[key] = obj[key], res), {} )

var SteamID = {};
SteamID.Universe = {
    "INVALID": 0,
    "PUBLIC": 1,
    "BETA": 2,
    "INTERNAL": 3,
    "DEV": 4
};

SteamID.Instance = {
    "ALL": 0,
    "DESKTOP": 1,
    "CONSOLE": 2,
    "WEB": 4
};

SteamID.Type = {
    "INVALID": 0,
    "INDIVIDUAL": 1,
    "MULTISEAT": 2,
    "GAMESERVER": 3,
    "ANON_GAMESERVER": 4,
    "PENDING": 5,
    "CONTENT_SERVER": 6,
    "CLAN": 7,
    "CHAT": 8,
    "P2P_SUPER_SEEDER": 9,
    "ANON_USER": 10
};

Vue.directive('infobox', {
  inserted: function (el,binding) {
    el.classList.add("pos-relative");
    let tooltip = document.createElement("div");
    tooltip.classList.add("v-tooltip");

    if(binding.arg == "html")
      tooltip.innerHTML = binding.value;
    else
      tooltip.innerText = binding.value;

    if(!binding.modifiers["hov"]){
      tooltip.style.pointerEvents = "none";
      tooltip.style.userSelect = "none";
    }

    el.appendChild(tooltip);
    el.addEventListener("mouseenter",function(){
      tooltip.style.top = `${el.getBoundingClientRect().top-tooltip.offsetHeight}px`;
      tooltip.style.left = `${(el.getBoundingClientRect().left + el.offsetWidth/2 - tooltip.offsetWidth/2) < 0?0:(el.getBoundingClientRect().left + el.offsetWidth/2 - tooltip.offsetWidth/2)}px`;
      tooltip.classList.add("active");
    })
    el.addEventListener("mousemove",function(e){
      /*tooltip.style.top = `${e.offsetY > el.offsetHeight/2?el.offsetHeight:-tooltip.offsetHeight}px`;
      tooltip.style.left = `${(e.offsetX < el.offsetWidth*.1?-tooltip.offsetWidth + tooltip.offsetWidth/2:e.offsetX < el.offsetWidth*.9?e.offsetX:el.offsetWidth) - tooltip.offsetWidth/2}px`;*/
    })
    el.addEventListener("mouseleave",function(){
      tooltip.classList.remove("active");
    })
  },
  unbind:function(){
    el.removeEventListener("onmouseenter",function(){

    })
  }
})


Vue.component('globalcenter', {
  template: '<div class="centerer col-xs-12"><slot></slot></div>'
})

var emailCodeForm = Vue.component('emailCodeForm',{
  template: `<div class=""><h3>Email Verification...</h3><form v-on:submit.prevent="submit" class="row"><label class="col-xs-12">\
  <div class="col-xs-6">Email Code:</div><input class="col-xs-6" v-model="authCode"></input>\
  </label><button class="col-xs-12" type="submit">Submit</button></form></div>`,
  data:function(){
    return {twoFactorCode: ""}
  },
  methods:{
    submit: function(){
      this.$root.retryLogin(this.twoFactorCode);
    }
  }
});

var authForm = Vue.component('authForm',{
  template: `<div class=""><h3>Mobile Authenticator...</h3><form v-on:submit.prevent="submit" class="row"><label class="col-xs-12">\
  <div class="col-xs-6">Auth Code:</div><input class="col-xs-6" v-model="authCode"></input>\
  </label><button class="btn col-xs-12" type="submit">Submit</button></form></div>`,
  data:function(){
    return {authCode: ""}
  },
  methods:{
    submit: function(){
      this.$root.retryLogin(this.authCode);
    }
  }
});

var propertyWidget = Vue.component('propertywidget',{
  template: `<div class="propertyWidget" :class="{'col-xs-12': !nested,'lighter':!nested}">\
  <div v-for="(value,key) in this.obj" v-if="value !== null && (typeof value == 'object'?Array.isArray(value)?value.length:Object.keys(value).length:true)" class="propDisp">\
    <div >\
      <div>{{key?prepareKey(key):"unnamed"}}</div>\
      <div v-if="typeof value !== 'object'">{{value}}</div>\
      <div v-else >\
        <propertywidget nested="true" style="padding-left:5px" :object="value"></propertywidget>\
      </div>\
    </div>\
  </div>\
  </div>`,
  props:['object','nested'],
  data:function(){
    return {obj:{}};
  },
  created:function(){
    if(!this.object){
      this.obj = this.$root.account.props;
    } else {
      this.obj = this.object;
    }
  },
  methods:{
    prepareKey: function(key){
      key = key.split(/(?=[A-Z])/).join(" ")
      let firstChar = key.charAt(0).toUpperCase();
      return firstChar + key.slice(1);
    }
  }
}
);

var friendLi = Vue.component('friendli',{
  template:`<div ref="parentLi" class="li clickable" @click.prevent="clicked()" @mouseleave="menuVisible = false" style="flex-direction:row;word-break: break-all;">
    <img class="profico" :src="data.avatar_url_icon"/>
    <div class="col-xs-12" style="padding:0">
      <div class="col-xs-12">{{data.player_name}}</div>
      <div v-if="data.game_name || data.gameid" class="col-xs-12 friends-game-text">Playing {{data.game_name ||  ("(game id) " + data.gameid)}}</div>
    </div>
    <div>
      <i class="fa fa-ellipsis-v pad" @click.stop.capture="toggleMenu" aria-hidden="true"></i>
      <div v-if="menuVisible" class="li-menu" ref="childMenu" >
        <div class="col-xs-12 clickable pad" @click.stop.capture="removeFriendPrompt">Remove Friend</div>
      </div>
    </div>
    <div v-if="confirmNeeded" class="friendli-confirm text-center" @click.capture><div>{{confirmMessage}}</div><span class="btn col-xs-6" @click.stop.capture="confirmFunc(true)">Yes</span><span class="btn btn-danger col-xs-6" @click.stop.capture="confirmFunc(false)">No</span>
    </div>
  </div>`,
  data:function(){
    return {menuVisible: false,confirmNeeded:false,confirmMessage:'',confirmFunc:function(){}};
  },
  updated: function(){
      if(this.$refs.childMenu){
        let prnt = this.$refs.parentLi;
        let child = this.$refs.childMenu;
        let bcr= prnt.getBoundingClientRect();
        child.style.top = bcr.top - child.offsetHeight + 'px';
        child.style.left = bcr.left + 'px';
        child.style.right = Math.abs(window.innerWidth - (bcr.left + prnt.offsetWidth)) + 'px';
      }
  },
  props:{
    "data":{
      type: Object
    },
    "userid":{
      type: String,
      required: true
    }
  },
  methods:{
    removeFriendPrompt:function(){
      this.confirmMessage = 'remove ' + this.data.player_name + '?';
      this.confirmNeeded = true;
      this.confirmFunc = this.removeFriend;
      this.menuVisible = false;
    },
    removeFriend: function(ans){
      if(ans){
        this.$root.steamUserClient.removeFriend(this.userid);
      }
      this.resetConfirm();
    },
    resetConfirm: function(){
      this.confirmMessage = '';
      this.confirmFunc = ()=>{};
      this.confirmNeeded = false;
    },
    toggleMenu:function(){
      this.menuVisible = !this.menuVisible;
    },
    clicked: function(){
      this.$emit("friendClicked",this.userid,this.data);
    }
  }
});


var friendsList = Vue.component('friendslist',{
  template:`<div class="friendsList">
    <input v-model="filterText" class="col-xs-12" placeholder="Search..." style="position: sticky;top:0;z-index:20;"/>
    <friendli v-for="(val,key) in filteredInGameFriends" class="col-xs-12 game" @friendClicked="sendClickEvent" :data='val' :userid='key' :key="key"></friendli>
    <friendli v-for="(val,key) in filteredOnlineFriends" class="col-xs-12 online" @friendClicked="sendClickEvent" :data='val' :userid='key' :key="key"></friendli>
    <friendli v-for="(val,key) in filteredOfflineFriends" class="col-xs-12 offline" @friendClicked="sendClickEvent" :data='val' :userid='key' :key="key"></friendli>
    </div>`,
    data:function(){
      return {filterText:""};
    },
  computed:{
    filteredInGameFriends: function(){
      return filterObject(this.inGameFriends,x => x.player_name.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"").indexOf(this.filterText.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"")) > -1);
    },
    filteredOnlineFriends: function(){
      return filterObject(this.onlineFriends,x => x.player_name.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"").indexOf(this.filterText.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"")) > -1);
    },
    filteredOfflineFriends: function(){
      return filterObject(this.offlineFriends,x => x.player_name.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"").indexOf(this.filterText.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"")) > -1);
    },
    inGameFriends:function(){
      return filterObject(this.list,x=>x.gameid);
    },
    onlineFriends:function(){
      return filterObject(this.list,x=>(x.persona_state && !x.gameid));
    },
    offlineFriends:function(){
      return filterObject(this.list,x=>!x.persona_state);
    }
  },
  props:{
    "list":{
      type: Object
    }
  },
  methods:{
    sendClickEvent: function(){
      this.$emit("friendClicked",arguments);
    }
  }
});

var chatbox = Vue.component('chatbox',{
  template:`<div class="chatbox">
    <div class="col-xs-12 no-pad tab-holder" @mousewheel.prevent="scrollTabHolder">
      <span @click.self="setChat(id)" class="tab" :class="{'selected':(selectedChat == id)}" v-for="id in openChats">{{list[id].player_name}}  <i style="z-index: 10" @click="removeId(id)" class="fa fa-close clickable"></i></span>
    </div>
    <div v-show="selectedChat" class="chat-area centerer">
      <div class="col-xs-12 chat-area-history" ref="chathistory" @scroll="checkScroll">
        <div class="chat-message" :class="{'chat-message-mine':message.steamID.accountid == myAccId}" v-for="(message,index) in selectedUserChatHistory">
          <div v-if="index == 0||(selectedUserChatHistory[index-1].steamID.accountid != message.steamID.accountid)" class="chat-message-name" >{{message.steamID.accountid == myAccId?myName:recipientName}}</div>
          <div class="chat-message-message">{{message.message}}</div>
        </div>
      </div>
      <div style="flex-basis:20%;" class="col-xs-12 no-pad"><textarea v-model="currMessage" @keyup.enter="sendMessage()" :disabled="!selectedChat" class="col-xs-12" style="height:100%;resize:none;padding:10px;"></textarea></div>
    </div>
  </div>`,
  props:['openChats','list','selectedChat'],
  data: function(){
    return {selectedUserChatHistory: [],
    myAccId: this.$root.steamUserClient.steamID.accountid,
    myName: this.$root.steamUserClient.accountInfo.name,
    currMessage:"",
    userScrolled: false};
  },
  mounted: function(){

    this.$root.steamUserClient.on('friendMessage',(id,message)=>{
      if(this.selectedChat == id.getSteamID64()){
        this.selectedUserChatHistory.push({steamID:id,message:message,timestamp:Date.now()});
        this.scrollBottom();
      }
    }).on('friendTyping'+this.selectedChat,(id)=>{

    }).on('friendMessageEcho',(id,message)=>{
      if(this.selectedChat == id.getSteamID64()){
        this.selectedUserChatHistory.push({steamID:this.$root.steamUserClient.steamID,message:message,timestamp:Date.now()});
        this.scrollBottom();
      }
    });
  },
  methods:{
    setChat: function(id){
      if(this.openChats.indexOf(id) > -1)
        this.$emit('update:selectedChat', id)
    },
    removeId: function(id){
      var tmpChats = JSON.parse(JSON.stringify(this.openChats));
      let ind = tmpChats.indexOf(id);
      tmpChats.splice(ind,1);
      this.$emit('update:openChats',tmpChats);
    },
    scrollTabHolder: function(e){
      var el = e.srcElement;
      if(!e.srcElement.classList.contains("tab-holder"))
        while ((el = el.parentElement) && !el.classList.contains("tab-holder"));
      el.scrollLeft += e.deltaY;
    },
    sendMessage: function(){
      this.$root.steamUserClient.chatMessage(this.selectedChat,this.currMessage);
      this.selectedUserChatHistory.push({steamID:this.$root.steamUserClient.steamID,message:this.currMessage,timestamp:Date.now()});
      this.currMessage = "";
      this.scrollBottom();
    },
    scrollBottom: function(){
      if(!this.userScrolled)
        setTimeout(()=>{this.$refs.chathistory.scrollTop = this.$refs.chathistory.scrollHeight},100);
    },
    checkScroll: function(e){
      this.userScrolled = this.$refs.chathistory.scrollHeight - this.$refs.chathistory.scrollTop === this.$refs.chathistory.clientHeight ? false:true;
    }
  },
  computed:{
    recipientName: function(){
      return this.list[this.selectedChat].player_name;
    }
  },
  watch:{
    selectedChat:function(){
      this.selectedUserChatHistory = {};
      if(this.selectedChat){
        this.$root.steamUserClient.getChatHistory(this.selectedChat,(succ /*S U C C*/,msgs)=>{
          this.$set(this,"selectedUserChatHistory",msgs);
          this.scrollBottom();
          //console.log(this.$root.steamUserClient.client.steamID);
        });
      }
    },
    openChats:function(){

    }
  }
});

var friendsWidget = Vue.component('friendsWidget',{
  template:`<div class="col-xs-12 basicHeight centerer" style="flex-direction:row">
    <chatbox class="col-xs-12 no-pad" style="height:100%; overflow-y:auto;" :selectedChat.sync="selectedChat" :list="cFriends" :openChats.sync="openChats"></chatbox>
    <friendslist class="col-xs-12 basicHeight" style="overflow-y:auto" @friendClicked="startChat" :list="cFriends"></friendslist>
  </div>`,
  data:function(){
    return {friendsList: this.$root.account.friends, openChats: [],cFriends: {},selectedChat:""}
  },
  created: function(){
    this.updateCFriends();
  },
  watch:{
    friendsList: function(){
      this.updateCFriends();
    },
    openChats: function(){
      if(this.openChats.indexOf(this.selectedChat) == -1)
        this.selectedChat = this.openChats[this.openChats.length-1];
    }
  },
  methods:{
    updateCFriends: function(){
        this.$root.steamUserClient.getPersonas(Object.keys(this.friendsList),(p)=>{
          this.cFriends = p;
        });
      },
    startChat:function(id){
      this.openChats.indexOf(id[0]) == -1? this.openChats.push(id[0]):false;
      this.selectedChat = id[0];
    }
  }
});

var appLi = Vue.component('appli',{
  template:`<div class="li col-xs-12" >
    <div class="col-xs-12">{{obj.appinfo.common.name}}</div>
    <div class="col-xs-4 btn" :class="{'btn-danger': isPlaying}" @click="togPlay()" v-if="!isPlayedRemotely">{{isPlaying?"Stop Playing":"Play"}}</div>
    <div class="col-xs-auto-right"><input type="checkbox" v-model="checked"/></div>
    </div>`,
  data:function(){
    return {isPlayedRemotely:false,visible:true,checked: false}
  },
  props:{
    "appid":{
      type: [String,Number],
      required: true
    },
    "obj":{
      type: Object,
      required:true
    },
    "isPlaying":{
      type: Boolean
    },
    "isChecked":{
      type: Boolean
    }
  },
  created:function(){

  },
  watch:{
    isChecked:function(){
      this.checked = this.isChecked;
    },
    checked:function(){
      this.$emit('update:isChecked', this.checked)
    }
  },
  methods:{
    togPlay: function(){
      let isPlaying = this.isPlaying;
      isPlaying?this.$emit('stopPlay'):this.$emit('startPlay');
    }
  }
});

var appsWidget = Vue.component('appsWidget',{
  template: `<div class="appsWidget col-xs-12">
  <div class="col-xs-12">
    <h4 class="col-xs-12">Control</h4>
    <div class="col-xs-12">
      <div class="col-xs-auto btn" @click="playAll()">Play All</div>
      <div class="col-xs-auto btn" @click="stopPlayingAll()">Stop Playing All</div>
    </div>
  </div>
  <div class="col-xs-12">
    <h4 class="col-xs-12">Selection</h4>
    <div class="col-xs-12">
      <div class="col-xs-auto btn" @click="selectAll()">Select All</div>
      <div class="col-xs-auto btn" @click="deselectAll()">Deselect All</div>
    </div>
    <div class="col-xs-12">
      <div class="col-xs-auto btn" @click="playAllSelected()">Play All Selected</div>
      <div class="col-xs-auto btn" @click="stopPlayingAllSelected()">Stop Playing Selected</div>
    </div>
  </div>
  <input class="col-xs-12" placeholder="Search..." v-model="filterText"></input>
  <div class="basicHeight col-xs-12">
    <appli v-for="(val,key) in shownApps" @stopPlay="stopPlayingGame(parseInt(key))" @startPlay="playGame(parseInt(key))" :isChecked.sync="val.isChecked" :isPlaying="gamesPlayed.indexOf(parseInt(key)) > -1" :key="val.appinfo.common.name.replace(/[|&;$%@'<>()+, :-]/g,'')" :appid="key" :obj="val"></appli>
  </div>
  </div>`,
  data:function(){
    return {apps:this.$root.account.appsOwned,cApps:{},filterText:"",gamesPlayed:[]}
  },
  computed:{
    shownApps:function(){
      return this.filter(this.cApps,x => x.appinfo.common.name.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"").indexOf(this.filterText.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"")) > -1);
    }
  },
  watch:{
    // filterText: function(){
      //this.$set(this,"dispApps",this.filter(this.cApps,x => x.appinfo.common.name.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"").indexOf(this.filterText.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"")) > -1));
      // var tmp1 = this.filter(this.cApps,x => x.appinfo.common.name.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"").indexOf(this.filterText.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"")) < 0);
      // var tmp2 = this.filter(this.cApps,x => x.appinfo.common.name.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"").indexOf(this.filterText.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"")) > -1);
      // for(var a in tmp1){
      //   this.$set(this.cApps[a],"visible",false)
      // }
      // for(var a in tmp2){
      //   this.$set(this.cApps[a],"visible",true)
      // }
    // },
    apps: function(){
      var owned = this.apps; //just incase it changes midway idk lol
      this.$root.steamUserClient.getProductInfo(owned,[],(apps)=>{
        this.$set(this,"cApps",{});
        for(var i = 0;i < owned.length;i++){
          if(apps[owned[i]].appinfo.common){
            var type = apps[owned[i]].appinfo.common.type.toLowerCase();
            if(type == "game" || type == "tool" || type == "application"){
              apps[owned[i]].isChecked = false;
              //apps[owned[i]].visible = true;
              this.$set(this.cApps,owned[i],apps[owned[i]]);
            }
          }
        }
      });
    }
  },
  methods:{
    selectAll: function(){
      for(var n in this.cApps)
        this.cApps[n].isChecked = true;
    },
    deselectAll: function(){
      for(var n in this.cApps)
        this.cApps[n].isChecked = false;
    },
    playAll: function(){
      var tmp = Object.keys(this.cApps);
      for(var i = 0; i < tmp.length; i++)
        tmp[i] = parseInt(tmp[i]);
      this.$root.steamUserClient.gamesPlayed(tmp,true);
      this.$set(this,"gamesPlayed",tmp);
    },
    stopPlayingAll: function(){
      this.$root.steamUserClient.gamesPlayed([],true);
      this.$set(this,"gamesPlayed",[]);
    },
    playAllSelected: function(){
      var tmp = Object.keys(this.filter(this.cApps,x => x.isChecked));
      for(var i = 0; i < tmp.length; i++)
        tmp[i] = parseInt(tmp[i]);
      this.$root.steamUserClient.gamesPlayed(tmp,true);
      this.$set(this,"gamesPlayed",tmp);
    },
    stopPlayingAllSelected: function(){
      var tmp = Object.keys(this.filter(this.cApps,x => x.isChecked))
      for(var i = 0; i < tmp.length; i++){
        tmp[i] = parseInt(tmp[i]);
        if(this.gamesPlayed.indexOf(tmp[i]) > -1)
          this.gamesPlayed.splice(this.gamesPlayed.indexOf(tmp[i]),1);
      }
      this.$root.steamUserClient.gamesPlayed(this.gamesPlayed,true);
    },
    filter: (obj, predicate) =>
      Object.keys(obj)
          .filter( key => predicate(obj[key]) )
          .reduce( (res, key) => (res[key] = obj[key], res), {} ),
    playGame: function(id){
      this.gamesPlayed.indexOf(id) == -1?this.gamesPlayed.push(id):false;
      this.$root.steamUserClient.gamesPlayed(this.gamesPlayed,true);
    },
    stopPlayingGame: function(id){
      this.gamesPlayed.indexOf(id) > -1? this.gamesPlayed.splice(this.gamesPlayed.indexOf(id),1):false;
      this.$root.steamUserClient.gamesPlayed(this.gamesPlayed,true);
    }
  }
});

var sectionComponent = Vue.component('widgetsection',{
  template:`<section><span class="clickable" @click.prevent="open = !open"><h2 v-if="title" class="col-xs-12"><i class="fa pad" :class="{'fa-caret-right':!open,'fa-caret-down':open}" ></i>{{title}}</h2></span><component v-show="open" :is='widget'></component></section>`,
  props:['title','widget'],
  data: function(){
    return {open:false}
  }
});

var homeComponent = Vue.component('home',{
  template:`<div>
    <widgetsection title="Properties" widget="propertywidget"></widgetsection>
    <widgetsection title="Apps" widget="appsWidget"></widgetsection>
    <widgetsection title="Friends/Chat" widget="friendsWidget"></widgetsection>
  </div>`
});


var loginform = Vue.component('loginform', {
  template:`<div class="col-xs-12">\
  <h3 class="col-xs-12">Log In...</h3>\
  <form v-on:submit.prevent="startLogin()" class="col-xs-12">\
  <label class="col-xs-12">\
  <div class="col-xs-6">Account:</div>\
  <input required v-model="accountName" type="text" class="col-xs-6">\
  </input></label><label class="col-xs-12">\
  <div class="col-xs-6">Password:</div>\
  <input required v-model="password" type="password" class="col-xs-6">\
  </input>\
  </label>\
  <label class="col-xs-6 col-xs-push-6"><input type="checkbox" v-model="remember" class="col-xs-auto-right" style="margin: 10px;height: 20px;"><div class="col-xs-auto-right">Remember Me</div></checkbox></label>
  <button type="submit" class="btn col-xs-12">Submit</button>\
  </form>\
  </div>`,
  data:function(){
    return {accountName:'',password:'',remember:true};
  },
  created: function(){
    this.accountName = this.$root.credentials.username;
  },
  methods:{
    startLogin: function(){
      this.$root.login(this.accountName,this.password,this.remember);
    }
  }
})

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

function createApp(dataParam){
  let dataUsrName = "",dataLoginKey = "";
  if(dataParam){
    if(dataParam.accountName && dataParam.loginKey){
      dataUsrName = dataParam.accountName;
      dataLoginKey = dataParam.loginKey;
    }
  }
  var appTemplate = `
    <div class="col-xs-12 header"><div class="pad clickable" style="height:100%;line-height: 0em;width: 30px;text-align: center;" @click="visible = !visible"><i class="fa" :class="{'fa-caret-down': visible, 'fa-caret-right': !visible}" style="line-height: 0" aria-hidden="true"></i></div><h3 class="col-xs-12">{{account.displayName}}</h3> <div class="btn pad" @click="destroy">X</div></div>
    <div v-show="visible">
      <globalcenter v-if="loadingSomething">
        <div>{{loadingMessage}}</div>
      </globalcenter>
      <globalcenter v-if="!loggedIn && !loadingSomething">
        <transition name="fade">
          <div v-if="logInErrors.error" class="alert alert-danger"><strong>Error: {{logInErrors.message}}</strong></div>
        </transition>
        <component :is="currLogScreen"></component>
      </globalcenter>
      <div>
        <home v-if="loggedIn"></home>
      </div>
    </div>`;
  var appEl = document.createElement('div');
  appEl.classList.add('container-fluid','row');
  appEl.innerHTML = appTemplate;
  document.getElementById('main').insertBefore(appEl,document.getElementById('footer'))//.appendChild(appEl);
  new Vue({
    el: appEl,
    data:{
    account:{friends:{},displayName:"(Not logged in)",props:{},appsOwned:[],packagesOwned:[]},
    loggedIn: false,
    currLogScreen: loginform,
    steamUserClient: null,
    logInErrors:{error: false,message:"",timeout:null},
    loadingSomething: false,
    visible: true,
    loginKey: dataLoginKey,
    loadingMessage: "",
    credentials: {"accountName":dataUsrName,"password":"",authCode:null,twoFactorCode:null,rememberPassword:true},
  },
    created: function(){
      this.init();
    },
    mounted: function(){
      var a = document.getElementById('main');
      a.scrollTop = a.scrollHeight;
    },
    methods:{
      destroy: function(){
        document.getElementById('main').removeChild(this.$el);
        if(this.loggedIn){
          this.steamUserClient.logOff();
        }
        ipc.send("removeprop",{accountName:this.credentials.accountName})
        this.$destroy();
      },
      init: function(){

        this.steamUserClient = new SteamUser({promptSteamGuardCode:false,enablePicsCache:true});

        this.steamUserClient.on(`loggedOn`,()=>{
          this.steamUserClient.codeCallbackLogin = null;
          this.steamUserClient.setPersona(1);
          var tmpProps = {"vanityURL":this.steamUserClient.vanityURL,
          "steamID":{universe:getKeyByValue(SteamID.Universe,this.steamUserClient.steamID.universe)
            ,type:getKeyByValue(SteamID.Type,this.steamUserClient.steamID.type),
            instance:getKeyByValue(SteamID.Instance,this.steamUserClient.steamID.instance),
            "accountID":this.steamUserClient.steamID.accountid}}

          this.account.displayName = this.steamUserClient.vanityURL;
          this.credentials.password = "";
          this.stopLoading();
          this.loggedIn = true;
          this.setProps(tmpProps);
        }).on(`accountInfo`,(name,country,authedMachines,flags,facebookID,facebookName)=>{
          //tmpProps.push({name:"Name",value:name},{name:"Country",value:country},{name:"Authorized Machines",value:authedMachines})
          this.account.displayName = name;
          var flagsStr = "";
          for(var key in SteamUser.EAccountFlags)
            if(!parseInt(key))
              if(SteamUser.EAccountFlags[key] & flags)
                flagsStr += key + ", ";

          flagsStr = flagsStr.slice(0, -2);
          //{name:name,country:country,authedMachines:authedMachines,flags:flagsStr,facebookID:facebookID,facebookName:facebookName}
          setTimeout(()=>{this.setProps({"accountInfo":Object.assign({},this.steamUserClient.accountInfo,{flags:flagsStr})})},100);
          this.$set(this.account.props.steamID,"id",this.steamUserClient.client.steamID);

        }).on(`emailInfo`,(address,validated)=>{
          setTimeout(()=>{this.setProps({"emailInfo":this.steamUserClient.emailInfo})},100);
        }).on(`accountLimitations`,()=>{
          setTimeout(()=>{this.setProps({"accountLimitations":this.steamUserClient.limitations})},100);
        }).on(`vacBans`,()=>{
          setTimeout(()=>{this.setProps({"VAC":this.steamUserClient.vac})},100);
        }).on(`wallet`,()=>{
          setTimeout(()=>{
            var currencyData = SteamUser.CurrencyData[this.steamUserClient.wallet.currency];
            this.setProps({"wallet":Object.assign({},this.steamUserClient.wallet,{currency:null,balance: (currencyData.prepend?currencyData.prepend:"") + this.steamUserClient.wallet.balance + (currencyData.append?currencyData.append:"")})})
          },100);
        }).on(`licenses`,()=>{
          setTimeout(()=>{
            this.setProps({"gamesOwned":this.steamUserClient.licenses.length});
          },100);
        }).on(`appOwnershipCached`,()=>{
            this.setOtherProp(this.account.appsOwned,this.steamUserClient.getOwnedApps());
            this.setOtherProp(this.account.packagesOwned,this.steamUserClient.getOwnedPackages());
        }).on(`steamGuard`,(domain,callback,lastCodeWrong)=>{
          this.steamUserClient.codeCallbackLogin = callback;
          if(this.loadingSomething)
            this.stopLoading();
          if(domain){
            //email
            this.currLogScreen = emailCodeForm;
          } else {
            //auth
            this.currLogScreen = authForm;
          }
        }).on(`error`,(err)=>{
          this.stopLoading();
          this.setError(err.message.replace(/([A-Z])/g, ' $1').trim());
        }).on('friendsList',()=>{
          this.$set(this.account,"friends",this.$root.steamUserClient.myFriends);
        }).on('friendRelationship',()=>{
          this.$set(this.account,"friends",this.$root.steamUserClient.myFriends);
        }).on('loginKey',(key)=>{
          ipc.send("addprops",{accountName:this.credentials.accountName,data:{"loginKey":key}});
        });
        if(this.loginKey){
          this.loginWithKey(this.loginKey);
        }
      },
      setError: function(msg){
        clearTimeout(this.timeout);
        this.logInErrors.error = true;
        this.logInErrors.message = msg;
        this.timeout = setTimeout(this.endError,5000)
      },
      endError: function(){
        this.logInErrors.error = false;
      },
      setProps: function(props){
        for(var prop in props)
          this.$set(this.account.props,prop,props[prop]);
      },
      setOtherProp: function(obj,props){
        for(var prop in props)
          this.$set(obj,prop,props[prop])
      },
      loginWithKey: function(key){
        this.steamUserClient.logOn({accountName: this.credentials.accountName,loginKey:key,rememberPassword:true});
        this.setLoading("Logging in...");
      },
      retryLogin: function(code){
        this.steamUserClient.codeCallbackLogin(code);
        this.setLoading("Logging in...");
      },
      setLoading: function(msg){
        this.loadingSomething = true;
        this.loadingMessage = msg;
      },
      stopLoading: function(){
        this.loadingSomething = false;
        this.loadingMessage = "";
      },
      login: function(accountName,password,remember){
        this.credentials.accountName = accountName;
        this.credentials.password = password;
        this.credentials.rememberPassword = remember;
        this.rememberMe = remember;
        this.setLoading("Logging in...");
        this.steamUserClient.logOn(this.credentials);
      }
    }
  });
}


for(var account in accounts)
  createApp({accountName:account,loginKey:accounts[account].loginKey})
//createApp();
//var app = new Vue(appObj)
