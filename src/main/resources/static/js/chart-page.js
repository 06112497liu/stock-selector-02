/* 个股 K 线页:拉 /api/kline -> 转 ECharts option -> 重绘蜡烛图 + 成交量副图 + 均线。
   纯原生 JS,依赖全局 echarts(由 echarts.min.js 提供)。 */
(function () {
  'use strict';

  var root = document.getElementById('kline');
  if (!root || typeof echarts === 'undefined') {
    return;
  }

  var MARKET = root.getAttribute('data-market') || 'us';
  var CODE = root.getAttribute('data-code') || '';

  var UP = '#dc2626';
  var DOWN = '#16a34a';
  var MA5_COLOR = '#f59e0b';
  var MA10_COLOR = '#3b82f6';
  var MA20_COLOR = '#a855f7';
  var DIF_COLOR = '#f59e0b';
  var DEA_COLOR = '#3b82f6';
  var MACD_UP = '#dc2626';
  var MACD_DOWN = '#16a34a';

  var chart = echarts.init(root);
  var currentPeriod = '1d';

  window.addEventListener('resize', function () {
    chart.resize();
  });

  function showMessage(text) {
    chart.clear();
    chart.setOption({
      title: {
        text: text,
        left: 'center',
        top: 'center',
        textStyle: { color: '#64748b', fontSize: 14, fontWeight: 'normal' }
      }
    });
  }

  function calcMA(points, period) {
    var result = [];
    for (var i = 0; i < points.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        var sum = 0;
        for (var j = i - period + 1; j <= i; j++) {
          sum += points[j].close;
        }
        result.push(Number((sum / period).toFixed(2)));
      }
    }
    return result;
  }

  function calcEMA(closes, period) {
    var result = [];
    var k = 2 / (period + 1);
    var ema = null;
    for (var i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else if (i === period - 1) {
        var sum = 0;
        for (var j = 0; j < period; j++) {
          sum += closes[j];
        }
        ema = sum / period;
        result.push(Number(ema.toFixed(4)));
      } else {
        ema = closes[i] * k + ema * (1 - k);
        result.push(Number(ema.toFixed(4)));
      }
    }
    return result;
  }

  function calcMACD(points) {
    var closes = [];
    for (var i = 0; i < points.length; i++) {
      closes.push(points[i].close);
    }
    var ema12 = calcEMA(closes, 12);
    var ema26 = calcEMA(closes, 26);

    var dif = [];
    for (var d = 0; d < points.length; d++) {
      if (ema12[d] !== null && ema26[d] !== null) {
        dif.push(Number((ema12[d] - ema26[d]).toFixed(4)));
      } else {
        dif.push(null);
      }
    }

    var dea = [];
    var difForEma = [];
    for (var e = 0; e < dif.length; e++) {
      difForEma.push(dif[e] !== null ? dif[e] : 0);
    }
    var deaRaw = calcEMA(difForEma, 9);
    var firstValidDif = -1;
    for (var f = 0; f < dif.length; f++) {
      if (dif[f] !== null) {
        firstValidDif = f;
        break;
      }
    }
    for (var g = 0; g < dif.length; g++) {
      if (firstValidDif >= 0 && g >= firstValidDif + 8) {
        dea.push(deaRaw[g]);
      } else {
        dea.push(null);
      }
    }

    var macd = [];
    for (var m = 0; m < dif.length; m++) {
      if (dif[m] !== null && dea[m] !== null) {
        var val = (dif[m] - dea[m]) * 2;
        macd.push({
          value: Number(val.toFixed(4)),
          itemStyle: { color: val >= 0 ? MACD_UP : MACD_DOWN }
        });
      } else {
        macd.push(null);
      }
    }

    return { dif: dif, dea: dea, macd: macd };
  }

  // points: [{time, open, high, low, close, volume}, ...]
  function render(points) {
    if (!points || points.length === 0) {
      showMessage('暂无数据(可能数据源限流或本机代理拦截,A股本地联调常见)');
      return;
    }

    var times = [];
    var candles = [];
    var volumes = [];

    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      times.push(p.time);
      candles.push([p.open, p.close, p.low, p.high]);
      volumes.push({
        value: p.volume,
        itemStyle: { color: p.close >= p.open ? UP : DOWN }
      });
    }

    var ma5 = calcMA(points, 5);
    var ma10 = calcMA(points, 10);
    var ma20 = calcMA(points, 20);
    var macdResult = calcMACD(points);

    chart.clear();
    chart.setOption({
      animation: false,
      legend: {
        data: ['K线', 'MA5', 'MA10', 'MA20', '成交量', 'DIF', 'DEA', 'MACD'],
        top: 0,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { left: 56, right: 24, top: 48, height: '45%' },
        { left: 56, right: 24, top: '58%', height: '14%' },
        { left: 56, right: 24, top: '78%', height: '14%' }
      ],
      xAxis: [
        {
          type: 'category', data: times, gridIndex: 0,
          boundaryGap: true, axisLine: { onZero: false },
          axisLabel: { show: false }
        },
        {
          type: 'category', data: times, gridIndex: 1,
          boundaryGap: true, axisLine: { onZero: false },
          axisLabel: { show: false }
        },
        {
          type: 'category', data: times, gridIndex: 2,
          boundaryGap: true, axisLine: { onZero: false }
        }
      ],
      yAxis: [
        { scale: true, gridIndex: 0, splitArea: { show: true } },
        {
          scale: true, gridIndex: 1, splitNumber: 2,
          axisLabel: { show: false }, axisLine: { show: false },
          axisTick: { show: false }, splitLine: { show: false }
        },
        {
          scale: true, gridIndex: 2, splitNumber: 2,
          axisLine: { show: true },
          axisTick: { show: false }, splitLine: { show: false }
        }
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1, 2], start: 60, end: 100 },
        { type: 'slider', xAxisIndex: [0, 1, 2], top: '95%', start: 60, end: 100 }
      ],
      series: [
        {
          name: 'K线', type: 'candlestick',
          xAxisIndex: 0, yAxisIndex: 0,
          data: candles,
          itemStyle: {
            color: UP, color0: DOWN,
            borderColor: UP, borderColor0: DOWN
          }
        },
        {
          name: 'MA5', type: 'line',
          xAxisIndex: 0, yAxisIndex: 0,
          data: ma5,
          smooth: false,
          symbol: 'none',
          lineStyle: { color: MA5_COLOR, width: 1 },
          connectNulls: false
        },
        {
          name: 'MA10', type: 'line',
          xAxisIndex: 0, yAxisIndex: 0,
          data: ma10,
          smooth: false,
          symbol: 'none',
          lineStyle: { color: MA10_COLOR, width: 1 },
          connectNulls: false
        },
        {
          name: 'MA20', type: 'line',
          xAxisIndex: 0, yAxisIndex: 0,
          data: ma20,
          smooth: false,
          symbol: 'none',
          lineStyle: { color: MA20_COLOR, width: 1 },
          connectNulls: false
        },
        {
          name: '成交量', type: 'bar',
          xAxisIndex: 1, yAxisIndex: 1,
          data: volumes
        },
        {
          name: 'DIF', type: 'line',
          xAxisIndex: 2, yAxisIndex: 2,
          data: macdResult.dif,
          smooth: false,
          symbol: 'none',
          lineStyle: { color: DIF_COLOR, width: 1 },
          connectNulls: false
        },
        {
          name: 'DEA', type: 'line',
          xAxisIndex: 2, yAxisIndex: 2,
          data: macdResult.dea,
          smooth: false,
          symbol: 'none',
          lineStyle: { color: DEA_COLOR, width: 1 },
          connectNulls: false
        },
        {
          name: 'MACD', type: 'bar',
          xAxisIndex: 2, yAxisIndex: 2,
          data: macdResult.macd
        }
      ]
    });
  }

  function load(period) {
    if (!CODE) {
      showMessage('暂无数据(可能数据源限流或本机代理拦截,A股本地联调常见)');
      return;
    }
    currentPeriod = period;
    showMessage('加载中…');
    var url = '/api/kline?market=' + encodeURIComponent(MARKET)
      + '&code=' + encodeURIComponent(CODE)
      + '&period=' + encodeURIComponent(period);
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (data) { render(data); })
      .catch(function () { render([]); });
  }

  // 周期按钮:点击切换 + 高亮当前档
  var buttons = document.querySelectorAll('.period-btn');
  for (var b = 0; b < buttons.length; b++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        for (var k = 0; k < buttons.length; k++) {
          buttons[k].classList.remove('active');
        }
        btn.classList.add('active');
        load(btn.getAttribute('data-period'));
      });
    })(buttons[b]);
  }

  load('1d'); // 默认日线
})();
