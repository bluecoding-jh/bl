import Commons from './commons';
import saveAs from 'file-saver';
import * as XLSX from 'xlsx';

function Compare(id, columns, data, config = {
  rowHeaderWidth: 50,
  dataColWidth: 80,
  colHeader: {},
}) {

  const common = Commons;
  let resizeEvent = null;

  Object.defineProperty(this, '_global', {
    value: {},
    writable: false,
  });
  Object.defineProperty(this._global, '_dom', {
    value: document.getElementById(id),
    writable: false,
  });
  Object.defineProperty(this._global, '_columns', {
    value: columns,
    writable: false,
  });
  Object.defineProperty(this._global, '_data', {
    value: data,
    writable: false,
  });
  Object.defineProperty(this._global, '_config', {
    value: config,
    writable: false,
  });

  let
    option = {
      columns: common.Functions.cloneDeep(columns),
      data: common.Functions.cloneDeep(data),
      dataFields: {},
      dataFieldsViewCount: 0,
      contentHeight: 0,
      verticalScrollChecked: false,
      horizontalScrollChecked: false,
    },
    control = {
      left: 0,
      top: 0,
      startRowIdx: 0,
      endRowIdx: 0,
      viewerDataCount: 0,
    },
    temp = {
      tempScroll: 0,
    }

  this.getOption = () => {
    return option;
  }
  this.getControl = () => {
    return control;
  }
  this.getTemp = () => {
    return temp;
  }

  this.init(undefined, common);

  window.addEventListener('resize', () => {
    clearTimeout(resizeEvent);
    resizeEvent = setTimeout(() => {
      this.init('reload');
    }, 250)
  });
}

