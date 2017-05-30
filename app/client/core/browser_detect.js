(function () {
	
	S.BrowserDetect = {
		
		/**
		 * S.BrowserDetect#init() -> undefined
		 * 
		 * OS, OSString, browser, version 프로퍼티를 생성
		 */
		init: function () {
			this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
			this.version = this.searchVersion(navigator.userAgent)
				|| this.searchVersion(navigator.appVersion)
				|| "an unknown version";
			this.OS = this.searchString(this.dataOS) || "an unknown OS";
			this.OSString = this.searchOSString(navigator.userAgent);
		},

		/**
		 * S.BrowserDetect#searchString(data) -> string
		 * - data (array): this.dataBrowser
		 * 
		 * 브라우저의 이름을 반환한다.
		 */
		searchString: function (data) {
			for (var i=0;i<data.length;i++)	{
				var dataString = data[i].string;
				var dataProp = data[i].prop;
				this.versionSearchString = data[i].versionSearch || data[i].identity;
				if (dataString) {
					if (dataString.indexOf(data[i].subString) != -1)
						return data[i].identity;
				}
				else if (dataProp)
					return data[i].identity;
			}
		},

		/**
		 * S.BrowserDetect#searchVersion(dataString) -> array
		 * - dataString (string): navigator.userAgent
		 * 
		 * 브라우저의 버전을 반환한다.
		 */
		searchVersion: function (dataString) {
			var index = dataString.indexOf(this.versionSearchString);
			if (index == -1) {
				return;	
			}
			
			var reg = new RegExp( /[0-9.]+/ );
			return dataString.substring(index+this.versionSearchString.length+1).match( reg );
		},
		
		/**
		 * S.BrowserDetect#searchOSString(nAgt) -> string
		 * - nAgt (string): navigator.userAgent
		 * 
		 * OS의 이름을 반환한다.
		 */
		searchOSString: function( nAgt ){
			var os = 'unknown';
			for (var id in this.clientStrings) {
	            var cs = this.clientStrings[id];
	            if (cs.r.test( nAgt )) {
	                os = cs.s;
	                break;
	            }
	        }
	        return os;
		},
		
		/**
		 * S.BrowserDetect#check(checkData) -> boolean
		 * - checkData (object): 조건이 만족하는 지 확인할 브라우저와 버전, 그리고 OS
		 * 
		 * S.FlashCheck에서 HTML5 지원 브라우저인지 확인하기 위한 용도로 사용중
		 * 설정한 브라우저와 버전, OS를 만족하는지 확인후 true, false를 반환한다.
		 */
		check: function(checkData){    
			var checkData = checkData[this.browser];
			var checkVer = checkData.version;
			var checkOS = checkData.OS;
			var okVer = false;
			var okOS = false;
			var version = this.version;
			var vv = String(version).split(".");
			var len = vv.length;
			var vv2 = "";
			for(var i=0; i<len; i++){
				if(i == 0){
					vv2 = vv[0] + ".";
				}else{
					vv2 += String(vv[i]);
				}
			}	
			version = Number(vv2);
			if(this.browser == "Explorer"){
				if(version >= checkVer && window.document["documentMode"] && window.document.documentMode >= checkVer){
					okVer = true;
				}else{
					okVer = false;
				}			
			}else{
				if(version >= checkVer){ 
					okVer = true; 
				}
			}
			if(okVer){			
				//브라우져와 버젼, OS 체크할 경우,
				if(checkOS !== undefined && checkOS != null && checkOS != ""){
					var reg = new RegExp(checkOS);
					if(reg.test(this.OSString)){
						okOS = true;
					}
				}else{
					//브라우져와 버젼만 체크할 경우,
					okOS = true;
				}
			}
			return (okVer && okOS);
		},
		dataBrowser: [
			{
				string: navigator.userAgent,
				subString: "Chrome",
				identity: "Chrome"
			},
			{ 	string: navigator.userAgent,
				subString: "OmniWeb",
				versionSearch: "OmniWeb/",
				identity: "OmniWeb"
			},
			{
				string: navigator.vendor,
				subString: "Apple",
				identity: "Safari",
				versionSearch: "Version"
			},
			{
				prop: window.opera,
				identity: "Opera"
			},
			{
				string: navigator.vendor,
				subString: "iCab",
				identity: "iCab"
			},
			{
				string: navigator.vendor,
				subString: "KDE",
				identity: "Konqueror"
			},
			{
				string: navigator.userAgent,
				subString: "Firefox",
				identity: "Firefox"
			},
			{
				string: navigator.vendor,
				subString: "Camino",
				identity: "Camino"
			},
			{		// for newer Netscapes (6+)
				string: navigator.userAgent,
				subString: "Netscape",
				identity: "Netscape"
			},
			{
				string: navigator.userAgent,
				subString: "MSIE",
				identity: "Explorer",
				versionSearch: "MSIE"
			},
			{ // win8.1 RTM ie11용
				string: navigator.userAgent,
				subString: "Trident",
				identity: "Explorer",
				versionSearch: "rv"
			},
			{
				string: navigator.userAgent,
				subString: "Gecko",
				identity: "Mozilla",
				versionSearch: "rv"
			},
			{ 		// for older Netscapes (4-)
				string: navigator.userAgent,
				subString: "Mozilla",
				identity: "Netscape",
				versionSearch: "Mozilla"
			}
		],
		dataOS : [
			{
				string: navigator.platform,
				subString: "Win",
				identity: "Windows"
			},
			{
				string: navigator.platform,
				subString: "Mac",
				identity: "Mac"
			},
			{
				   string: navigator.userAgent,
				   subString: "iPhone",
				   identity: "iPhone/iPod"
		    },
		    {
				   string: navigator.userAgent,
				   subString: "iPad",
				   identity: "iPad"
		    },
		    {
				string: navigator.userAgent,
				subString: "Android",
				identity: "Android"
		    },
			{
				string: navigator.platform,
				subString: "Linux",
				identity: "Linux"
			}
		],
		clientStrings: [
	            {s:'Windows 3.11', r:/Win16/},
	            {s:'Windows 95', r:/(Windows 95|Win95|Windows_95)/},
	            {s:'Windows ME', r:/(Win 9x 4.90|Windows ME)/},
	            {s:'Windows 98', r:/(Windows 98|Win98)/},
	            {s:'Windows CE', r:/Windows CE/},
	           // {s:'Windows NT 4.0', r:/(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/},
	            {s:'Windows NT 4.0', r:/(Windows NT 4.0|WinNT4.0)/},
	            {s:'Windows 2000', r:/(Windows NT 5.0|Windows 2000)/},
	            {s:'Windows XP', r:/(Windows NT 5.1|Windows XP)/},
	            {s:'Windows Server 2003', r:/Windows NT 5.2/},
	            {s:'Windows Vista', r:/Windows NT 6.0/},
	            {s:'Windows 7', r:/(Windows 7|Windows NT 6.1)/},
	            {s:'Windows 8.1', r:/(Windows 8.1|Windows NT 6.3)/},
	            {s:'Windows 8', r:/(Windows 8|Windows NT 6.2)/},
	            {s:'Android', r:/Android/},
	            {s:'Open BSD', r:/OpenBSD/},
	            {s:'Sun OS', r:/SunOS/},
	            {s:'Linux', r:/(Linux|X11)/},
	            {s:'iOS', r:/(iPhone|iPad|iPod)/},
	            {s:'Mac OS X', r:/Mac OS X/},
	            {s:'Mac OS', r:/(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/},
	            {s:'QNX', r:/QNX/},
	            {s:'UNIX', r:/UNIX/},
	            {s:'BeOS', r:/BeOS/},
	            {s:'OS/2', r:/OS\/2/},
	            {s:'Search Bot', r:/(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/}
	        ]

	};

	S.BrowserDetect.init();
})();
	