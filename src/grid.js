import Commons from './commons';
import _ from 'lodash';
import saveAs from 'file-saver';
import * as XLSX from 'xlsx';

function Grid(id, columns, data, config = {
  theme: 'default', // (String) 'default', 'clean', 'dark' 
  rowHeader: 'none', // (String) 'checkbox', 'no', 'both', 'none',
  headerGroupFold: false, //(boolean) true, false
  paging: 'none', //(String) 'client', 'server', 'none'
  infiniteScroll: false, // (boolean) true, false ||| infiniteScroll이 false 일 경우에도 data의 길이가 300 이상이라면 true 로 변경됨
  sort: false, // (boolean) true, false
  viewCount: [10, 20, 30, 50, 100], // (List) Number.. 
  freeze: 0,
  columnHeaderHeight: 33,
}, eventHandler) {

  if (config.freeze > 0) {
    config.rowHeader = 'none';
  }
  let resizeEvent = null;
  const
    common = Commons,
    option = {
      theme: config.theme,
      childrenDepth: 0,
      columns: null,
      freezeColumns: [],
      data: null,
      rowHeight: 33,
      cornerHeaderWidth: config.hasOwnProperty('rowHeader') && config.rowHeader !== 'none' ? (config.rowHeader === 'both' ? 100 : 50) : 0,
      dataFields: {},
      dataFieldsViewCount: 0,
      verticalScrollChecked: 0,
      horizontalScrollChecked: 0,
      contentHeight: 0,
      contentWidth: 0,
      columnHeaderHeight: config.columnHeaderHeight || 33,
    },
    control = {
      left: 0,
      top: 0,
      mouseStart: 0,
      mouseMovingValue: 0,
      targetColumn: null,
      viewerDataCount: 0,
      startDataIdx: 0,
      endDataIdx: 0,
      _data: {},
      paging: {},
      sorting: [],
    },
    temp = {
      allSelectedRows: false,
      selectedRows: [],
      selectedRowIdx: undefined,
      tempScroll: 0,
    };


  this._dom = (function (id) {
    if (id.indexOf('#') !== -1) {
      throw new Error('grid를 생성할 ID값은 "#" 이 없어야 합니다.');
    }
    return document.getElementById(id);
  })(id);

  this._dataSource = {};

  this.getOption = function () {
    return option;
  }
  this.setOption = function (obj, bool) {
    for (let key in obj) {
      option[key] = obj[key];
    }

    if (bool) {
      this.refresh();
    }
  }

  this.getControl = function () {
    return control;
  }
  this.setControl = function (obj) {
    for (let key in obj) {
      control[key] = obj[key];
    }
  }

  this.getTemp = function () {
    return temp;
  }
  this.setTemp = function (obj) {
    for (let key in obj) {
      temp[key] = obj[key];
    }
  }

  Object.defineProperty(this._dataSource, 'config', {
    value: config,
    writable: false,
  });

  Object.defineProperty(this._dataSource, 'columns', {
    value: columns,
    writable: false,
  });

  Object.defineProperty(this._dataSource, 'eventHandler', {
    value: eventHandler,
    writable: false,
  });

  if (this._dataSource.config.hasOwnProperty('paging') && this._dataSource.config.paging === 'server') {
    console.log('Server side paging');
    throw new Error('현재 server side 기능은 지원하지 않습니다.\nclient side 로 수정해주세요.');
    this.getApiData();
  } else {
    Object.defineProperty(this._dataSource, 'data', {
      value: data,
      writable: false,
    });


    option.columns = common.Functions.cloneDeep(this._dataSource.columns);
    option.data = common.Functions.cloneDeep(this._dataSource.data);

    if (config.freeze) {
      for (let i = 0; i < config.freeze; i++) {
        option.columns[0]['freezeChk'] = true;
        option.freezeColumns.push(option.columns[0]);
        option.columns.splice(0, 1);
      }
      option.columns.map(c => c['freezeChk'] = false);
    }

    this.init(undefined, common);
  }

  window.addEventListener('resize', () => {
    clearTimeout(resizeEvent);
    resizeEvent = setTimeout(() => {
      this.init('reload', common);
    }, 250)
  });
}

Grid.prototype.reset = function () {
  const opt = {
    childrenDepth: 0,
    columns: Commons.Functions.cloneDeep(this._dataSource.columns),
    data: Commons.Functions.cloneDeep(this._dataSource.data),
    freezeColumns: [],
    rowHeight: 33,
    dataFields: {},
    dataFieldsViewCount: 0,
    verticalScrollChecked: 0,
    horizontalScrollChecked: 0,
    contentHeight: 0,
    contentWidth: 0,
    columnHeaderHeight: this._dataSource.config.columnHeaderHeight || 33,
  };

  if (this._dataSource.config.freeze) {
    for (let i = 0; i < this._dataSource.config.freeze; i++) {
      opt.columns[0]['freezeChk'] = true;
      opt.freezeColumns.push(opt.columns[0]);
      opt.columns.splice(0, 1);
    }
    opt.columns.map(c => c['freezeChk'] = false);
  }

  this.setOption(opt);
  this.setControl({
    left: 0,
    top: 0,
    mouseStart: 0,
    mouseMovingValue: 0,
    targetColumn: null,
    viewerDataCount: 0,
    startDataIdx: 0,
    endDataIdx: 0,
    _data: {},
    paging: {},
    sorting: [],
  });
  this.setTemp({
    allSelectedRows: false,
    selectedRows: [],
    selectedRowIdx: undefined,
    tempScroll: 0,
  })
}

Grid.prototype.getData = function () {
  return this.getOption().data;
}

Grid.prototype.getApiData = function () {
  const
    xhr = new XMLHttpRequest(),
    method = this._dataSource.config.server.type,
    url = this._dataSource.config.server.url,
    param = this._dataSource.config.server.param,
    _this = this;

  xhr.open(method, url);
  xhr.onreadystatechange = function (event) {
    const {
      target
    } = event;

    if (target.readyState === XMLHttpRequest.DONE) {
      const {
        status
      } = target;
      if (status === 0 || (status >= 200 && status < 400)) {
        // 정상적으로 처리 되었을 경우
        _this.option.columns = Common.Functions.cloneDeep(_this._dataSource.columns);
        _this.option.data = Common.Functions.cloneDeep(_this._dataSource.data);
        _this.init();
      }
      // else {
      //   // 에러 발생
      //   _this.control.paging.min = 1;
      //   _this.control.paging.max = 10;

      //   _this._dataSource['data'] = data;
      //   _this.option.columns = common.Functions.cloneDeep(_this._dataSource.columns);
      //   _this.option.data = common.Functions.cloneDeep(_this._dataSource.data);
      //   _this.init();
      // }
    }
  }

  xhr.send(param);
}

Grid.prototype.changeColumns = function (newColumns, data) {
  const columns = this._dataSource.columns;
  const option = this.getOption();
  columns.length = 0;
  newColumns.map(c => {
    columns.push(c);
  });

  option.columns = Commons.Functions.cloneDeep(newColumns);

  if (this._dataSource.config.freeze) {
    option.freezeColumns = [];
    for (let i = 0; i < this._dataSource.config.freeze; i++) {
      option.columns[0]['freezeChk'] = true;
      option.freezeColumns.push(option.columns[0]);
      option.columns.splice(0, 1);
    }
    option.columns.map(c => c['freezeChk'] = false);
  }

  this.changeData(data, null);
}

Grid.prototype.changeData = function (data, loadType) {
  const targetData = this._dataSource.data;
  loadType = loadType === undefined ? 'reload' : loadType;
  targetData.length = 0;
  data.map(function (d) {
    targetData.push(d);
  });
  delete this.getControl().dataEndCheck;
  this.getOption().data = Commons.Functions.cloneDeep(data);
  this.init(loadType);
}

