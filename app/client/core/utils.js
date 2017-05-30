(function($, S, Cookies){
	S.Utils = {

		array: function (value) {
			if (!_.isArray(value)) {
				return [value];
			}
			return value;
		},

		value: function (val) {
			if (_.isFunction(val)) {
				return val.apply(this, _.tail(arguments));
			}
			return val;
		},

		convertHashtagtoLink: function (str) {
			var regexp = /(?:#[a-zA-Zㄱ-힣_]+)(?!60|27)/g;
  		str = str.replace(regexp, function (tag) {
  			var link = tag.split('#').join('');
  			var url = '/tag/' + encodeURIComponent(link);
  			return '<a href=\'' + url + '\'>' + tag + '</a>';
  		});
			return str;
		},

		capitalizeFirstLetter: function (str) {
			var string = str.toLowerCase();
    	return string.charAt(0).toUpperCase() + string.slice(1);
		},

		lowerCaseInitial: function(val) {
      return val.replace(/^([A-Z])/, function($0, $1) {
        return $1.toLowerCase();
      });
    },
    
		getWindowLocation: function () {
			return window.location;
		},

		getQueryStringParams: function (rawQueryString) {
			if (_.isUndefined(rawQueryString) && window) {
				rawQueryString = S.Utils.getWindowLocation().href;
			}

			var queryString = rawQueryString + '';
			if (!queryString.length) {
				return {};
			}
			var qi = queryString.indexOf('?');
			if (qi === -1) {
				return {};
			}
			queryString = queryString.substring(qi + 1);
			return _.reduce(queryString.split('&'), function (params, paramStr) {
				var paramPair = paramStr.split('=');
				params[paramPair[0]] = decodeURIComponent(paramPair[1]);
				return params;
			}, {});
		},

		checkPagingIndex: function(paging) {
      var result = paging || {offset: 0, limit: 10};
      if (result.offset < 0) {
        result.limit += result.offset;
        result.offset = 0;
      }
      return result;
    },

    isPositiveNumber: function (v) {
    	return _.isNumber(v) && !_.isNaN(v) && v > 0;
    },

    renderChildAtIndex: function(component, child, index, defaultInsertionEl) {

      // This method is used by list view components (e.g. InfiniteScroll and TrackList).

      if (!(component.model instanceof Backbone.Collection || component.model instanceof S.Models.SparseCollection)) {
        throw new TypeError('Component model must be a collection to render child at index');
      }

      component.addChild(child);

      // We need to make sure our new component's DOM element gets inserted in the right spot.
      // We can't do direct indexed array splicing, because there might be other
      // child components (i.e., Spinner) mixed in with our list items, or the child component
      // array might be in a jumbled order. But we can instead reference the position
      // of the component's model in the collection array, an array with a meaningful order.

      child.render(function() {
        var length = 0;
        if(component.model.length) {
          length = S.Utils.value.call(component.model, component.model.length); // Property in Backbone Collection; function in SparseCollection
        }

        var modelBefore = index > 0 ? component.model.at(index - 1) : null;
        var componentBefore = modelBefore ? component.findChildWithModel(modelBefore) : null;
        var modelAfter = index + 1 < length ? component.model.at(index + 1) : null;
        var componentAfter = modelAfter ? component.findChildWithModel(modelAfter) : null;

        if (componentAfter && componentAfter.isRendered()) {
          // Find the component corresponding to the model at the index after this new model was inserted,
          // and insert the DOM element of the new model before the DOM element of that one.
          componentAfter.$el.before(child.$el);
        } else if (componentBefore && componentBefore.isRendered()) {
          // Slightly different at the end of the list...
          componentBefore.$el.after(child.$el);
        } else {
          // No siblings to relate to
          if (defaultInsertionEl) {
            $(defaultInsertionEl).append(child.$el);
          } else {
            throw new Error('A $defaultInsertionEl wasn\'t specified while adding a child to an empty model view.');
          }
        }
      });
    },

		/**
		 * S.Utils#login(redirectUrl) -> undefined
		 * - redirectUrl (string): 되돌아갈 페이지의 주소
		 * 
		 * 로그인 페이지로 이동시킵니다.
		 * 이동 전에 로컬스토리지에 카트, 재생목록 정보를 저장해두고
		 * redirectUrl이 없는 경우 URL을 확인하여 되돌아올 페이지 값으로 넘깁니다.
		 */
		login: function (redirectUrl) {

			// 페이지 넘어가기전에 저장될 정보들 ( cart, player관련..)
			try {
				S.app.localStorage.save( true );
			}catch(e){}

			// https인 경우 http로 수정.
			if (!redirectUrl){
				redirectUrl = window.location.href.split('https://').join('http://');
			}
			
			if (S.serverInfo.get('ssl')) {
				S.Utils.goSSLLink('/account/login?url=' + S.Utils.Base64.encode(redirectUrl));
			} else {
				S.Utils.goLink('/account/login?url=' + S.Utils.Base64.encode(redirectUrl));	
			}
		},

		/**
		 * S.Utils#logout(redirectUrl) -> undefined
		 * - redirectUrl (string): 되돌아갈 페이지 주소
		 *
		 * 로그아웃 처리 함수입니다.
		 */
		logout: function (redirectUrl) {
			// if (!redirectUrl){
			// 	redirectUrl = window.location.href.split('https://').join('http://');
			// }
			// S.Utils.goLink('/account/logout?url=' + S.Utils.Base64.encode(redirectUrl));
			S.Utils.goLink('/account/logout');
		},

		/**
		 * S.Utils#getRouteURL() -> string
		 * 
		 * 현재 위치해 있는 S.Route의 URL을 반환합니다.
		 */
		getRouteURL: function () {
			return location.href.split(S.rootPath())[1];
		},

		/**
		 * S.Utils#isNoSpecialChar(str) -> boolean 
		 * - str (string): 검사할 문자열
		 * 
		 * 스페셜 캐릭터를 걸러내는 함수입니다. 한글, 영문, 숫자만 통과합니다.
		 * 플레이리스트 제목을 생성할 때 사용합니다.
		 */
		isNoSpeicialChar: function (str) {
			var regExp = /[a-zㄱ-ㅎㅏ-ㅣ가-힣0-9\_\-\,\.\s]/i;

			for(var i=0,t=str.length;i<t;i++){
				if(!regExp.test(str.charAt(i))){
					return false;
				}
			}
			return true;
		},

		/**
		 * S.Utils#escapeHtml(str) -> string
		 * - str (string): 문자열
		 *
		 * html 문자로 escape 하는 함수입니다. 
		 */
		escapeHtml: function (str) {
			return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\"/g, "&quot;");
		},
		/**
		 * S.Utils#trim(str) -> string
		 * - str (string): 문자열
		 *
		 * 앞뒤 공백을 제거합니다.
		 */
		trim: function (str) {
			return str.replace(/^\s+|\s+$/g, '');
		},

		/**
		 * S.Utils#trimAll(str) -> string
		 * - str (string): 문자열
		 * 
		 * 앞뒤 공백을 제거하고 중간에 2개 이상의 공백을 1개로 처리합니다.
		 */
		trimAll: function (str) {
			var trimStr = S.Utils.trim(str);
			return trimStr.replace(/[\s]{2,}/gi, " ");
		},

		/**
		 * S.Utils#numberFormat(n) -> string
		 * - n (number): 변환할 숫자
		 * 
		 * 입력된 숫자를 000,000 형식으로 변환하여 반환합니다.
		 */
		numberFormat: function (n) {
			n += '';
			var reg = /[^0-9]/g;
			var regN = /(-?[0-9]+)([0-9]{3})/;
			n.replace(regN, '');
			while(regN.test(n)){
				n = n.replace(regN, '$1,$2');
			}
			return n;
		},

		/**
		 * S.Utils#pad(number, length) -> string
		 * - number (number): 0이 붙을 숫자
		 * - length (number): 자릿수 
		 * 
		 * 숫자 앞에 0을 붙이는 함수입니다.
		 * S.Utils.pad(1, 2) -> 01
		 */
		pad: function (number, length) {
			var str = '' + number;
			while (str.length < length){
				str = '0' + str;
			}
			return str;
		},

		/**
		 * 이메일 유효성 검사
		 * [ S.Utils#checkEmail(email) -> string
		 * @param  {[string]} email [이메일]
		 * @return {[string]} result [결과반환]
		 */
	 	checkEmail : function (email) {

			var userEmail = email,
				result = "fail",
				filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
	
			if (userEmail.length === 0) {  // 빈값일 경우
				result = " ⇒ Please enter a valid E-mail address."; 
			} else if (userEmail.length > 40) {  // 40 length 이상일때
				result = " ⇒ Max 40 characters.";
			} else if (!filter.test(userEmail)) {  // 이메일 유효성 오류
				result = " ⇒ The E-mail does not fit the format.";
			} else {
				result = "success";
			}

			return result;
		},

		/**
		 * 이름 유효성 검사
		 * [ S.Utils#checkName(name) -> string
		 * @param  {[string]} name [이메일]
		 * @return {[string]} result [결과반환]
		 */
		checkName : function (name) {

			var result = "fail";

			if (name.length === 0) {
				result = " ⇒ Please enter a valid name.";
			} else if (name.match(/[^ㄱ-ㅎ^가-힣^a-z^A-Z^_0-9^\s]/g)) {
				result = " ⇒ The name does not fit the format.";
			} else if (name.length < 3 || name.length > 16) {
				result = " ⇒ Please enter 3 ~ 16 english or numbers.";
			} else {
				result =  "success";
			}

			return result;
		},

		/**
		 * 패스워드 유효성 검사
		 * [ S.Utils#checkPasswd(passwd) -> string
		 * @param  {[string]} passwd [패스워드]
		 * @return {[string]} result [결과반환]
		 */
		checkPasswd : function (passwd) {

			var result = "fail",
			    pattern = /^.*(((?=.*\d)(?=.*[!@#$%^&+=]).{6,20})|((?=.*\d)(?=.*[A-Z]).{6,20})|((?=.*\d)(?=.*[a-z]).{6,20})|((?=.*[a-z])(?=.*[!@#$%^&+=]).{6,20})|((?=.*[a-z])(?=.*[A-Z]).{6,20})|((?=.*[A-Z])(?=.*[!@#$%^&+=]).{6,20})).*$/;
	       
			if (passwd.length === 0) {
				result = " ⇒ Please enter a valid password.";
			} else if (passwd.length < 6 || passwd.length > 20) {
				result = " ⇒ Password 6 ~ 20 number and english combined";
			} else if (!passwd.match(pattern)) {
	            result = " ⇒ Password 6 ~ 20 number and english combined";
	        } else {
				result =  "success";
			}
			return result;
		},

		/**
		 * S.Utils#ut2date(ut, format) -> string
		 * - ut (number): 유닉스타임
		 * - format (string): optional, 변환할 포맷 eg. y년 m월 d일
		 *
		 * 유닉스타임을 date로 변환합니다.
		 */
		ut2date: function (ut, format) {
			if (typeof(format) == 'undefined'){
				format = 'y년 m월 d일';
			}
			if (!ut || ut === ''){
				return '';
			}
			ut = parseInt(ut, 10);
			var d = new Date(ut);
			var date = format.split('y').join(d.getFullYear()).split('m').join(this.pad(d.getMonth()+1, 2)).split('d').join(this.pad(d.getDate(), 2));
			var isTime = (date.split('h').length > 1) ? true : false;
			if (isTime){
				date = date.split('h').join(this.pad(d.getHours(), 2)).split('i').join(this.pad(d.getMinutes(), 2)).split('s').join(this.pad(d.getSeconds(), 2));
			}
			return date;
		},

		/**
		 * S.Utils#sec2Time(sec) -> string
		 * - second (number): 초단위 시간
		 *
		 * 입력된 시간을 분:초 형식으로 변환합니다.
		 */
		sec2Time: function (second) {
			var min = S.Utils.pad( parseInt(second/60, 10), 2 );
			var sec = S.Utils.pad( parseInt(second%60, 10), 2 );
			return min + ':' + sec;
		},

		/**
		 * S.Utils#timeConvert(time [, local]) -> string
		 * - time (number): 유닉스 타임스탬프 형식의 시간을 전달합니다.
		 * - local (number): optional, 현재 시간을 전달합니다.
		 *
		 * 몇분전, 몇초전 등을 표시하는 함수, 하루가 지나면 일반 날짜를 반환합니다.
		 */
		timeConvert: function (time, localTime) {
			var local, Hours;

			if (!Date.now) {
			  	Date.now = function() {
			    	return new Date().valueOf();
			  	};
			}

			if (!localTime) {
				local = Date.now();
			}

			time = Number(time);
			local = Number(localTime);

			if(local.toString().length > 10){
				local = Math.round(Math.abs(local/1000));
			}

			var	offset = Math.abs((local - time)),
				span   = [],
				MINUTE = 60,
				HOUR   = 3600,
				DAY    = 86400,
				WEEK   = 604800,
				MONTH  = 2629744,
				YEAR   = 31556926,
				DECADE = 315569260;

			if (offset <= MINUTE) {
				span = [ Math.round(Math.abs((local - time))), '초' ];	
			} else if (offset < (MINUTE * 60)) {
				span = [ Math.round(Math.abs(offset / MINUTE)), '분' ];
			} else if (offset < (HOUR * 24)) {
				span = [ Math.round(Math.abs(offset / HOUR)), '시간' ];
			} 

			span = span.join(' ');

			if(offset < DAY) {
				if (offset === 0) {
					return '1 초 전';
				} else {
					return span + ' 전';
				}
			}else{
				var date = new Date(time * 1000);
				var localdate = new Date(local * 1000);
				if (date.getHours()>= 13) {
					Hours = "오후 "+(date.getHours()-12);
				} else {
					Hours = "오전 "+date.getHours();
				}
				var Minutes = date.getMinutes().toString().length; //길이값을 위해 문자열 변환

				if (Minutes==1) {
					Minutes = "0" + date.getMinutes();	//한자리일경우 0을 추가	
				} else {
					Minutes = date.getMinutes();	
				}
				
				if (localdate.getFullYear() !== date.getFullYear()) {
					return date.getFullYear()+"년 "+(date.getMonth()+1)+"월 "+date.getDate()+"일";	
				} else if (localdate.getFullYear() === date.getFullYear()) {
					return (date.getMonth()+1)+"월 "+date.getDate()+"일 "+Hours+":"+Minutes;	
				} 
			}
		},

		/**
		 * S.Utils#setCookie(n, v[, days]) -> undefined
		 * - n (string): 쿠키 이름
		 * - v (string | number | boolean): 값
		 * - days (number): 유효기간
		 *
		 * 자바스크립트로 쿠키를 굽는 함수
		 */
		setCookie: function (n, v, days) {
			Cookies.set(n, v, { expires: days });
		},

		/**
		 * S.Utils#getCookie(n) -> string | object
		 * - n (string): 쿠키의 이름
		 *
		 * 쿠키의 값을 가져오는 함수
		 */
		getCookie: function (n) {
			return Cookies.get(n);
		},

		/**
		 * S.Utils#deleteCookie(n) -> undefined
		 * - n (string): 쿠키의 이름
		 * 
		 * 쿠키를 지우는 함수
		 */
		deleteCookie: function (n) {
			Cookies.remove(n);
		}
	};

	/**
	 *  @description string 문자열 인코딩 관련
	 *  @namespace
	 */
	S.Utils.Base64={
		_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(a){for(var d="",c,b,f,g,h,e,i=0,a=S.Utils.Base64._utf8_encode(a);i<a.length;)c=a.charCodeAt(i++),b=a.charCodeAt(i++),f=a.charCodeAt(i++),g=c>>2,c=(c&3)<<4|b>>4,h=(b&15)<<2|f>>6,e=f&63,isNaN(b)?h=e=64:isNaN(f)&&(e=64),d=d+this._keyStr.charAt(g)+this._keyStr.charAt(c)+this._keyStr.charAt(h)+this._keyStr.charAt(e);return d},decode:function(a){for(var d="",c,b,f,g,h,e=0,a=a.replace(/[^A-Za-z0-9\+\/\=]/g,"");e<
	a.length;)c=this._keyStr.indexOf(a.charAt(e++)),b=this._keyStr.indexOf(a.charAt(e++)),g=this._keyStr.indexOf(a.charAt(e++)),h=this._keyStr.indexOf(a.charAt(e++)),c=c<<2|b>>4,b=(b&15)<<4|g>>2,f=(g&3)<<6|h,d+=String.fromCharCode(c),g!=64&&(d+=String.fromCharCode(b)),h!=64&&(d+=String.fromCharCode(f));return d=S.Utils.Base64._utf8_decode(d)},_utf8_encode:function(a){for(var a=a.replace(/\r\n/g,"\n"),d="",c=0;c<a.length;c++){var b=a.charCodeAt(c);b<128?d+=String.fromCharCode(b):(b>127&&b<2048?d+=String.fromCharCode(b>>
	6|192):(d+=String.fromCharCode(b>>12|224),d+=String.fromCharCode(b>>6&63|128)),d+=String.fromCharCode(b&63|128))}return d},_utf8_decode:function(a){for(var d="",c=0,b=c1=c2=0;c<a.length;)b=a.charCodeAt(c),b<128?(d+=String.fromCharCode(b),c++):b>191&&b<224?(c2=a.charCodeAt(c+1),d+=String.fromCharCode((b&31)<<6|c2&63),c+=2):(c2=a.charCodeAt(c+1),c3=a.charCodeAt(c+2),d+=String.fromCharCode((b&15)<<12|(c2&63)<<6|c3&63),c+=3);return d}};


})(jQuery, window.S = window.S || {}, window.Cookies);