Compare.prototype.init = function (type, common) {

  common = common || Commons;

  const
    _this = this,
    _id = common.Functions.uuidv4('xxxxxxx'),
    option = this.getOption(),
    control = this.getControl(),
    temp = this.getTemp();


  let
    tempScroll = temp.tempScroll,
    start = 0,
    end = 0;

  setCompare();

  function setCompare() {

    if (!type) {
      calcChildrenDepth();
      option.childrenDepth = setColumnDepth();
    }

    // 스크롤 체크
    // horizontal
    if (_this._global._dom.clientWidth - (_this._global._config.rowHeaderWidth * option.childrenDepth) <
      option.data.length * _this._global._config.dataColWidth) {
      option.horizontalScrollChecked = true;
    } else {
      option.horizontalScrollChecked = false;
    }
    // vertical
    option.verticalScrollChecked = createDataField() * 33 > _this._global._dom.clientHeight ? true : false;

    // data viewer count
    control.viewerDataCount = Math.ceil((_this._global._dom.clientWidth - (_this._global._config.rowHeaderWidth * option.childrenDepth)) / _this._global._config.dataColWidth);

    _this._global._dom.innerHTML = '';
    option.contentHeight = 0;

    start = control.startRowIdx;
    end = control.viewerDataCount;

    _this._global._dom.setAttribute('tabindex', '1');
    _this._global._dom.innerHTML = `
      <div class="bl-compare-wrap" id="bl-compare-wrap-${_id}" style="height:${_this._global._dom.clientHeight}px;">
        <div class="bl-compare-container">
          ${setCornerHeader()}
          ${setRowHeaders()}
          ${setColHeaders(start, end)}
          ${setViewer(start, end)}
          ${setCheckScroll('vertical')}
          ${setCheckScroll('horizontal')}
        </div>
      </div>
    `;

    setDefaultEvent();
    setScrollPosition();
  }

  function createDataField(arr, count) {
    arr = arr == undefined ? option.columns : arr;
    count = count == undefined ? 0 : count;

    for (let i = 0; i < arr.length; i++) {
      if (arr[i].hasOwnProperty('children') && arr[i].children.length > 0) {
        count = createDataField(arr[i].children, count)
      } else {
        option.dataFields[count] = arr[i];
        count++;
      }
    }

    return count;
  }

  function setCheckScroll(type) {
    if (type === 'vertical' && option.verticalScrollChecked) {
      return `<div class="bl-compare-scroll-box scroll-top" id="bl-compare-vertical-scroll-${_id}"
              style="width:18px;height:${_this._global._dom.clientHeight - (option.horizontalScrollChecked ? 18 : 0)}px;position:absolute;left:${_this._global._dom.clientWidth - 18}px;top:0px;overflow:auto;">
              <div style="width:1px;height:${option.contentHeight + option.cornerHeight}px;"></div>
            </div>`;
    }
    if (type === 'horizontal' && option.horizontalScrollChecked) {
      return `<div class="bl-compare-scroll-box scroll-left" id="bl-compare-horizontal-scroll-${_id}"
              style="height:18px;width:${_this._global._dom.clientWidth - (option.verticalScrollChecked ? 18 : 0)}px;position:absolute;left:0px;top:${_this._global._dom.clientHeight - 18}px;overflow:auto;">
              <div style="height:1px;width:${option.data.length * _this._global._config.dataColWidth + _this._global._config.rowHeaderWidth * option.childrenDepth}px;"></div>
            </div>`;
    }
  }

  function setScrollPosition() {
    if (document.querySelector(`#bl-compare-horizontal-scroll-${_id}`)) {
      document.querySelector(`#bl-compare-horizontal-scroll-${_id}`).scrollLeft = Math.abs(control.left);
      control.left = 0;
    } else {
      control.left = 0;
    }

    if (document.querySelector(`#bl-compare-vertical-scroll-${_id}`)) {
      document.querySelector(`#bl-compare-vertical-scroll-${_id}`).scrollTop = Math.abs(control.top);
    } else {
      control.top = 0;
    }
  }

  // create corner header
  function setCornerHeader() {
    const
      width = _this._global._config.rowHeaderWidth * option.childrenDepth,
      height = _this._global._config.colHeader.hasOwnProperty('height') && typeof _this._global._config.colHeader.height === 'number' ?
        _this._global._config.colHeader.height : 30;

    let tmpl = '';

    option['cornerHeight'] = height;
    if (!_this._global._config.colHeader.hasOwnProperty('type')) {
      _this._global._config.colHeader.type = 'no';
    }
    switch (_this._global._config.colHeader.type) {
      case 'checkbox':
        tmpl = `<div class="bl-compare-corner-header-cell bl-compare-cell-border" style="width:100%;height:${height}px;">
                  <div class="center-valign"><input type="checkbox" id="bl-compare-all-check"></div>
                </div>`;
        break;
      default:
        tmpl = `<div class="bl-compare-corner-header-cell bl-compare-cell-border" style="width:100%;height:100%"></div>`;
        break;
    }

    return `<div class="bl-compare-corner-header" id="bl-compare-corner-header-${_id}"
              style="width:${width}px;height:${height}px;position:absolute;left:0;top:0;">
              <div class="bl-compare-corner-header-inner" id="bl-compare-corner-header-inner-${_id}"
              style="width:${width}px;height:${height}px;">
                ${tmpl}
              </div>
            </div>`;
  }

  // create row header
  function setRowHeaders() {

    return `<div class="bl-compare-row-header-wrap" id="bl-compare-row-header-wrap-${_id}"
              style="position:absolute;left:0;top:${option.cornerHeight}px;width:${_this._global._config.rowHeaderWidth * option.childrenDepth}px;height:${_this._global._dom.clientHeight-option.cornerHeight - (option.horizontalScrollChecked ? 18 : 0)}px;overflow:hidden;">
              <div class="bl-compare-row-header-inner" id="bl-compare-row-header-inner-${_id}" style="position:relative;width:${_this._global._config.rowHeaderWidth * option.childrenDepth}px;height:${_this._global._dom.clientHeight-option.cornerHeight - (option.horizontalScrollChecked ? 18 : 0)}px;transform:translate3d(0px,0px,0px)">
                ${setRowHeaderColumns()}
              </div>
            </div>`;

    function setRowHeaderColumns(tmpl, arr, depth) {
      tmpl = tmpl == undefined ? '' : tmpl;
      arr = arr == undefined ? option.columns : arr;
      depth = depth == undefined ? 0 : depth;

      const _w = _this._global._config.rowHeaderWidth;

      for (let i = 0; i < arr.length; i++) {
        let
          width = (option.childrenDepth - depth) * _w,
          height = arr[i].hasOwnProperty('height') && typeof arr[i].height === 'number' ? arr[i].height : 33,
          top = i !== 0 ? arr[i - 1].style.top + arr[i - 1].style.height : 0;

        arr[i]['style'] = {
          width: width,
          height: height,
          top: top,
        };

        tmpl += `<div style="width:${width}px;display:flex;">
                  <div class="bl-compare-header-cell bl-compare-cell bl-compare-cell-border"
                  style="width:100%;min-height:${height}px;"
                  data-tooltip="${arr[i].caption}">
                    ${arr[i].hasOwnProperty('formatter') && arr[i].formatter ? arr[i].formatter(arr[i], arr, _this): arr[i].caption}
                  </div>`;

        if (arr[i].hasOwnProperty('children') && arr[i].children.length > 0) {
          tmpl += `<div class="bl-compare-header-group">`;
          tmpl = setRowHeaderColumns(tmpl, arr[i].children, depth + 1);
          tmpl += '</div>';
        } else {
          option.contentHeight += height;
        }

        tmpl += '</div>';
      }

      return tmpl;
    }
  }

  // create col header
  function setColHeaders(start, end) {
    let tmpl = setColHeader(start, end);
    return `<div class="bl-compare-col-header-wrap" id="bl-compare-col-header-wrap-${_id}"
              style="width:${_this._global._dom.clientWidth - (_this._global._config.rowHeaderWidth * option.childrenDepth) - (option.verticalScrollChecked ? 18 : 0)}px;
              height:${option.cornerHeight}px;position:absolute;top:0;left:${_this._global._config.rowHeaderWidth * option.childrenDepth}px;overflow:hidden;">
              <div class="bl-compare-col-header-inner" id="bl-compare-col-header-inner-${_id}" style="position:relative;">
                ${tmpl}
              </div>
            </div>`;
  }

  function setColHeader(start, end) {
    const
      width = _this._global._config.dataColWidth,
      height = option.cornerHeight,
      arr = option.data;

    let
      tmpl = '',
      align = undefined;

    switch (_this._global._config.colHeader.align) {
      case 'center':
        align = 'center-align';
        break;
      case 'left':
        align = 'left-align';
        break;
      case 'right':
        align = 'right-align';
        break;
    }

    for (let i = start; i <= end; i++) {
      if (document.querySelector(`.bl-compare-col-header-cell[data-col-idx='${i}']`) || arr[i] == undefined) {
        continue;
      }
      tmpl += `<div class="bl-compare-col-header-cell bl-compare-cell-border" data-col-id="bl-compare-viewer-col-${_id}-${i}" data-col-idx="${i}"
      style="width:${width}px;height:${height}px;position:absolute;left:${i * width}px;top:0px;">`;

      switch (_this._global._config.colHeader.type) {
        case 'checkbox':
          tmpl += `<div class="center-valign"><input type="checkbox" data-col-id="bl-compare-viewer-col-${_id}-${i}"></div>`
          break;
        case 'custom':
          tmpl += _this._global._config.colHeaderFormatter(arr[i], `bl-compare-viewer-col-${_id}-${i}`, arr, _this);
          break;
        default:
          tmpl += `<div style="width:100%;height:100%;">
                    <div class="center-valign left-align">${i + 1}</div>
                  </div>`;
          break;
      }
      tmpl += '</div>';
    }
    return tmpl;
  }

  // create data viewer
  function setViewer(start, end) {

    control.startRowIdx = start;
    control.endRowIdx = end;

    return `<div class="bl-compare-viewer-wrap" id="bl-compare-viewer-wrap-${_id}"
              style="width:${_this._global._dom.clientWidth - (_this._global._config.rowHeaderWidth * option.childrenDepth) - (option.verticalScrollChecked ? 18 : 0)}px;
              height:${_this._global._dom.clientHeight - option.cornerHeight - (option.horizontalScrollChecked ? 18 : 0)}px;
              position:absolute;left:${_this._global._config.rowHeaderWidth * option.childrenDepth}px;top:${option.cornerHeight}px;overflow:hidden;">
              <div class="bl-compare-viewer-inner" id="bl-compare-viewer-inner-${_id}" 
                style="position:relative;width:${_this._global._dom.clientWidth - (_this._global._config.rowHeaderWidth * option.childrenDepth) - (option.verticalScrollChecked ? 18 : 0)}px;height:${option.contentHeight}px;transform:translate3d(0px,0px,0px);">
                ${setCol(start, end)}
              </div>
            </div>`;
  }

  function setCol(start, end) {
    let tmpl = '';
    for (let i = start; i <= end; i++) {
      if (document.querySelector(`.bl-compare-viewer-col[data-col-idx='${i}']`) || option.data[i] == undefined) {
        continue;
      }
      tmpl += `<div class="bl-compare-viewer-col" id="bl-compare-viewer-col-${_id}-${i}" data-col-idx="${i}" style="position:absolute;left:${i*_this._global._config.dataColWidth}px;top:0;">`;
      for (let key in option.dataFields) {
        const
          d = option.dataFields[key],
          align = d.hasOwnProperty('align') ? d.align : 'left',
          height = d.style.hasOwnProperty('height') ? d.style.height : 33;

        let _align = '';
        switch (align) {
          case 'left':
            _align = 'left-align';
            break;
          case 'center':
            _align = 'center-align';
            break;
          case 'right':
            _align = 'right-align';
            break;
        }

        tmpl += `<div class="bl-compare-cell bl-compare-cell-border"
              style="width:${_this._global._config.dataColWidth}px;height:${height}px;">
                <div style="display:flex;height:100%;">
                  <div class="${_align}" style="width:50%;line-height:${height - 10}px;padding:5px;border-right:1px solid #cdcdcd;">${option.data[i][d.field] || ''}</div>
                  <div class="${_align}" style="width:50%;line-height:${height - 10}px;padding:5px;">${option.data[i][d.field+_this._global._config.valueSeparator] || ''}</div>
                </div>
              </div>`;

      }
      tmpl += '</div>';
    }
    return tmpl;
  }

  function setDefaultEvent() {
    const
      vs = document.querySelector(`#bl-compare-vertical-scroll-${_id}`),
      hs = document.querySelector(`#bl-compare-horizontal-scroll-${_id}`),
      v = document.querySelector(`#bl-compare-viewer-inner-${_id}`),
      rh = document.querySelector(`#bl-compare-row-header-inner-${_id}`),
      ch = document.querySelector(`#bl-compare-col-header-inner-${_id}`);

    if (vs) {
      vs.addEventListener('scroll', (event) => {
        v.style.transform = `translate3d(${control.left}px, ${control.top}px, 0px)`;
        rh.style.transform = `translate3d(0px, ${control.top}px, 0px)`;
      });
    }
    if (hs) {
      hs.addEventListener('scroll', (event) => {
        // tempScroll = control.left;
        const sct = event.target.scrollLeft !== 0 ? -event.target.scrollLeft : 0;
        loadDataCol(tempScroll - sct, hs, v, ch);
      })
    }

    document.querySelector(`#bl-compare-wrap-${_id}`).addEventListener('wheel', (event) => {
      event.preventDefault();

      if (!option.verticalScrollChecked) {
        return;
      }

      const max = (vs.scrollHeight - vs.clientHeight) * -1;

      let
        scrollValue = control.top,
        diff = event.deltaY < 0 ? -100 : 100;

      if (diff > 0 && Math.abs(max - scrollValue) < 100 && Math.abs(max - scrollValue) !== 0) {
        diff = event.deltaY < 0 ? Math.abs(max - scrollValue) * -1 : Math.abs(max - scrollValue);
      }

      if (max === scrollValue && event.deltaY < 0) {
        diff = event.deltaY < 0 ? Math.abs(max % 100) * -1 : Math.abs(max % 100);
      }

      scrollValue = scrollValue - diff;

      if (scrollValue >= 0) {
        scrollValue = 0;
      }
      if (max >= scrollValue) {
        scrollValue = max;
      }

      vs.scrollTop = Math.abs(scrollValue);
      control.top = scrollValue;

    });

    setColumnHeaderEvent();
    // 완료 후 콜백
    if (_this._global._config.hasOwnProperty('loadCallback') && _this._global._config.loadCallback) {
      _this._global._config.loadCallback(_this);
    }
  }

  function loadDataCol(chk, hScroll, viewer, colHeader) {

    const type = chk > 0 ? 'right' : 'left';
    let
      start = 0,
      end = 0,
      rowChk = true,
      no = 0;

    control.left = control.left - chk;

    hScroll.scrollLeft = Math.abs(control.left);
    viewer.style.transform = `translate3d(${control.left}px, ${control.top}px, 0px)`;
    colHeader.style.transform = `translate3d(${control.left}px, 0px, 0px)`;

    tempScroll = control.left;

    const current = Math.floor(Math.abs(control.left / _this._global._config.dataColWidth));

    if (type === 'right') {
      no = current - 1;

      while (rowChk) {
        rowChk = removeCol(no);
        no--;
      }

      start = control.endRowIdx;
      end = current + control.viewerDataCount;
    } else {
      no = current + control.viewerDataCount + 1;

      while (rowChk) {
        rowChk = removeCol(no);
        no++;
      }

      start = current;
      end = control.startRowIdx - 1;
    }

    control.startRowIdx = current;
    control.endRowIdx = current + control.viewerDataCount;
    // console.log(`${control.startRowIdx}, ${control.endRowIdx} / ${start - end}`)

    viewer.insertAdjacentHTML('beforeend', setCol(start, end));

    if (colHeader) {
      colHeader.insertAdjacentHTML('beforeend', setColHeader(start, end));
      setColumnHeaderEvent(start);
    }

    function removeCol(idx) {
      let
        chk1 = false,
        chk2 = false;

      if (viewer.querySelector(`.bl-compare-viewer-row[data-col-idx="${idx}"]`)) {
        viewer.querySelector(`.bl-compare-viewer-row[data-col-idx="${idx}"]`).remove();
        chk1 = true;
      }

      if (colHeader.querySelector(`.bl-compare-col-header-cell[data-col-idx="${idx}"]`)) {
        colHeader.querySelector(`.bl-compare-col-header-cell[data-col-idx="${idx}"]`).remove();
        chk2 = true;
      }

      return chk1 || chk2 ? true : false;
    }
  }

  function calcChildrenDepth(arr, parent) {
    arr = arr || option.columns;
    let parentAddCountChk = false;

    for (let i = 0; i < arr.length; i++) {
      if (!arr[i].hasOwnProperty('childrenDepthCount')) {
        arr[i]['childrenDepthCount'] = 0;
      }

      if (parent) {
        arr[i]['parent'] = parent;
      }

      if (arr[i].hasOwnProperty('children') && arr[i].children.length > 0) {
        arr[i].childrenDepthCount += 1;
        calcChildrenDepth(arr[i].children, arr[i]);
        if (parent != undefined && !parentAddCountChk) {
          parent.childrenDepthCount += 1;
          parentAddCountChk = true;
        }
      }
    }
  }

  function setColumnDepth() {
    return option.columns.reduce((prev, current) => {
      return prev.childrenDepthCount > current.childrenDepthCount ? prev : current;
    }).childrenDepthCount + 1
  }

  function setColumnHeaderEvent(num) {
    num = num || 0;
    // 컬럼 헤더 클릭 이벤트
    if (_this._global._config.hasOwnProperty('colHeaderHandler') && _this._global._config.colHeaderHandler) {
      const _data = _this.getOption().data;
      for (let i = num; i < _data.length; i++) {
        const target = document.querySelector('.bl-compare-col-header-cell[data-col-idx="' + i + '"]');
        if (target && !target.classList.contains('eventOn')) {
          target.classList.add('eventOn');
          target.addEventListener('click', function (e) {
            _this._global._config.colHeaderHandler(_data[i], e.target, target, _this);
          })
        }
      }
    }
  }
};