Grid.prototype.init = function (type, common) {
  console.log('BLUEMANIA GRID START💥');
  common = common || Commons;

  const
    _this = this,
    _id = common.Functions.uuidv4('xxxxxxx'),
    option = this.getOption(),
    control = this.getControl(),
    temp = this.getTemp(),
    freeze = _this._dataSource.config.freeze;

  let
    tempScroll = temp.tempScroll,
    allSelectedRows = temp.allSelectedRows,
    selectedRows = temp.selectedRows,
    selectedRowIdx = temp.selectedRowIdx;

  set(type);

  function set(type) {
    const pagingCheck = _this._dataSource.config.hasOwnProperty('paging') && _this._dataSource.config.paging !== 'none' ? true : false;

    let
      idx = undefined,
      leng = undefined;

    // 초기화
    _this._dom.innerHTML = '';
    option.dataFields = {};

    if (!type) {

      // default columns
      calcChildrenDepth();
      columnsWidthCheck();

      // freeze columns
      if (freeze) {
        calcChildrenDepth(option.freezeColumns);
        columnsWidthCheck(option.freezeColumns);
      }
      option.childrenDepth = setColumnDepth();

      if (!pagingCheck && (_this._dataSource.config.infiniteScroll || _this._dataSource.data.length > 300)) {
        if (!_this._dataSource.config.hasOwnProperty('infiniteScroll') || !_this._dataSource.config.infiniteScroll) {
          _this._dataSource.config['infiniteScroll'] = true;
        }
        option.data.length = 100;
      } else {
        _this._dataSource.config['infiniteScroll'] = false;
      }
    } else {
      // 재로드 
      // type 종류 : reload, paging, paging2(페이지 ROW 카운트 변경)...
      tempScroll = 0;
      for (let key in option.dataFields) {
        option.dataFields[key].show = false;
      }
      switch (type) {
        case 'reload':
          idx = control.startDataIdx;
          leng = control.endDataIdx;
          break;
        case 'paging':
          idx = control.paging.current * control.viewerDataCount;
          leng = idx + control.viewerDataCount - 1;

          control.startDataIdx = idx;
          control.endDataIdx = leng;
          break;
        case 'paging2':
          idx = 0;
          leng = control.viewerDataCount > control.viewerRowCount ? control.viewerRowCount : control.viewerDataCount - 1;
          control.paging.current = 0;
          control.top = 0;
          break;
        case 'sorting':
          let count = 0;
          option.data = sortingData();

          if (pagingCheck) {
            idx = control.paging.current * control.viewerDataCount;
            leng = idx + control.viewerDataCount;

            control.startDataIdx = idx;
            control.endDataIdx = leng;
          } else {
            idx = control.startDataIdx;
            leng = control.endDataIdx;
          }

          if (_this._dataSource.config.infiniteScroll) {
            count = option.data.length;
          }
          if (count !== 0) {
            option.data.length = count;
          }
          break;
      }
    }

    const _paging = _this.paging(pagingCheck, _id, option, control);

    option.dataFieldsViewCount = 0;
    option.contentHeight = pagingCheck ? option.rowHeight * control.viewerDataCount : option.rowHeight * option.data.length;
    option.verticalScrollChecked = checkedVerticalScroll(_this._dom.clientHeight - (pagingCheck ? 50 : 0) - (option.columnHeaderHeight * option.childrenDepth));

    _this._dom.setAttribute('tabindex', '1');

    _this._dom.innerHTML = `
      <div class="bl-grid-wrap bl-grid-theme-${option.theme}" id="${'bl-grid-'+_id}" role="grid" style="height:${pagingCheck ? _this._dom.clientHeight-50 : _this._dom.clientHeight}px;">
        <div class="bl-grid-container">
            ${setCornerHeader()}
            ${setColumnHeaders()}
            ${setRowHeader(idx, leng, pagingCheck)}
            ${setViewer(idx, leng, pagingCheck)}
            ${setScroll('horizontal', pagingCheck)}
            ${setScroll('vertical', pagingCheck)}
        </div>
        <div id="bl-grid-resize-${_id}"></div>
        ${_paging}
      </div>`;
    setScrollPosition();
    setDefaultEvent(pagingCheck);

    document.querySelector(`#bl-grid-column-header-${_id}`).querySelectorAll('input, select, button').forEach(item => {
      item.setAttribute('tabIndex', '-1');
    })

    if (_this._dataSource.config.hasOwnProperty('loadCallback')) {
      _this._dataSource.config.loadCallback(_this);
    }
  }

  function columnsWidthCheck(columns) {
    columns = columns || option.columns;
    const wd = 80;
    columns.map(c => {
      if (c.hasOwnProperty('children') && c.children.length > 0) {
        if (c.hasOwnProperty('width') && typeof c.width === 'number' && c.width < (c.children.length * wd)) {
          //delete c.width;
          c.width = '*';
        }
      }
    })
  }

  function calcChildrenDepth(arr, parent, freezeChk) {
    arr = arr || option.columns;
    let parentAddCountChk = false;

    for (let i = 0; i < arr.length; i++) {
      if (!arr[i].hasOwnProperty('childrenDepthCount')) {
        arr[i]['childrenDepthCount'] = 0;
      }

      if (parent) {
        arr[i]['parent'] = parent;
        arr[i]['freezeChk'] = freezeChk;
      }

      if (arr[i].hasOwnProperty('children') && arr[i].children.length > 0) {
        if (_this._dataSource.config.hasOwnProperty('headerGroupFold')) {
          arr[i]['fold'] = _this._dataSource.config.headerGroupFold;
        }
        arr[i].childrenDepthCount += 1;
        calcChildrenDepth(arr[i].children, arr[i], arr[i].hasOwnProperty('freezeChk') && arr[i].freezeChk)
        if (parent != undefined && !parentAddCountChk) {
          parent.childrenDepthCount += 1;
          parentAddCountChk = true;
        }
      }
    }
  }

  function setColumnDepth() {
    if (freeze) {
      return option.freezeColumns.concat(option.columns).reduce((prev, current) => {
        return prev.childrenDepthCount > current.childrenDepthCount ? prev : current;
      }).childrenDepthCount + 1
    } else {
      return option.columns.reduce((prev, current) => {
        return prev.childrenDepthCount > current.childrenDepthCount ? prev : current;
      }).childrenDepthCount + 1
    }
  }

  function checkedVerticalScroll(value) {
    return value > (_this._dataSource.config.hasOwnProperty('paging') && _this._dataSource.config.paging !== 'none' ?
      control.viewerDataCount * option.rowHeight : option.data.length * option.rowHeight) ? 0 : 18;
  }

  function checkedHorizontalScroll(v, v1) {
    return v < v1 ? 0 : 18;
  }

  function setContentWidth(freezeCheckBool) {
    let wd = 0;
    for (let key in option.dataFields) {
      if (!option.dataFields[key].show) {
        continue;
      }
      if (freeze) {
        if (freezeCheckBool && option.dataFields[key].freezeChk) {
          wd += option.dataFields[key].width;
        }
        if (!freezeCheckBool && !option.dataFields[key].freezeChk) {
          wd += option.dataFields[key].width;
        }
      } else {
        wd += option.dataFields[key].width;
      }
    }
    return wd;
  }

  function setCornerHeader() {
    let tmpl = '';

    if (!_this._dataSource.config.hasOwnProperty('rowHeader')) {
      _this._dataSource.config['rowHeader'] = 'none';
    }
    if (_this._dataSource.config.rowHeader !== 'none') {

      tmpl = `<div class="bl-grid-corner-header" id="bl-grid-corner-header-${_id}" style="position:absolute;left:0;top:0;width:${option.cornerHeaderWidth}px;height:${option.columnHeaderHeight * option.childrenDepth}px;">
              <div class="bl-grid-corner-header-inner" id="bl-grid-corner-header-inner-${_id}" style="position:relative;width:${option.cornerHeaderWidth}px;height:${option.columnHeaderHeight * option.childrenDepth}px;">
                  ${getCornerHeaderCell()}
              </div>
            </div>`;

    } else if (freeze) {

      const connerHeaderContent = setColumnHeader('', option.freezeColumns);
      option.cornerHeaderWidth = setContentWidth(true);

      tmpl = `<div 
                class="bl-grid-corner-header freezing"
                id="bl-grid-corner-header-${_id}"
                style="position:absolute;left:0;top:0;width:${option.cornerHeaderWidth}px;height:${option.columnHeaderHeight * option.childrenDepth}px;"
              >
                <div
                  class="bl-grid-corner-header-inner"
                  id="bl-grid-corner-header-inner-${_id}"
                  style="position:relative;width:${option.cornerHeaderWidth}px;height:${option.columnHeaderHeight * option.childrenDepth}px;"
                >
                    ${connerHeaderContent}
                </div>
            </div>`;

    }

    function getCornerHeaderCell() {
      let tmpl = '';
      switch (_this._dataSource.config.rowHeader) {
        case 'checkbox':
          tmpl = `<div class="bl-grid-corner-header-cell bl-grid-cell-border bl-grid-cell-border" style="width:100%;height:100%">
                  <input type="checkbox" id="bl-corner-select-${_id}" class="center-align center-valign" ${allSelectedRows ? 'checked' : ''}>
                  </div>`;
          break;
        case 'no':
          tmpl = `<div class="bl-grid-corner-header-cell bl-grid-cell-border bl-grid-cell-border" style="width:100%;height:100%;">
                    <div class="center-align center-valign">No.</div>
                  </div>`;
          break;
        case 'both':
          tmpl = `<div class="bl-grid-corner-header-cell bl-grid-cell-border bl-grid-cell-border" style="width:50%;height:100%;position:absolute;left:0;">
                    <input type="checkbox" id="bl-corner-select-${_id}" class="center-align center-valign" ${allSelectedRows ? 'checked' : ''}>
                  </div>
                  <div class="bl-grid-corner-header-cell bl-grid-cell-border bl-grid-cell-border" style="width:50%;height:100%;position:absolute;left:50px;">
                    <div class="center-align center-valign">No.</div>
                  </div>`;
          break;
        default:
          tmpl = `<div class="bl-grid-corner-header-cell bl-grid-cell-border bl-grid-cell-border" style="width:100%;height:100%;"></div>`
          break;
      }
      return tmpl;
    }

    return tmpl;
  }

  function setRowHeader(idx, leng, pagingCheck) {
    let
      _height = _this._dom.clientHeight - (option.columnHeaderHeight * option.childrenDepth) - option.horizontalScrollChecked - (pagingCheck ? 50 : 0),
      tmpl = '';

    control.viewerRowCount = Math.ceil(_height / option.rowHeight);

    idx = idx == undefined ? 0 : idx;
    leng = leng == undefined ? control.viewerRowCount : leng;

    if (_this._dataSource.config.rowHeader !== 'none') {
      tmpl = `<div class="bl-grid-row-header" id="bl-grid-row-header-${_id}"
            style="position:absolute;left:0px;top:${option.columnHeaderHeight * option.childrenDepth}px;width:${option.cornerHeaderWidth}px;height:${_height}px;overflow:hidden;">
            <div class="bl-grid-row-header-inner" id="bl-grid-row-header-inner-${_id}" style="position:relative;width:${option.cornerHeaderWidth}px;height:${_height}px;transform:translate3d(0px, 0px, 0px);">
            ${setRowHeaderCell(idx, leng, pagingCheck)}
            </div>
            </div>`;
    } else if (freeze) {
      tmpl = `<div class="bl-grid-row-header freezing" id="bl-grid-row-header-${_id}"
            style="position:absolute;left:0px;top:${option.columnHeaderHeight * option.childrenDepth}px;width:${option.cornerHeaderWidth}px;height:${_height}px;overflow:hidden;">
            <div class="bl-grid-row-header-inner" id="bl-grid-row-header-inner-${_id}" style="position:relative;width:${option.cornerHeaderWidth}px;height:${_height}px;transform:translate3d(0px, 0px, 0px);">
            ${setData(idx, leng, pagingCheck, true)}
            </div>
            </div>`;
    }

    return tmpl;
  }

  function setRowHeaderCell(idx, leng, pagingCheck) {
    let
      tmpl = '',
      no = 0;

    for (let i = idx; i < leng; i++) {

      if (document.querySelector(`#bl-grid-row-header-${_id} .bl-grid-row-header[data-row-idx='${i}']`)) {
        continue;
      }
      let chk = false;

      no = pagingCheck ? i - (control.paging.current * control.viewerDataCount) : i;

      if (option.data[i]) {
        if (allSelectedRows) {
          chk = true;
        } else {
          if (selectedRows.indexOf(String(i)) !== -1) {
            chk = true;
          }
        }
        if (_this._dataSource.config.rowHeader === 'checkbox') {
          tmpl += `<div class="bl-grid-row-header ${chk ? 'row-select-chk' : ''}" data-row-idx="${i}" role="row" style="position:absolute;top:${no*option.rowHeight}px;width:${option.cornerHeaderWidth}px;height:${option.rowHeight}px;">
                  <div class="bl-grid-row-header-cell bl-grid-cell-border"><input type="checkbox" class="bl-grid-row-header-select" ${chk ? 'checked' : ''} data-idx="${i}" /></div></div>`;
        } else if (_this._dataSource.config.rowHeader === 'both') {
          tmpl += `<div class="bl-grid-row-header ${chk ? 'row-select-chk' : ''}" data-row-idx="${i}" role="row" style="position:absolute;top:${no*option.rowHeight}px;width:${option.cornerHeaderWidth}px;height:${option.rowHeight}px;">
                    <div class="bl-grid-row-header-cell bl-grid-cell-border" style="width:50%;height:100%;position:absolute;left:0;">
                      <input type="checkbox" class="bl-grid-row-header-select" ${chk ? 'checked' : ''} data-idx="${i}" />
                    </div>
                    <div class="bl-grid-row-header-cell bl-grid-cell-border" style="width:50%;height:100%;position:absolute;left:50px;">
                      <div class="center-align center-valign">${i+1}</div>
                    </div>
                  </div>`;
        } else {
          tmpl += `<div class="bl-grid-row-header" data-row-idx="${i}" role="row" style="position:absolute;top:${no*option.rowHeight}px;width:${option.cornerHeaderWidth}px;height:${option.rowHeight}px;">
                  <div class="bl-grid-row-header-cell bl-grid-cell-border"><div class="center-align center-valign">${i+1}</div></div></div>`;
        }
        no += 1;
      } else {
        continue;
      }
    }
    return tmpl
  }

  function setViewer(idx, leng, pagingCheck) {
    let _height = _this._dom.clientHeight - (option.columnHeaderHeight * option.childrenDepth) - option.horizontalScrollChecked - (pagingCheck ? 50 : 0);

    idx = idx == undefined ? 0 : idx;
    leng = leng == undefined ? control.viewerRowCount : leng;
    control.startDataIdx = idx;
    control.endDataIdx = leng;

    return `<div class="bl-grid-viewer" id="bl-grid-viewer-${_id}" style="position:absolute;left:${option.cornerHeaderWidth}px;top:${option.columnHeaderHeight*option.childrenDepth}px;width:${_this._dom.clientWidth - option.cornerHeaderWidth - option.verticalScrollChecked}px;height:${_height}px;overflow:hidden;">
             <div 
              class="bl-grid-viewer-inner"
              id="bl-grid-viewer-inner-${_id}"
              style="position:relative;width:${option.contentWidth}px;height:${_height}px;transform:translate3d(0px, 0px, 0px);"
            >
                ${setData(idx, leng, pagingCheck, false)}
              </div>
            </div>`;
  }

  function setData(idx, leng, pagingCheck, rowHeaderChk) {
    let
      tmpl = '',
      no = 0;
    for (let i = idx; i < leng; i++) {
      if (rowHeaderChk) {
        if (document.querySelector(`#bl-grid-row-header-${_id} .bl-grid-row[data-row-idx='${i}']`)) {
          continue;
        }
      } else {
        if (document.querySelector(`#bl-grid-viewer-${_id} .bl-grid-row[data-row-idx='${i}']`)) {
          continue;
        }
      }
      console.log(`🐱‍🚀 create row ${i} / start : ${idx} / end : ${leng} / diff : ${idx - leng}`)
      let chk = false;
      no = pagingCheck ? i - (control.paging.current * control.viewerDataCount) : i;
      no = no < 0 ? 0 : no;
      if (option.data[i]) {
        if (allSelectedRows) {
          chk = true;
        } else {
          if (selectedRows.indexOf(String(i)) !== -1) {
            chk = true;
          }
        }

        tmpl += `<div
                  class="bl-grid-row r${no}${no % 2 > 0 ? ' even' : ' odd'}${chk ? ' row-select-chk' : ''}${selectedRowIdx === i ? ' row-select' : ''}" 
                  data-row-idx="${i}"
                  id="bl-grid-row${no}-${_id}${rowHeaderChk ? '-rh' : ''}"
                  role="row"
                  style="width:100%;position:absolute;height:${option.rowHeight}px;top:${option.rowHeight * no}px"
                >`;
        tmpl = `${setDataCol(tmpl, option.data[i], i, rowHeaderChk)}`;
        tmpl += '</div>';
        //no += 1;
      } else {
        control['dataEndCheck'] = i;
        break;
      }
    }

    function setDataCol(tmpl, data, idx, rowHeaderChk) {
      let _left = 0;
      //let freeFieldCount = Object.keys(option.dataFields).length;
      let freezeFieldCount = 0;
      const _field = {};
      let colIdx = 0;

      for (let k in option.dataFields) {
        option.dataFields[k].freezeChk && freezeFieldCount++;
      }

      for (let key in option.dataFields) {
        if (option.dataFields[key].show) {
          if (rowHeaderChk) {
            if (option.dataFields[key].freezeChk) {
              _field[key] = option.dataFields[key];
            }
          } else {
            if (!option.dataFields[key].freezeChk) {
              _field[Number(key) - freezeFieldCount] = option.dataFields[key];
            }
          }
        }
      }

      for (let key2 in _field) {
        const
          //key = rowHeaderChk ? Number(key2) : Number(key2) - freeze,
          key = Number(key2),
          prevKey = key - 1 < 0 ? undefined : key - 1,
          left = prevKey != undefined ? _left + _field[prevKey].width : 0;

        if (_field[key].hasOwnProperty('edit') && _field[key].edit) {
          tmpl += `<div class="bl-grid-cell bl-grid-cell-border cell${key} ${_field[key2].className ? _field[key2].className : ''}" data-column="${_field[key].name}" style="position:absolute;left:${left}px;width:${_field[key].width}px;height:${option.rowHeight}px;">
                    <div class="${_field[key].align} center-valign" style="width:100%;height:100%;padding:0.25rem;">
                    ${getCellEdit(_field[key].edit, idx, _field[key].name, data[_field[key].name], colIdx)}
                    </div>
              </div>`;
          colIdx++;
        } else {
          tmpl += `<div class="bl-grid-cell bl-grid-cell-border cell${key} ${_field[key2].className ? _field[key2].className : ''}" data-column="${_field[key].name}" style="position:absolute;left:${left}px;width:${_field[key].width}px;height:${option.rowHeight}px;">
                    <div class="${_field[key].align} center-valign" style="width:calc(100% - 10px);">
                    ${_field[key].hasOwnProperty('formatter') && _field[key].formatter ?  _field[key].formatter(data[_field[key].name], idx, data) : data[_field[key].name] || ''}
                    </div>
              </div>`;
        }
        _left = left;
      }

      function getCellEdit(edit, idx, nm, data, colIdx) {
        let editTmpl = '';
        const type = edit.type;
        switch (type) {
          case 'input':
            editTmpl = `<input
                          type="text"
                          class="bl-grid-edit-cell"
                          name="${nm}"
                          data-edit-type="${type}"
                          data-idx="${idx}"
                          data-col-idx="${colIdx}"
                          data-key=${nm}
                          style="width:100%;height:100%;border:0;"
                          ${data ? 'value="'+data+'"' : '' }
                        >`;
            break;
          case 'select':
            if (!edit.hasOwnProperty('options') || edit.options.length < 1) {
              throw new Error(`Edit 셀 생성 타입이 Select 인 경우 options / Array<String> 값이 필수 입니다.`);
            }
            editTmpl = `<select
                          class="bl-grid-edit-cell"
                          name="${nm}"
                          data-edit-type="${type}"
                          data-idx="${idx}"
                          data-col-idx="${colIdx}"
                          data-key=${nm}
                          style="width:100%;height:100%;border:0;">
                          ${edit.options.map(opt => {
                            return '<option value="'+ opt +'" '+ (opt === data ? 'selected' : '') +'>'+opt+'</option>';
                          }).join('')}
                          </select>`
            break;
        }

        return editTmpl;
      }

      option.editColumnCount = colIdx - 1;
      return tmpl;
    }

    return tmpl;
  }

  function setColumnHeaders() {

    const headerContent = setColumnHeader('', option.columns);

    option.contentWidth = setContentWidth();
    option.horizontalScrollChecked = checkedHorizontalScroll(option.contentWidth, _this._dom.clientWidth - option.cornerHeaderWidth);

    return `<div class="bl-grid-column-header" id="bl-grid-column-header-${_id}" 
            style="position:absolute;top:0;left:${option.cornerHeaderWidth}px;width:${_this._dom.clientWidth - option.cornerHeaderWidth - option.verticalScrollChecked}px;height:${option.columnHeaderHeight*option.childrenDepth}px;overflow:hidden;">
            <div id="bl-grid-column-header-inner-${_id}" style="position:relative;width:${option.contentWidth}px;height:${option.columnHeaderHeight*option.childrenDepth}px;transform:translate3d(0px, 0px, 0px)">
              <div
                style="height:${option.columnHeaderHeight*option.childrenDepth}px;"
                >
                ${headerContent}
              </div>
            </div>
          </div>`;
  }

  function setColumnHeader(tmpl, cols, parentId, depth, parentObj) {
    if (cols.length < 1) {
      throw new Error('column 데이터가 존재하지 않습니다.');
    }
    depth = depth == undefined ? 0 : depth;

    for (let i = 0; i < cols.length; i++) {

      const chk = cols[i].hasOwnProperty('children') && cols[i].children.length > 0; // 자식요소 있는지 체크

      let
        _width = calcWidth(cols[i], depth, parentObj),
        _height = calcHeight(cols[i], depth),
        _left = calcPositionLeft(cols[i], cols[i - 1], i),
        _top = calcPositionTop(cols[i], depth, cols[i - 1], parentObj),
        _align = cols[i].hasOwnProperty('align') ?
        (cols[i].align === 'left' ? 'left-align' : cols[i].align === 'right' ? 'right-align' : 'center-align') : 'center-align',
        sortingChk = null,
        captionFormatterChk = cols[i].hasOwnProperty('captionFormatter');

      if (_this._dataSource.config.hasOwnProperty('sort') && _this._dataSource.config.sort) {
        if (control.sorting.length > 0 && cols[i].field === control.sorting[0]) {
          sortingChk = control.sorting[1]
        } else {
          sortingChk = 'none';
        }
      } else {
        sortingChk = '';
      }

      if (!chk) {
        const sortingBtn = sortingChk !== '' && sortingChk !== 'none' ? `<span class="bl-grid-column-sorting${sortingChk === 'asc' ? ' bl-grid-column-sorting-asc' : ' bl-grid-column-sorting-desc'}"></span>` : '';
        tmpl += `<div class="bl-grid-cell
                            bl-grid-column-header-cell
                            bl-grid-cell-border
                            ${'col'+i}
                            ${(cols[i].hasOwnProperty('className') && cols[i].className !== '') ? cols[i].className : ''}
                            ${(cols[i].hasOwnProperty('children') && cols[i].children.length > 0) ? 'bl-grid-header-group-cell' : ''}
                            ${captionFormatterChk ? 'custom-col-header-cell' : ''}"
          data-col="${cols[i].field}"
          data-col-group="${parentId || ''}"
          data-col-depth="${depth}"
          ${sortingChk !== '' ? `data-sort="${sortingChk}"` : ''}
          style="width:${_width}px;height:${_height}px;position:absolute;left:${_left}px;top:${_top}px;"
        >
          <div class="${_align} center-valign" style="width:calc(100% - 10px);">
            ${cols[i].hasOwnProperty('captionFormatter') ? cols[i].captionFormatter(cols[i].caption) + sortingBtn : `${sortingBtn} <span>${cols[i].caption}</span>`}
          </div>
        </div>`;
        option.dataFields[option.dataFieldsViewCount] = {
          name: cols[i].field,
          width: _width,
          left: _left,
          formatter: cols[i].formatter,
          show: true,
          className: cols[i].className,
          align: _align,
          freezeChk: cols[i].freezeChk,
          edit: cols[i].edit,
        };
        option.dataFieldsViewCount += 1;
      } else {
        const
          children = cols[i].hasOwnProperty('fold') && cols[i].fold ? [cols[i].children[0]] : cols[i].children,
          childTmpl = setColumnHeader('', children, cols[i].id, (depth + 1), cols[i]),
          toggleBtn = cols[i].children.length > 1 ? `<span class="bl-grid-column-header-toggle ${!cols[i].fold ? 'open' : ''} ${cols[i].freezeChk ? 'freezing' : ''}" data-col="${cols[i].field}"></span>` : '';
        tmpl += `<div style="width:${_width}px;height:${_height}px;position:absolute;left:${_left}px;top:${_top}px;">
                  <div class="bl-grid-cell bl-grid-column-header-cell bl-grid-cell-border ${'col'+i} ${(cols[i].hasOwnProperty('className') && cols[i].className !== '') ? cols[i].className : ''} ${(cols[i].hasOwnProperty('children') && cols[i].children.length > 0) ? 'bl-grid-header-group-cell' : ''}" 
                  data-col="${cols[i].field}"
                  data-col-group="${parentId || ''}"
                  data-col-depth="${depth}"
                  style="width:${_width}px;height:${option.columnHeaderHeight}px;position:absolute;left:0px;top:0px;"
                >
                  <div class="${_align} center-valign" style="width:calc(100% - 10px);">
                    ${cols[i].hasOwnProperty('captionFormatter') ? cols[i].captionFormatter(cols[i].caption) + toggleBtn : `<span>${cols[i].caption}</span> ${toggleBtn}`}
                  </div>
                </div>
                ${childTmpl}
                </div>`;
      }
    }

    function calcPositionLeft(col, prevCol, idx) {
      let left = idx !== 0 ? prevCol.style.left + prevCol.style.width : 0;
      col.style.left = left;
      return left;
    }

    function calcPositionTop(col, depth) {
      let top = depth === 0 ? 0 : ((depth - 1) * option.columnHeaderHeight === 0 ? option.columnHeaderHeight : (depth - 1) * option.columnHeaderHeight);
      col.style.top = top;
      return top;
    }

    function calcHeight(col, depth) {
      let count = col.childrenDepthCount;
      if (count === 0) {
        if (depth === 0) {
          count = option.childrenDepth;
        } else {
          count = col.parent.childrenDepthCount;
        }
      } else {
        count += 1;
      }
      let height = option.columnHeaderHeight * count;

      col.style['height'] = height;
      return height;
    }

    function calcWidth(col, depth, parentObj) {
      if (!col.hasOwnProperty('style')) {
        col['style'] = {};
      }
      let width = 80;

      if (col.style.hasOwnProperty('changedWidth') && col.style.width !== col.style.changedWidth) {
        width = col.style.changedWidth;
      } else if (col.style.hasOwnProperty('width')) {
        width = col.style.width;
      } else if (!(col.hasOwnProperty('fold') && col.fold)) {
        const fixed = getFixedWidth((_this._dom.clientWidth - 50 - option.verticalScrollChecked), _this._dataSource.columns);
        if (depth === 0) {
          if (col.hasOwnProperty('width')) {
            if (col.width === '*') {
              if (col.hasOwnProperty('children') && col.children.length > 0) {
                width = fixed < width * countChildrenCount(col) ? width * countChildrenCount(col) : fixed;
              } else {
                width = fixed;
              }
            } else {
              if (typeof col.width === 'number') {
                width = col.width;
              } else if (typeof col.width === 'string' && col.width.indexOf('%') !== -1) {
                width = (_this._dom.clientWidth - 50) * (Number(col.width.split('%')[0]) / 100);
              } else {
                throw new Error('넓이값 지정 오류 입니다.');
              }
            }
          }
        } else {
          if (col.hasOwnProperty('width')) {
            if (col.width === '*') {
              width = getFixedWidth(parentObj.style.width, parentObj.children);
            } else {
              if (typeof col.width === 'number') {
                width = col.width;
              } else if (typeof col.width === 'string' && col.indexOf('%') !== -1) {
                width = parentObj.style.width * (Number(col.split('%')[0]) / 100);
              } else {
                throw new Error('넓이값 지정 오류 입니다.');
              }
            }
          } else {
            if (!(parentObj.hasOwnProperty('fold') && parentObj.fold)) {
              width = parentObj.style.width / parentObj.children.length;
            }
          }
        }
      }

      col.style['width'] = width;
      return width;

      function countChildrenCount(obj, count) {
        count = count || 0;
        for (let i = 0; i < obj.children.length; i++) {
          if (obj.children[i].hasOwnProperty('children') && obj.children[i].children.length > 0) {
            count += countChildrenCount(obj.children[i])
          } else {
            count += 1;
          }
        }
        return count;
      }

      function getFixedWidth(fullWidth, arr) {
        let count = 0,
          calcWidth = fullWidth;
        arr.map(v => {
          if (v.hasOwnProperty('width')) {
            if (v.width === '*') {
              count += 1;
            } else {
              if (typeof v.width === 'number') {
                calcWidth -= v.width;
              } else {
                calcWidth -= fullWidth * (Number(v.width.split('%')[0]) / 100);
              }
            }
          } else {
            calcWidth -= 80;
          }
        });
        count = count || 1;
        calcWidth = calcWidth < 80 ? 80 : calcWidth;
        return Number((calcWidth / count).toFixed());
      }
    };

    return tmpl;
  }

  function setScroll(type, pagingCheck) {
    if (!type) {
      return '';
    }
    const
      w = _this._dom.clientWidth - option.cornerHeaderWidth,
      w1 = option.contentWidth,
      wCheck = w1 > w ? 18 : 0,
      h = _this._dom.clientHeight - (option.columnHeaderHeight * option.childrenDepth) - (pagingCheck ? 50 : 0),
      h1 = option.contentHeight,
      hCheck = h1 > h ? 18 : 0;

    if (type === 'horizontal') {
      if (w1 > w) {
        return createScroll(type, hCheck, pagingCheck);
      } else {
        return '';
      }
    } else {
      if (h1 > h) {
        return createScroll(type, wCheck, pagingCheck);
      } else {
        return '';
      }
    }

    function createScroll(type, checked, pagingCheck) {
      const count = control.hasOwnProperty('dataEndCheck') && control.endDataIdx > control.dataEndCheck ?
        control.dataEndCheck - control.startDataIdx : control.viewerDataCount;

      if (type === 'horizontal') {
        return `
            <div class="bl-grid-scroll-box scroll-left" id="bl-grid-horizontal-scroll-${_id}" style="position:absolute;left:0;top:${_this._dom.clientHeight - (pagingCheck ? 50 : 0) - 18}px;width:${_this._dom.clientWidth - checked}px;height:18px;overflow:auto;">
              <div style="position:relative;width:${option.contentWidth + option.cornerHeaderWidth}px;height:1px;"></div>
            </div>
          `;
      } else {
        // return `
        //     <div class="bl-grid-scroll-box scroll-top" id="bl-grid-vertical-scroll-${_id}" style="position:absolute;left:${_this._dom.clientWidth - 18}px;top:0px;width:18px;height:${_this._dom.clientHeight - checked - (pagingCheck ? 50 : 0)}px;overflow:auto;">
        //       <div style="position:relative;height:${pagingCheck ? (option.rowHeight * count) + (option.columnHeaderHeight * option.childrenDepth) : option.contentHeight + (option.columnHeaderHeight * option.childrenDepth)}px;width:1px;"></div>
        //     </div>
        //   `;
        return `
            <div class="bl-grid-scroll-box scroll-top" id="bl-grid-vertical-scroll-${_id}" style="position:absolute;left:${_this._dom.clientWidth - 19}px;top:0px;width:18px;height:${_this._dom.clientHeight - checked - (pagingCheck ? 50 : 0)}px;overflow:auto;">
              <div style="position:relative;height:${pagingCheck ? (option.rowHeight * control.viewerDataCount) + (option.columnHeaderHeight * option.childrenDepth) : option.contentHeight + (option.columnHeaderHeight * option.childrenDepth)}px;width:1px;"></div>
            </div>
          `;
      }
    }
  }

  function setScrollPosition() {
    if (document.querySelector(`#bl-grid-horizontal-scroll-${_id}`)) {
      document.querySelector(`#bl-grid-horizontal-scroll-${_id}`).scrollLeft = Math.abs(control.left);
    } else {
      control.left = 0;
    }

    if (document.querySelector(`#bl-grid-vertical-scroll-${_id}`)) {
      document.querySelector(`#bl-grid-vertical-scroll-${_id}`).scrollTop = Math.abs(control.top);
      control.top = 0;
    } else {
      control.top = 0;
    }
  }

  function setDefaultEvent(pagingCheck) {
    const
      $wrap = document.querySelector(`#bl-grid-${_id}`),
      $header = document.querySelector(`#bl-grid-column-header-${_id}`),
      $headerInner = document.querySelector(`#bl-grid-column-header-inner-${_id}`),
      $viewer = $wrap.querySelector(`#bl-grid-viewer-${_id}`),
      $viewerInner = $wrap.querySelector(`#bl-grid-viewer-inner-${_id}`),
      $rowHeader = $wrap.querySelector(`#bl-grid-row-header-${_id}`),
      $rowHeaderInner = $wrap.querySelector(`#bl-grid-row-header-inner-${_id}`);

    const horizontalScroll = document.querySelector(`#bl-grid-horizontal-scroll-${_id}`);
    const verticalScroll = document.querySelector(`#bl-grid-vertical-scroll-${_id}`);

    if (document.querySelector(`#bl-grid-horizontal-scroll-${_id}`)) {
      document.querySelector(`#bl-grid-horizontal-scroll-${_id}`).addEventListener('scroll', (event) => {
        control.left = event.target.scrollLeft !== 0 ? -event.target.scrollLeft : 0;
        console.log('horizontal scroll event ', control.left)
        document.querySelector(`#bl-grid-column-header-inner-${_id}`).style.transform = `translate3d(${control.left}px, 0px, 0px)`;
        document.querySelector(`#bl-grid-viewer-inner-${_id}`).style.transform = `translate3d(${control.left}px, ${control.top}px, 0px)`;
      });
    }

    if (document.querySelector(`#bl-grid-vertical-scroll-${_id}`)) {
      document.querySelector(`#bl-grid-vertical-scroll-${_id}`).addEventListener('scroll', (event) => {
        const
          sct = event.target.scrollTop !== 0 ? -event.target.scrollTop : 0,
          max = (event.target.scrollHeight - event.target.clientHeight) * -1,
          addCount = control.viewerDataCount;

        // console.log('vertical scroll event ', sct)

        let temp = option.data.length;

        // !pagingCheck && temp !== _this._dataSource.data.length && sct == max && _this._dataSource.config.infiniteScroll
        if (!pagingCheck && temp !== _this._dataSource.data.length && sct == max && _this._dataSource.config.infiniteScroll) {
          option.data = common.Functions.cloneDeep(_this._dataSource.data);
          option.data.length = option.data.length < temp + addCount ? option.data.length : temp + addCount;
          set('reload');
        }

        changeDataRow(tempScroll - sct);

      });
    }

    $wrap.addEventListener('wheel', function (event) {
      event.preventDefault();

      if (option.verticalScrollChecked < 1) {
        return;
      }
      const
        t = document.querySelector(`#bl-grid-vertical-scroll-${_id}`),
        max = (t.scrollHeight - t.clientHeight) * -1;

      let
        scrollValue = control.top,
        diff = event.deltaY < 0 ? -100 : 100;

      if (diff > 0 && Math.abs(max - scrollValue) < 100 && Math.abs(max - scrollValue) !== 0) {
        diff = event.deltaY < 0 ? Math.abs(max - scrollValue) * -1 : Math.abs(max - scrollValue);
      }

      if (max === scrollValue && event.deltaY < 0) {
        diff = event.deltaY < 0 ? Math.abs(max % 100) * -1 : Math.abs(max % 100);
        if (Math.abs(diff) === 0) {
          diff = -100;
        }
      }

      scrollValue = scrollValue - diff;

      if (scrollValue >= 0) {
        scrollValue = 0;
      }
      if (max >= scrollValue) {
        scrollValue = max;
      }
      //t.scrollTop = Math.abs(scrollValue);
      if (tempScroll === scrollValue) {
        return;
      } else {
        t.scrollTop = Math.abs(scrollValue);
      }
    });

    $wrap.addEventListener('mousemove', (e) => {
      changeColResizeCursor(e)
      if (document.querySelector('#bl-grid-' + _id).classList.contains('resizing')) {
        const
          ref = Number(document.querySelectorAll('.bl-grid-resize-controler')[0].style.left.split('px')[0]),
          refWidth = ref + control.targetColumn.clientWidth,
          obj = findColumn(control.targetColumn.dataset.col);

        let
          v = e.pageX - control.mouseStart,
          tot = refWidth + v,
          checkValue = (obj.hasOwnProperty('fold') && obj.fold) || obj.childrenDepthCount === 0 ? 80 : 80 * childrenCount(obj.children, 0);

        if (e.movementX < 1 && control.targetColumn.offsetWidth + v <= checkValue) {
          return;
        } else {
          document.querySelectorAll('.bl-grid-resize-controler')[1].style.left = tot + 'px';
          control.mouseMovingValue = v;
        }
      }

      function childrenCount(arr, count) {
        count = count ? count : 0;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i].hasOwnProperty('children') && arr[i].children.length > 0) {
            count = childrenCount(arr[i].children, count)
          } else {
            count += 1;
          }
        }
        return count;
      }
    });

    $wrap.addEventListener('mouseleave', applyNewWidth);

    $wrap.addEventListener('mousedown', (e) => {
      if (document.querySelector('#bl-grid-' + _id).style.cursor === 'col-resize') {
        document.querySelector('#bl-grid-' + _id).classList.add('resizing');
        control.mouseStart = e.pageX;
        control.targetColumn = e.target;
        resizeControler(e);
      } else {
        document.querySelector('#bl-grid-' + _id).classList.remove('resizing');
        resizeControler();
      }

      e.path.map((p) => {
        // 컬럼 폴딩
        if ($wrap.querySelectorAll('.bl-grid-column-header-toggle').length > 0 &&
          p.classList && p.classList.contains('bl-grid-column-header-toggle')) {
          setTimeout(() => {
            toggleFold(p);
          }, 100)
        }
      });
    });

    $wrap.addEventListener('mouseup', applyNewWidth);

    $wrap.querySelectorAll('.bl-grid-edit-cell').forEach(edit => {
      const type = edit.getAttribute('data-edit-type');

      if (type === 'input') {
        edit.addEventListener('keyup', (event) => {
          const idx = event.target.getAttribute('data-idx'),
            nm = event.target.getAttribute('data-key');
          option.data[idx][nm] = event.target.value;
        })
      } else {
        edit.addEventListener('change', (event) => {
          const idx = event.target.getAttribute('data-idx'),
            nm = event.target.getAttribute('data-key');
          option.data[idx][nm] = event.target.value;
        })
      }

      edit.addEventListener('focus', (event) => {
        $wrap.querySelectorAll('.edit-active') && $wrap.querySelectorAll('.edit-active').forEach(active => {
          active.classList.remove('edit-active');
        })
        event.target.parentNode.parentNode.classList.add('edit-active');
      });
    });

    // grid 내 field tab event
    let minX = undefined;
    let maxX = undefined;
    let minY = undefined;
    let maxY = undefined;
    $viewerInner.addEventListener('keydown', (event) => {
      if (!event.target.classList.contains('bl-grid-edit-cell')) {
        return;
      }

      // next field
      minX = $viewer.getBoundingClientRect().left;
      maxX = $viewer.getBoundingClientRect().right;
      minY = $viewer.getBoundingClientRect().top;
      maxY = $viewer.getBoundingClientRect().bottom;

      let row = event.target.getAttribute('data-idx'),
        col = event.target.getAttribute('data-col-idx');

      let target = null;
      let tabChk = null;

      if (!event.shiftKey && event.keyCode === 9) {
        event.preventDefault();
        console.log('tab 🚗');
        tabChk = 'down';
        target = document.querySelector(`.bl-grid-edit-cell[data-idx="${row}"][data-col-idx="${Number(col) + 1}"]`);
        target = target || document.querySelector(`.bl-grid-edit-cell[data-idx="${Number(row) + 1}"][data-col-idx="${0}"]`);
      }

      // Prev field
      if (event.shiftKey && event.keyCode === 9) {
        console.log('shift + tab 🚗');
        event.preventDefault();
        tabChk = 'up';
        target = document.querySelector(`.bl-grid-edit-cell[data-idx="${row}"][data-col-idx="${Number(col) - 1}"]`);
        target = target || document.querySelector(`.bl-grid-edit-cell[data-idx="${Number(row) - 1}"][data-col-idx="${option.editColumnCount}"]`);
      }

      focusHandler(target, tabChk, 'edit');
    });

    $rowHeaderInner && $rowHeaderInner.addEventListener('keydown', (event) => {
      if (!event.target.classList.contains('bl-grid-row-header-select')) {
        return;
      }

      minX = undefined;
      maxX = undefined;
      minY = $rowHeader.getBoundingClientRect().top;
      maxY = $rowHeader.getBoundingClientRect().bottom;

      let row = Number(event.target.getAttribute('data-idx'));
      let tabChk = null;

      let target
      if (!event.shiftKey && event.keyCode === 9) {
        event.preventDefault();
        console.log('tab 🚗');
        tabChk = 'down';
        target = document.querySelector(`.bl-grid-row-header-select[data-idx="${row + 1}"]`);
      }

      // Prev field
      if (event.shiftKey && event.keyCode === 9) {
        console.log('shift + tab 🚗');
        event.preventDefault();
        tabChk = 'up';
        target = document.querySelector(`.bl-grid-row-header-select[data-idx="${row - 1}"]`);
      }

      focusHandler(target, tabChk, null);

    })

    function focusHandler(target, tabChk, type) {

      if (!!target) {
        const targetX = target.getBoundingClientRect().left;
        const targetX2 = target.getBoundingClientRect().right;
        const targetY = target.getBoundingClientRect().top;
        const targetY2 = target.getBoundingClientRect().bottom;

        target.focus({
          preventScroll: true,
        });

        if (maxX < targetX2) {
          console.log('>>>')
          horizontalScroll.scrollLeft = Math.abs(control.left) + targetX2 - maxX;
        }

        if (minX > targetX) {
          console.log('<<<')
          horizontalScroll.scrollLeft = Math.abs(control.left) - (Math.abs(targetX) + minX);
        }

        if (maxY < targetY2) {
          verticalScroll.scrollTop = Math.abs(control.top) + (targetY2 - maxY);
        }

        if (minY > targetY) {
          console.log(minY, targetY)
          verticalScroll.scrollTop = Math.abs(control.top) - (minY - targetY);
        }
      } else {
        if (tabChk === 'down' || tabChk === 'up') {
          let endRowChk = 0;
          let heightValue = 0;
          let rowIdx = 0;
          let colIdx = 0;
          switch (tabChk) {
            case 'down':
              endRowChk = pagingCheck ? (control.paging.current === 0 ? 1 : control.paging.current) * control.viewerDataCount : option.data.length;
              heightValue = option.rowHeight;
              rowIdx = control.endDataIdx;
              colIdx = 0;
              if (control.endDataIdx === endRowChk) {
                if (!type) {
                  verticalScroll.scrollTop = 0;
                  setTimeout(function () {
                    document.querySelector(`.bl-grid-edit-cell[data-idx="0"][data-col-idx="0"]`).focus();
                  }, 100);
                }
                return;
              }
              break;
            case 'up':
              endRowChk = pagingCheck ? control.paging.current * control.viewerDataCount : 0;
              heightValue = -option.rowHeight;
              rowIdx = control.startDataIdx - 1;
              colIdx = option.editColumnCount;
              if (control.startDataIdx === endRowChk) {
                if (type === 'edit') {
                  const max = verticalScroll.scrollHeight - verticalScroll.clientHeight;
                  const endNum = pagingCheck ? (control.paging.current === 0 ? 1 : control.paging.current) * control.viewerDataCount : option.data.length;
                  const target = document.querySelector(`.bl-grid-row-header-select[data-idx="${endNum - 1}"]`);
                  if (target) {
                    verticalScroll.scrollTop = max;
                    setTimeout(function () {
                      document.querySelector(`.bl-grid-row-header-select[data-idx="${endNum - 1}"]`).focus();
                    }, 100);
                  }
                } else {

                }
                return;
              }
              break;
          }

          console.log('None target??? 🤷‍♂️\nSo you have to check more datas for load!');
          // 추가 행 삽입
          changeDataRow(heightValue);
          // 삽입 된 행 선택
          const lastTarget = type === 'edit' ?
            document.querySelector(`.bl-grid-row[data-row-idx="${rowIdx}"]`).querySelectorAll('.bl-grid-edit-cell')[colIdx] :
            document.querySelector(`.bl-grid-row-header-select[data-idx="${rowIdx}"]`);

          focusHandler(lastTarget);
        }
      }

    }

    const delay = 250;
    let timer = null,
      counter = 0;

    //document.querySelector('#bl-grid-viewer-' + _id).addEventListener('click', (e) => {
    document.querySelector('#bl-grid-' + _id).addEventListener('click', (e) => {
      if (rowCheck(e.target) || rowCheck(e.target.parentNode) || rowCheck(e.target.parentNode.parentNode)) {
        let row = null;
        for (let i = 0; i < e.path.length; i++) {
          if (rowCheck(e.path[i])) {
            row = e.path[i];
            break;
          }
        }

        singleDefaultEvent(row);
        counter++;
        if (counter === 1) {
          timer = setTimeout(() => {
            if (_this._dataSource.eventHandler.hasOwnProperty('rowClick')) {
              _this._dataSource.eventHandler.rowClick(_this._dataSource.data[selectedRowIdx], _this._dataSource.data, _this);
            }
            counter = 0;
          }, delay);
        } else {
          clearTimeout(timer);
          if (_this._dataSource.eventHandler.hasOwnProperty('rowDblClick')) {
            _this._dataSource.eventHandler.rowDblClick(_this._dataSource.data[selectedRowIdx], _this._dataSource.data, _this);
          }
          counter = 0;
        }


      }
    });

    // ROW HEADER 클릭 이벤트
    if (_this._dataSource.config.hasOwnProperty('rowHeader') && (_this._dataSource.config.rowHeader === 'checkbox' || _this._dataSource.config.rowHeader === 'both')) {
      document.querySelector('#bl-grid-row-header-inner-' + _id).addEventListener('click', (e) => {
        if (rowCheck(e.target)) {
          selectedRowHeader(e.target, e.target.checked);
        } else if (rowCheck(e.target.children[0])) {
          selectedRowHeader(e.target.children[0], !e.target.children[0].checked);
        }

        function rowCheck(target) {
          return target.classList.contains('bl-grid-row-header-select');
        }
      });

      document.querySelector('#bl-grid-corner-header-inner-' + _id).addEventListener('click', (e) => {
        if (rowCheck(e.target)) {
          selectedCornerHeader(e.target.children[0], !e.target.children[0].checked);
        } else if (rowCheck(e.target.parentNode)) {
          selectedCornerHeader(e.target, e.target.checked);
        }

        function rowCheck(target) {
          return target.classList.contains('bl-grid-corner-header-cell');
        }

        function selectedCornerHeader(target, bool) {
          const rows = document.querySelectorAll('.bl-grid-row-header-select');
          target.checked = bool;
          allSelectedRows = bool;
          for (let i = 0; i < rows.length; i++) {
            selectedRowHeader(rows[i], bool, true);
          }
        }
      });
    }

    // COL HEADER 클릭 이벤트 
    if (_this._dataSource.config.hasOwnProperty('sort') && _this._dataSource.config.sort) {
      for (let key in option.dataFields) {
        const colNm = option.dataFields[key].name;
        if (!document.querySelector(`.bl-grid-column-header-cell[data-col="${colNm}"]`) ||
          document.querySelector(`.bl-grid-column-header-cell[data-col="${colNm}"]`).classList.contains('custom-col-header-cell')) {
          continue;
        }
        document.querySelector(`.bl-grid-column-header-cell[data-col="${colNm}"]`).addEventListener('click', (e) => {
          let target = null,
            type = null;

          e.path.map(function (t) {
            if (t.classList && t.classList.contains('bl-grid-column-header-cell')) {
              target = t;
            }
          });
          switch (target.getAttribute('data-sort')) {
            case 'none':
              type = 'asc';
              break;
            case 'asc':
              type = 'desc';
              break;
            case 'desc':
              type = 'none';
              break;
          }
          target.setAttribute('data-sort', type);
          control.sorting[0] = target.getAttribute('data-col');
          control.sorting[1] = type;
          set('sorting');
        });
      }
    }

    // paging event
    if (pagingCheck) {
      // 페이지 카운트 변경
      document.querySelector('#bl-grid-paging-select-' + _id).addEventListener('change', (e) => {
        control.viewerDataCount = Number(e.target.value);
        control.paging['selectedCount'] = Number(e.target.value);
        set('paging2');
      });

      // 다음 페이지로 이동
      document.querySelector('#bl-grid-paging-next-' + _id).addEventListener('click', () => {
        if (control.paging.current === control.paging.max) {
          return;
        }
        control.paging['current'] = control.paging.current + 1 > control.paging.max ? control.paging.max : control.paging.current + 1;
        moveToPage();
      });

      // 이전 페이지로 이동
      document.querySelector('#bl-grid-paging-prev-' + _id).addEventListener('click', () => {
        if (control.paging.current === control.paging.min) {
          return;
        }
        control.paging['current'] = control.paging.current - 1 < control.paging.min ? control.paging.min : control.paging.current - 1;
        moveToPage();
      });

      // 마지막 페이지로 이동
      document.querySelector('#bl-grid-paging-next-max-' + _id).addEventListener('click', () => {
        if (control.paging.current === control.paging.max) {
          return;
        }
        control.paging['current'] = control.paging.max;
        moveToPage();
      });

      // 처음 페이지로 이동
      document.querySelector('#bl-grid-paging-prev-min-' + _id).addEventListener('click', () => {
        if (control.paging.current === control.paging.min) {
          return;
        }
        control.paging['current'] = control.paging.min;
        moveToPage();
      });

      // 페이징 넘버 입력 후 엔터 이벤트
      document.querySelector('#bl-grid-paging-input-' + _id).addEventListener('keydown', (e) => {
        const pagingObj = _this.getControl().paging;
        let value = Number(e.target.value);
        if (e.keyCode === 13 && typeof value === 'number') {
          value -= 1;
          if (pagingObj.min <= value && pagingObj.max >= value) {
            control.paging['current'] = value;
            moveToPage();
          }
        }
      });
    }

    function rowCheck(target) {
      return target.classList.contains('bl-grid-row');
    }

    function singleDefaultEvent(row) {
      selectedRowIdx = Number(row.getAttribute('data-row-idx'));

      // const num = pagingCheck ? Number(row.getAttribute('data-row-idx')) - (control.paging.current * control.viewerDataCount) : Number(row.getAttribute('data-row-idx'));

      const rows = document.querySelectorAll(`.bl-grid-row[data-row-idx="${selectedRowIdx}"]`);
      rows.forEach(row => {
        removeAllClass(row.parentNode);
        row.classList.add('row-select');
      })

      function removeAllClass(parent) {
        for (let i = 0; i < parent.childNodes.length; i++) {
          if (parent.childNodes[i].nodeType !== Node.TEXT_NODE) {
            parent.childNodes[i].classList.remove('row-select');
          }
        }
      }
    }

    function moveToPage() {
      document.querySelector('#bl-grid-paging-input-' + _id).value = control.paging.current;

      set('paging');

      if (control.paging.current === control.paging.max) {
        document.querySelector('#bl-grid-paging-next-' + _id).classList.add('disabled');
        document.querySelector('#bl-grid-paging-next-max-' + _id).classList.add('disabled');
      } else {
        document.querySelector('#bl-grid-paging-next-' + _id).classList.remove('disabled');
        document.querySelector('#bl-grid-paging-next-max-' + _id).classList.remove('disabled');
      }
      if (control.paging.current === control.paging.min) {
        document.querySelector('#bl-grid-paging-prev-' + _id).classList.add('disabled');
        document.querySelector('#bl-grid-paging-prev-min-' + _id).classList.add('disabled');
      } else {
        document.querySelector('#bl-grid-paging-prev-' + _id).classList.remove('disabled');
        document.querySelector('#bl-grid-paging-prev-min-' + _id).classList.remove('disabled');
      }


    }

    function selectedRowHeader(target, bool, allChk) {
      const idx = target.parentNode.parentNode.getAttribute('data-row-idx');
      if (bool) {
        target.checked = true;
        selectedRows.push(idx);
        document.querySelector('.bl-grid-row-header[data-row-idx="' + idx + '"]').classList.add('row-select-chk');
        document.querySelector('.bl-grid-row[data-row-idx="' + idx + '"]').classList.add('row-select-chk');
      } else {
        target.checked = false;
        selectedRows.splice(selectedRows.indexOf(idx), 1);
        document.querySelector('.bl-grid-row-header[data-row-idx="' + idx + '"]').classList.remove('row-select-chk');
        document.querySelector('.bl-grid-row[data-row-idx="' + idx + '"]').classList.remove('row-select-chk');
      }
      if (allChk) {
        if (bool) {
          option.data.map((d, i) => {
            control._data[i] = d;
          });
        } else {
          control._data = {};
        }
      } else {
        control._data = {};
        selectedRows.map((d) => {
          control._data[d] = option.data[d];
        });
      }
    }

    function applyNewWidth() {
      if (document.querySelector('#bl-grid-' + _id).classList.contains('resizing')) {
        const obj = findColumn(control.targetColumn.dataset.col);
        obj.style['changedWidth'] = control.mouseMovingValue + obj.style.width;
        if (obj.style['changedWidth'] < 80) {
          obj.style['changedWidth'] = 80;
        }
        if (obj.parent) {
          parentChangeWidth(obj.parent, control.mouseMovingValue);
        }
        if (obj.hasOwnProperty('children') && obj.children.length > 0) {
          childrenChangeWidth(obj.children, obj.style.changedWidth, obj);
        }
        set('reload');
      }
      resizeControler();
      document.querySelector('#bl-grid-' + _id).classList.remove('resizing');
      control.mouseStart = 0;
      control.mouseMovingValue = 0;
      control.targetColumn = null;
    }

    function resizeControler(event) {
      const
        resize = document.querySelector('#bl-grid-resize-' + _id),
        type = event != undefined ? event.type : null;
      if (type === 'mousedown') {
        const
          d = document.querySelector('#bl-grid-' + _id),
          h = d.clientHeight,
          l = event.target.getBoundingClientRect().x - d.getBoundingClientRect().x - 1,
          w = event.target.clientWidth;
        resize.innerHTML = `
          <div class="bl-grid-resize-controler" style="height:${h}px; left:${l}px;"></div>
          <div class="bl-grid-resize-controler" style="height:${h}px; left:${w+l}px;"></div>
        `;
      } else {
        resize.innerHTML = '';
      }
    }

    function changeColResizeCursor(e) {
      if (e.target.classList.contains('bl-grid-column-header-cell')) {
        if (e.offsetX <= e.target.clientWidth + 10 && e.offsetX >= e.target.clientWidth - 10) {
          document.querySelector('#bl-grid-' + _id).style.cursor = 'col-resize';
        } else {
          if (!document.querySelector('#bl-grid-' + _id).classList.contains('resizing')) {
            document.querySelector('#bl-grid-' + _id).style.cursor = 'default';
          }
        }
      } else {
        document.querySelector('#bl-grid-' + _id).style.cursor = 'default';
      }
    }

    function parentChangeWidth(obj, value) {
      obj.style['changedWidth'] = obj.style.width + value;
      if (obj.parent) {
        parentChangeWidth(obj.parent, value)
      }
    }

    function childrenChangeWidth(objs, parentChangeWidth, o) {
      let
        w = 0,
        leng = 0;
      if (o.hasOwnProperty('fold') && o.fold) {
        w = parentChangeWidth;
        leng = 1;
      } else {
        w = parentChangeWidth / objs.length;
        leng = objs.length;
      }
      for (let i = 0; i < leng; i++) {
        objs[i].style['changedWidth'] = w;
        if (objs[i].hasOwnProperty('children') && objs[i].children.length > 0) {
          childrenChangeWidth(objs[i].children, w, objs[i]);
        }
      }
    }

    function toggleFold(fold) {
      const col = findColumn(fold.dataset.col);
      col.fold = col.fold ? false : true;
      col.style.changedWidth = 0;
      if (col.fold) {
        col.style.changedWidth = col.children[0].hasOwnProperty('style') ? col.children[0].style.width : 80;
      } else {
        col.children.map((child) => {
          let wd = 0;
          if (child.hasOwnProperty('style')) {
            wd = child.style.width;
          } else {
            wd = 80;
            child['style'] = {
              width: wd,
            };
          }
          col.style.changedWidth += wd;
        });
        fold.classList.add('open')
      }

      if (col.hasOwnProperty('parent') && col.parent) {
        toggleWidth(col.parent, col.style.changedWidth - col.style.width)
      }

      set('reload');

      function toggleWidth(_parent, wd) {
        _parent.style['changedWidth'] = _parent.style.width + wd;
        if (_parent.hasOwnProperty('parent') && _parent.parent) {
          toggleWidth(_parent.parent, wd);
        }
      }
    }
  }

  function findColumn(field, arr) {
    let obj = undefined;

    arr = arr || (freeze ? option.freezeColumns.concat(option.columns) : option.columns);

    for (let i = 0; i < arr.length; i++) {
      if (obj != undefined) {
        break;
      } else if (arr[i].field === field) {
        obj = arr[i];
        break;
      } else if (arr[i].hasOwnProperty('children') && arr[i].children.length > 0) {
        obj = findColumn(field, arr[i].children);
      }
    }

    return obj;
  }

  function sortingData() {
    const tempData = common.Functions.cloneDeep(_this._dataSource.data)
    if (control.sorting[1] !== 'none') {
      return control.sorting[1] === 'asc' ? tempData.sort((a, b) => {
        return a[control.sorting[0]] < b[control.sorting[0]] ? -1 : a[control.sorting[0]] > b[control.sorting[0]] ? 1 : 0;
      }) : tempData.sort((a, b) => {
        return a[control.sorting[0]] < b[control.sorting[0]] ? -1 : a[control.sorting[0]] > b[control.sorting[0]] ? 1 : 0;
      }).reverse();
    } else {
      return tempData;
    }
  }

  function changeDataRow(c) {
    const
      type = c > 0 ? 'down' : 'up',
      rowTarget = document.querySelector('#bl-grid-viewer-inner-' + _id),
      rowHeaderTarget = document.querySelector('#bl-grid-row-header-inner-' + _id),
      pagingCheck = _this._dataSource.config.hasOwnProperty('paging') && _this._dataSource.config.paging !== 'none' ? true : false,
      rect = rowTarget.parentNode.getBoundingClientRect();

    let
      start = 0,
      end = 0,
      rowChk = true,
      no = 0;
    console.log(c)
    control.top = control.top - c;
    document.querySelector(`#bl-grid-vertical-scroll-${_id}`).scrollTop = Math.abs(control.top);
    document.querySelector(`#bl-grid-viewer-inner-${_id}`).style.transform = `translate3d(${control.left}px, ${control.top}px, 0px)`;

    if (rowHeaderTarget) {
      document.querySelector(`#bl-grid-row-header-inner-${_id}`).style.transform = `translate3d(0px, ${control.top}px, 0px)`;
    }

    tempScroll = control.top;

    let current = Math.floor(Math.abs(control.top / option.rowHeight));
    if (control.hasOwnProperty('paging') && control.paging.current) {
      current = current + control.paging.current * control.paging.selectedCount;
    }

    control.startDataIdx = current;
    control.endDataIdx = current + control.viewerRowCount;

    if (type === 'down') {
      // 스크롤 다운
      // 상위 로우 제거

      no = control.startDataIdx - 1;
      while (rowChk) {
        rowChk = removeRow(no);
        no--;
      }

      console.log(current)
      start = control.endDataIdx;
      end = start + Math.abs(c / option.rowHeight);
    } else {
      // 스크롤 업
      // 하위 로우 제거 
      no = control.endDataIdx + 1;
      while (rowChk) {
        rowChk = removeRow(no);
        no++;
      }

      start = current;
      end = current + Math.abs(c / option.rowHeight);
    }

    end = Math.round(end);
    rowTarget.insertAdjacentHTML('beforeend', setData(control.startDataIdx, control.endDataIdx, pagingCheck));
    if (rowHeaderTarget) {
      if (freeze) {
        rowHeaderTarget.insertAdjacentHTML('beforeend', setData(control.startDataIdx, control.endDataIdx, pagingCheck, true));
      } else {
        rowHeaderTarget.insertAdjacentHTML('beforeend', setRowHeaderCell(control.startDataIdx, control.endDataIdx, pagingCheck));
      }
    }
    // rowTarget.insertAdjacentHTML('beforeend', setData(start, end, pagingCheck));
    // if (rowHeaderTarget) {
    //   if (freeze) {
    //     rowHeaderTarget.insertAdjacentHTML('beforeend', setData(start, end, pagingCheck, true));
    //   } else {
    //     rowHeaderTarget.insertAdjacentHTML('beforeend', setRowHeaderCell(start, end, pagingCheck));
    //   }
    // }

    // console.log(`
    // ----------------------------------------------------------------------------------------
    // ${type}
    // - start = ${start}
    // - end = ${end}
    // - add count = ${Math.abs(start-end)}
    // - delete count = ${no}
    // - total row count = ${document.querySelector(`#bl-grid-viewer-inner-${_id}`).children.length}
    // 🔴 control.startDataIdx = ${control.startDataIdx}
    // 🟠 control.endDataIdx = ${control.endDataIdx}
    // ----------------------------------------------------------------------------------------`)

    function removeRow(idx) {
      let chk1 = false,
        chk2 = false;
      if (document.querySelector(`#bl-grid-${_id} .bl-grid-row-header[data-row-idx="${idx}"]`)) {
        document.querySelector(`#bl-grid-${_id} .bl-grid-row-header[data-row-idx="${idx}"]`).remove();
        chk1 = true;
      }
      if (document.querySelectorAll(`#bl-grid-${_id} .bl-grid-row[data-row-idx="${idx}"]`).length) {
        document.querySelectorAll(`#bl-grid-${_id} .bl-grid-row[data-row-idx="${idx}"]`).forEach(r => r.remove());
        chk2 = true;
      }

      return chk1 || chk2 ? true : false;
    }

  }

}

