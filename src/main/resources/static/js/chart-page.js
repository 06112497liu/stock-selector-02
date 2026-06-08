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

    chart.clear();
    chart.setOption({
      animation: false,
      legend: {
        data: ['K线', 'MA5', 'MA10', 'MA20', '成交量'],
        top: 0,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { left: 56, right: 24, top: 48, height: '55%' },
        { left: 56, right: 24, top: '72%', height: '16%' }
      ],
      xAxis: [
        {
          type: 'category', data: times, gridIndex: 0,
          boundaryGap: true, axisLine: { onZero: false },
          axisLabel: { show: false }
        },
        {
          type: 'category', data: times, gridIndex: 1,
          boundaryGap: true, axisLine: { onZero: false }
        }
      ],
      yAxis: [
        { scale: true, gridIndex: 0, splitArea: { show: true } },
        {
          scale: true, gridIndex: 1, splitNumber: 2,
          axisLabel: { show: false }, axisLine: { show: false },
          axisTick: { show: false }, splitLine: { show: false }
        }
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], start: 60, end: 100 },
        { type: 'slider', xAxisIndex: [0, 1], top: '94%', start: 60, end: 100 }
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