Compare.prototype.addColumn = function (data, refCheck) {
  const _data = this.getOption().data,
    _key = this._global._config.keyProperty;
  if (refCheck) {
    for (let i = 0; i < _data.length; i++) {
      if (_data[i].hasOwnProperty('ref') && _data[i].ref) {
        _data.splice(i, 1);
        break;
      }
    }
    for (let j = 0; j < data.length; j++) {
      _data.unshift(data[j])
    }
  } else {
    for (let j = 0; j < data.length; j++) {
      let chk = false;
      for (let i = 0; i < _data.length; i++) {
        if (data[j][_key] == _data[i][_key]) {
          chk = true;
          break;
        }
      }

      if (!chk) {
        _data.push(data[j]);

      }
    }
  }
  this.init('reload');
};

Compare.prototype.removeColumn = function (id, dataKey) {
  const _data = this.getOption().data;
  const filterData = _data.filter(function (data) {
    return data.id != dataKey;
  });

  this.getOption().data = filterData;
  this.getControl().startRowIdx -= 1;
  this.init('reload');
};

Compare.prototype.downloadExcel = function (title) {
  console.log(XLSX)
  const
    wb = XLSX.utils.book_new(),
    sheetData = getExcelData.call(this),
    key = this._global._config.keyProperty;

  title = title || '엑셀 다운로드';

  if (sheetData.length < 1) {
    return;
  }

  wb.props = {
    title: title,
  };

  wb.SheetNames.push('sheet');
  var ws = XLSX.utils.aoa_to_sheet(sheetData);
  wb.Sheets['sheet'] = ws;

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

  function getExcelData() {
    const option = this.getOption();
    const temp = [],
      key = this._global._config.keyProperty,
      separator = this._global._config.valueSeparator;

    let colIdx = 2;
    // ROW HEADER 정보 삽입
    option.columns.forEach((col, idx) => {
      temp[colIdx] = [col.caption];
      if (col.hasOwnProperty('children') && col.children.length > 0) {
        loop(col.children);
      } else {
        for (let i = 1; i < option.childrenDepth; i++) {
          temp[colIdx][i] = '';
        }
      }
      colIdx += 1;
    });

    // COLUMN HEADER 정보 삽입
    temp[0] = [''];
    temp[1] = [''];
    for (let i = 1; i < option.childrenDepth; i++) {
      temp[0][i] = '';
      temp[1][i] = '';
    }
    for (let i = 0; i < option.data.length; i++) {
      temp[0].push(option.data[i][key]);
      temp[0].push('');
      temp[1].push('검토내용');
      temp[1].push('RPN');
    }

    // DATA 정보 삽입
    Object.keys(option.dataFields).map(function (o, idx) {
      const _key = option.dataFields[o].field,
        _rpnKey = _key + separator,
        _formatter = option.dataFields[o].formatter,
        _idx = idx + 2;

      for (let i = 0; i < option.data.length; i++) {
        const data = option.data[i][_key] || '',
          data2 = option.data[i][_rpnKey] || '';

        temp[_idx].push(data);
        temp[_idx].push(data2);
      }
    })

    function loop(children, depth) {
      depth = depth || 1;
      for (let j = 0; j < children.length; j++) {
        if (j === 0) {
          temp[colIdx].push(children[j].caption);
        } else {
          colIdx += 1;
          if (temp[colIdx]) {
            temp[colIdx].push(children[j].caption);
          } else {
            temp[colIdx] = [];
            for (let i = 0; i < depth; i++) {
              temp[colIdx].push('');
            }
            temp[colIdx].push(children[j].caption);
          }
          // temp[colIdx] = ['', children[j].caption]
        }
        if (children[j].hasOwnProperty('children') && children[j].children.length > 0) {
          loop(children[j].children, depth + 1)
        }
        if (temp[colIdx].length < option.childrenDepth) {
          for (let k = temp[colIdx].length; k < option.childrenDepth; k++) {
            temp[colIdx].push('');
          }
        }
      }
    }

    return temp;
  }
};

export default Compare;