Grid.prototype.refresh = function () {
  this.reset();
  this.init();
}

Grid.prototype.getSelectedRow = function () {
  return this.getControl()._data;
}

Grid.prototype.paging = function (pagingCheck, _id, option, control) {
  const _this = this;
  const defaultViewerDataCount = Math.ceil((_this._dom.clientHeight - (pagingCheck ? 50 : 0) - option.rowHeight * option.childrenDepth) / option.rowHeight);
  let tmpl = '';

  if (pagingCheck) {
    if (!this._dataSource.config.hasOwnProperty('viewCount')) {
      this._dataSource.config.viewCount = [10, 20, 30, 50, 100];
    }

    console.log('BLUEMANIA GRID PAGING💥');
    control.viewerDataCount = control.paging.hasOwnProperty('selectedCount') ? control.paging.selectedCount : this._dataSource.config.viewCount[0];
    control.paging['current'] = control.paging.hasOwnProperty('current') ? control.paging.current : 0;

    tmpl = pagingTemplate();
  } else {
    if (!this._dataSource.config.hasOwnProperty('paging')) {
      this._dataSource.config['paging'] = 'none';
    }
    control.viewerDataCount = defaultViewerDataCount;
  }

  function pagingTemplate() {
    return `<div class="bl-grid-paging-wrap" id="bl-grid-paging-wrap-${_id}" style="width:100%;height:40px;margin-top:10px;position:relative;">
              <div style="position:absolute;left:0;top:5px;height:30px;">
                <ul class="bl-grid-paging" id="bl-grid-paging-${_id}">
                ${paging()}
                </ul>
              </div>
              <div style="position:absolute;right:0;top:5px;width:60px;height:24px;">
                <select id="bl-grid-paging-select-${_id}" style="width:100%;height:100%;border:1px solid #cdcdcd;">${pagingSelect()}</select>
              </div>
            </div>`;
  }

  function paging() {
    control.paging['min'] = _this._dataSource.config.paging === 'server' && control.paging.hasOwnProperty('min') ? control.paging.min : 0;
    control.paging['max'] = _this._dataSource.config.paging === 'server' && control.paging.hasOwnProperty('max') ?
      control.paging.max : Math.ceil(_this._dataSource.data.length / control.viewerDataCount) - 1;

    let
      tmpl = '',
      current = control.paging.hasOwnProperty('current') ? control.paging.current + 1 : control.paging.min + 1,
      max = control.paging.max + 1;

    const
      minCheck = max === 0 || current === control.paging.min + 1 ? true : false,
      maxCheck = max === 0 || current === control.paging.max + 1 ? true : false;

    tmpl += `<li class="bl-grid-paging-btn bl-grid-paging-prev-max ${minCheck ? 'disabled' : ''}" id="bl-grid-paging-prev-min-${_id}">&lt;&lt;</li>
            <li class="bl-grid-paging-btn bl-grid-paging-prev ${minCheck ? 'disabled' : ''}" id="bl-grid-paging-prev-${_id}">&lt;</li>
            <li class="" id="" style="display:flex;align-items:center;margin:0 10px;">
              <input type="text" value="${current}" class="bl-grid-paging-input" id="bl-grid-paging-input-${_id}"> of ${max}
            </li>
            <li class="bl-grid-paging-btn bl-grid-paging-next ${maxCheck ? 'disabled' : ''}" id="bl-grid-paging-next-${_id}">&gt;</li>
            <li class="bl-grid-paging-btn bl-grid-paging-next-max ${maxCheck ? 'disabled' : ''}" id="bl-grid-paging-next-max-${_id}">&gt;&gt;</li>`;
    return tmpl;
  }

  function pagingSelect() {
    let tmpl = '';
    _this._dataSource.config.viewCount.map((opt) => {
      if (control.paging.hasOwnProperty('selectedCount') && control.paging.selectedCount === opt) {
        tmpl += `<option value="${opt}" selected> ${opt} </option>`;
      } else {
        tmpl += `<option value="${opt}"> ${opt} </option>`;
      }
    });
    return tmpl;
  }

  return tmpl;
}

