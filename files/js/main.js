var {ipcRenderer, remote} = require('electron');
var ipc = ipcRenderer;





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
var SteamUser = require('steam-user');

Vue.component('globalcenter', {
  template: '<div class="centerer col-xs-12"><slot></slot></div>'
})

Vue.component('infoboard',{
  template: `<div><h4>{{key}}:{{value}}</h4></div>`,
  data:function(){
    return {key:"",value:""}
  }
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
      //(key.split(/(?=[A-Z])/).join(" ").charAt(0).toUpperCase()+(key.split(/(?=[A-Z])/).join(" ")).slice(1)
      key = key.split(/(?=[A-Z])/).join(" ")
      firstChar = key.charAt(0).toUpperCase();
      return firstChar + key.slice(1);
    }
  }
}
);


var appLi = Vue.component('appli',{
  template:`<div class="appli col-xs-12" :class="{hidden: !obj.visible}">
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
      isPlaying = this.isPlaying;
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
  <div class="appliContainer col-xs-12">
    <appli v-for="(val,key) in this.cApps" @stopPlay="stopPlayingGame(key)" @startPlay="playGame(key)" :isChecked.sync="val.isChecked" :isPlaying="gamesPlayed.indexOf(parseInt(key)) > -1" :key="val.appinfo.common.name.replace(/[|&;$%@'<>()+, :-]/g,'')" :appid="key" :obj="val"></appli>
  </div>
  </div>`,
  data:function(){
    return {apps:this.$root.account.appsOwned,cApps:{},filterText:"",gamesPlayed:[]}
  },
  watch:{
    filterText: function(){
      //this.$set(this,"dispApps",this.filter(this.cApps,x => x.appinfo.common.name.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"").indexOf(this.filterText.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"")) > -1));
      var tmp1 = this.filter(this.cApps,x => x.appinfo.common.name.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"").indexOf(this.filterText.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"")) < 0);
      var tmp2 = this.filter(this.cApps,x => x.appinfo.common.name.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"").indexOf(this.filterText.toLowerCase().replace(/[|&;$%@'<>()+, :-]/g,"")) > -1);
      for(a in tmp1){
        this.$set(this.cApps[a],"visible",false)
      }
      for(a in tmp2){
        this.$set(this.cApps[a],"visible",true)
      }

    },
    apps: function(){
      var owned = this.apps; //just incase it changes midway idk lol
      this.$root.steamUserClient.getProductInfo(owned,[],(apps)=>{
        this.$set(this,"cApps",{});
        for(var i = 0;i < owned.length;i++){
          if(apps[owned[i]].appinfo.common){
            var type = apps[owned[i]].appinfo.common.type.toLowerCase();
            if(type == "game" || type == "tool" || type == "application"){
              apps[owned[i]].isChecked = false;
              apps[owned[i]].visible = true;
              this.$set(this.cApps,owned[i],apps[owned[i]]);
            }
          }
        }
      });
    }
  },
  methods:{
    selectAll: function(){
      for(n in this.cApps)
        this.cApps[n].isChecked = true;
    },
    deselectAll: function(){
      for(n in this.cApps)
        this.cApps[n].isChecked = false;
    },
    playAll: function(){
      for(n in this.cApps)
        this.playGame(n)
    },
    stopPlayingAll: function(){
      for(n in this.cApps)
        this.stopPlayingGame(n)
    },
    playAllSelected: function(){
      var tmp = this.filter(this.cApps,x => x.isChecked)
      for(n in tmp)
        this.playGame(n)
    },
    stopPlayingAllSelected: function(){
      var tmp = this.filter(this.cApps,x => x.isChecked)
      for(n in tmp)
        this.stopPlayingGame(n)
    },
    filter: (obj, predicate) =>
      Object.keys(obj)
          .filter( key => predicate(obj[key]) )
          .reduce( (res, key) => (res[key] = obj[key], res), {} ),
    playGame: function(id){
      id = parseInt(id);
      this.gamesPlayed.indexOf(id) == -1?this.gamesPlayed.push(id):false;
      this.$root.steamUserClient.gamesPlayed(this.gamesPlayed,true);
    },
    stopPlayingGame: function(id){
      id = parseInt(id);
      this.gamesPlayed.indexOf(id) > -1? this.gamesPlayed.splice(this.gamesPlayed.indexOf(id),1):false;
      this.$root.steamUserClient.gamesPlayed(this.gamesPlayed,true);
    }
  }
});

var sectionComponent = Vue.component('widgetsection',{
  template:`<section><h2 v-if="title" class="col-xs-12">{{title}}</h2><component :is='widget'></component></section>`,
  props:['title','widget']
});

var homeComponent = Vue.component('home',{
  template:`<div>
    <widgetsection title="Properties" widget="propertywidget"></widgetsection>
    <widgetsection title="Apps" widget="appsWidget"></widgetsection>
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
  <button type="submit" class="btn col-xs-12">Submit</button>\
  </form>\
  </div>`,
  data:function(){
    return {accountName:'',password:''};
  },
  created: function(){
    this.accountName = this.$root.credentials.username;
  },
  methods:{
    startLogin: function(){
      this.$root.login(this.accountName,this.password);
    }
  }
})





function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

function createApp(){
  var appTemplate = `
    <div class="col-xs-12 header"><div class="pad" style="height:100%" @click="visible = !visible"><i class="fa" :class="{'fa-caret-down': visible, 'fa-caret-right': !visible}" aria-hidden="true"></i></div><h3 class="col-xs-12">{{account.displayName}}</h3> <div class="btn pad" @click="destroy">X</div></div>
    <div :class="{'hidden':!visible}">
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
    account:{displayName:"(Not logged in)",props:{},appsOwned:[],packagesOwned:[]},
    loggedIn: false,
    currLogScreen: loginform,
    steamUserClient: null,
    logInErrors:{error: false,message:"",timeout:null},
    loadingSomething: false,
    visible: true,
    loadingMessage: "",
    credentials: {"accountName":"","password":"",authCode:null,twoFactorCode:null},
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
          for(key in SteamUser.EAccountFlags)
            if(!parseInt(key))
              if(SteamUser.EAccountFlags[key] & flags)
                flagsStr += key + ", ";

          flagsStr = flagsStr.slice(0, -2);
          //{name:name,country:country,authedMachines:authedMachines,flags:flagsStr,facebookID:facebookID,facebookName:facebookName}
          setTimeout(()=>{this.setProps({"accountInfo":Object.assign({},this.steamUserClient.accountInfo,{flags:flagsStr})})},100);

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
        });
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
        for(prop in props)
          this.$set(this.account.props,prop,props[prop]);
      },
      setOtherProp: function(obj,props){
        for(prop in props)
          this.$set(obj,prop,props[prop])
      },
      retryLogin: function(code){
        this.steamUserClient.codeCallbackLogin(code);

      },
      setLoading: function(msg){
        this.loadingSomething = true;
        this.loadingMessage = msg;
      },
      stopLoading: function(){
        this.loadingSomething = false;
        this.loadingMessage = "";
      },
      login: function(accountName,password){
        this.credentials.accountName = accountName;
        this.credentials.password = password;
        this.setLoading("Logging in...");
        this.steamUserClient.logOn(this.credentials);
      }
    }
  });
}

//createApp();
//var app = new Vue(appObj)
