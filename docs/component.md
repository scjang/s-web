# S

S는 Backbone.js, Express.js 기반의 싱글 페이지 웹 앱(SPA)입니다. 이 문서에서는 S의 주요 클래스에 대한 소개와 사용법을 설명합니다. 

## Server With Express.js

S의 서버사이드는 Express.js로 구성되어 있습니다. S의 서버사이드는 크게 세 가지 역할을 하도록 디자인 되었습니다. 

* 사용자가 웹앱에 접근할 경우 단 한번 `index.html`을 반환합니다.
* 클라이언트의 API 호출을 위임받아 대신 호출하고 결과를 클라이언트에 전달합니다.
* 크롤러 접근 시 PhantomJS를 구동시켜 크롤러에게 올바른 메타데이터를 반환합니다.

### index.html

SPA의 특성상 사용자가 웹앱에 접근했을 때 서버에서는 `index.html`을 최초 한번만 반환합니다. `index.html`은 S 클라이언트의 코어 파일들과 서비스, 믹싱, 모델 파일들을 로드하여 SPA를 구동시키는 역할을 합니다. 

스크립트의 로드는 LAB.js를 이용합니다. LAB.js는 브라우저에서 허용하는 만큼 스크립트를 병렬로 로딩하고, 모든 파일들의 로드가 끝났을 때 콜백을 실행하여 불완전한 상태에서의 웹앱 구동을 막아줍니다. 

`development` 모드에서 LAB.js가 로딩해야할 파일들의 목록은 `config/express.js`에 정의되어 있으며 `production` 모드에서는 빌드된 파일을 로딩합니다.

### Api Map & Module

클라이언트는 API 호출 시 S의 서버사이드에 위임합니다. 따라서 서버에서는 실제 API 주소가 미리 정의된 객체를 가져야 할 필요가 있습니다. 이것은 `api_map.js`에 정의하며 다음과 같이 생겼습니다.

```
module.exports = {
  createAccount: {
    url: config.api_server + '/account/create',
    method: 'POST'
  }
};
```

위의 예제에서는 `createAccount`가 정의되어 있습니다. `createAccount` 는 실제 api의 주소와 method를 가집니다. 클라이언트에서 `/api/do/createAccount`로 호출을 하게 될 경우 서버사이드에서는 정의된 url과 method의 정보를 가지고 `Request` 모듈로 호출을 한 후 결과를 클라이언트에 전달하게 됩니다.

여기서 url은 Restful을 고려하여 다음과 같이 작성할 수도 있습니다.

```
module.exports = {
  getAlbum: {
    url: config.api_server + '/albume/:id',
    method: 'GET'
  }
};
```

Api를 위임받아 처리하는 api 모듈은 `:id` 부분을 클라이언트에서 넘긴 `id` 파라미터의 값으로 변경하여 호출한 후 결과를 다시 클라이언트에 전달합니다.

### PhantomJS

S는 웹상의 각종 봇들의 크롤링에 대응하기 위해 미리 빌드된 PhantomeJS를 설치합니다. 사용자는 `User-Agent`를 확인하여 경우에 따라서 PhantomJS를 구동시킬 수 있습니다. PhantomJS는 서버에서 브라우저를 동작시켜 자바스크립트로 랜더링 된 결과물을 봇에게 제공합니다. 따라서 메타의 동적인 생성도 모두 클라이언트의 컴포넌트에서 제어를 하면 됩니다.

## Client With Backbone.js

S의 클라이언트는 Backbone.js의 Klass 패턴을 사용합니다.

### S.Models

### S.Components' Naming Rules

### S.Components

## Build With Gulp.js