Grid.prototype.downloadExcel = function (title) {
  const wb = XLSX.utils.book_new();
  const columns = this.getOption().freezeColumns.concat(this.getOption().columns);
  const data = this.getOption().data;
  const fieldMap = {};

  const sheetColumns = [];
  const newData = [];
  let colIdx = 0;

  createSheetColumns(columns);
  for (let k = 0; k < data.length; k++) {
    const d = [];
    for (let idx in fieldMap) {
      d[idx] = data[k][fieldMap[idx]];
    }
    newData.push(d);
  }

  const sheetData = sheetColumns.concat(newData);

  title = title || 'excel_download';
  wb.props = {
    title: title,
  };
  wb.SheetNames.push(title);
  var ws = XLSX.utils.aoa_to_sheet(sheetData);
  wb.Sheets[title] = ws;
  const wbout = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'binary'
  });

  saveAs(new Blob([s2ab(wbout)], {
    type: "application/octet-stream"
  }), title + '_' + Commons.Functions.getToday() + '.xlsx');

  function s2ab(s) {
    var buf = new ArrayBuffer(s.length); //convert s to arrayBuffer
    var view = new Uint8Array(buf); //create uint8array as viewer
    for (var i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF; //convert to octet
    return buf;
  }

  function createSheetColumns(cols, rowIdx) {
    rowIdx = rowIdx === undefined ? 0 : rowIdx;
    for (let i = 0; i < cols.length; i++) {
      if (!sheetColumns[rowIdx]) {
        sheetColumns[rowIdx] = [];
      }
      sheetColumns[rowIdx][colIdx] = cols[i].caption;
      fieldMap[colIdx] = cols[i].field;

      if (cols[i].hasOwnProperty('children') && cols[i].children.length > 0) {
        createSheetColumns(cols[i].children, rowIdx + 1)
      } else {
        colIdx++;
      }
    }
  }
}

export default Grid;
