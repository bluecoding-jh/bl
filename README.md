##  BL GRID 💨
***
### 그리드 생성 방법

#### html
```html
<div id="grid"></div>
```

#### x-javascript
생성자 합수를 통해 인스턴스를 생성 한다.
```x-javascript
// id: String ->   ELEMENT ID
// columns: Array<Object>
// data: Array<Object>
// config: Object
// eventHandler: Object

const grid = new BL.Lib.Grid("grid", columns, data, config, eventHandler);
```

##### > 컬럼 정의
```x-javascript
const columns = [{
  // 컬럼 id
  id: 'seq',
  // 데이터 맵핑 key
  field: 'seq',
  // 그리드 컬럼에 출력될 헤더
  caption: 'SEQ',
  // 캡션의 출력값을 변경하기 위한 함수
  captionFormatter: function(caption_value) {
    return `<span>${caption_value} 포맷 변경</span>`;
  },
  // 셀 편집 기능
  edit: {
    // (boolean) true, false
    show: true, 
    // (String) input, select, radio(미개발), checkbox(미개발)
    type: 'select', 
    // (Array<String>) type 이 select 인 경우 필수 값
    options: ['a', 'b', 'c', 'd'],
  }
  // 출력 값을 변경하기 위한 함수
  foramtter: function(value, row_index, rowDataObj) {
    // 전달 받은 값을 용도에 맞게 변환
    return value + 1;
  },
  // 컬럼의 넓이값이 지정
  // 100, '20%', '*'
  width: 100,
  // 하위 컬럼 배열
  children: [],
  // 컬럼 지정 클래스
  className: 'seq_class',
}, ...];
```

##### > 옵션 정의
```x-javascript
const config = {

  // (String) 'default', 'clean', 'dark' 
  // ❌ 미개발 상태
  theme: 'default', 
  
  // (String) 'checkbox', 'no', 'both', 'none'
  // Row 헤더 타입 설정
  rowHeader: 'no',
  
  // (boolean) true, false
  // 헤더 영역에 자식 요소를 가지고 있는 헤더 셀 접기,펼치기 기능
  headerGroupFold: true, 

  // (String) 'client', 'server', 'none'
  // 페이징 기능
  // ❌ server 미개발 상태
  paging: 'client', 

  // paging 기능이 server일때 사용될 옵션
  // 현재 paging server 미개발로 사용되지 않음
  server: {
    url: url,
    param: {},
    type: 'GET',
  }, // paging : server 일때 (Object)

  // (boolean) true, false
  // infiniteScroll이 false 일 경우에도 data의 길이가 300 이상이라면 true 로 변경됨
  infiniteScroll: false,  

  // (boolean) true, false
  sort: true, 

  // (List<Number>) 
  // 페이징 사용시 페이지당 출력될 데이터 개수 선택 옵션 값
  viewCount: [10, 20, 30, 50, 100], 

  // function
  // 인스턴스 생성 후 실행할 함수
  loadCallback: function(instance) {
    // do something...
  },

  // (Number) index
  // 열 고정 기능
  freeze: 0, 

  // (Number) index
  // header 셀의 높이 지정 값
  // default 33px
  columnHeaderHeight: 50,
};
```
##### > Event Handler 정의
```x-javascript
const eventHandler = {
  // 행 클릭 이벤트
  rowClick: function (selectData, dataArray, instance) {
    // do something...
  },
  // 행 더블클릭 이벤트
  rowDblClick: function (selectData, dataArray, instance) {
    // do something...
  },
};
```
